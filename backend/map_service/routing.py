"""
Pothole-Aware Routing Service using OSRM API and Local Database Pothole Data.
"""
import httpx
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from database.models import Pothole
from math import radians, cos, sin, asin, sqrt

OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving"

def haversine(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points in km."""
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371 # Radius of earth in kilometers
    return c * r

async def get_route_risk(points: List[Tuple[float, float]], db: Session) -> Tuple[float, List[Dict]]:
    """
    Score a route based on proximity of its points to known potholes.
    Optimized with bounding box filtering.
    """
    if not points:
        return 0, []

    # Get bounding box for the route
    lats = [p[0] for p in points]
    lngs = [p[1] for p in points]
    min_lat, max_lat = min(lats) - 0.02, max(lats) + 0.02
    min_lng, max_lng = min(lngs) - 0.02, max(lngs) + 0.02

    # Filter potholes to bounding box for performance
    potholes = db.query(Pothole).filter(
        Pothole.status != "resolved",
        Pothole.lat >= min_lat, Pothole.lat <= max_lat,
        Pothole.lng >= min_lng, Pothole.lng <= max_lng
    ).all()
    
    total_score = 0
    severity_weights = {"high": 15, "medium": 6, "low": 2}
    detected_potholes_details = []
    processed_pothole_ids = set()
    
    # Track points in a grid for faster lookup if points > 500 (Optional optimization)
    # Increase detection radius for route scoring (250m to account for GPS variance)
    SEARCH_RADIUS_KM = 0.25
    
    for pothole in potholes:
        # Check every point for accuracy on highly granular routes
        for lat, lon in points:
            dist = haversine(lat, lon, pothole.lat, pothole.lng)
            if dist < SEARCH_RADIUS_KM:
                if pothole.id not in processed_pothole_ids:
                    severity = pothole.severity.value if hasattr(pothole.severity, 'value') else pothole.severity
                    weight = severity_weights.get(severity, 6)
                    total_score += weight
                    detected_potholes_details.append({
                        "id": pothole.id,
                        "lat": pothole.lat,
                        "lng": pothole.lng,
                        "severity": severity
                    })
                    processed_pothole_ids.add(pothole.id)
                break
        
    return total_score, detected_potholes_details

async def get_osrm_routes(start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> List[Dict]:
    """Fetch multiple alternative routes from OSRM."""
    url = f"{OSRM_BASE_URL}/{start_lng},{start_lat};{end_lng},{end_lat}"
    params = {
        "overview": "full",
        "geometries": "geojson",
        "alternatives": "true",
        "steps": "false"
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        
    return data.get("routes", [])

async def find_safest_route(start: Tuple[float, float], end: Tuple[float, float], db: Session) -> Dict:
    """Compare OSRM routes and pick the one with the lowest risk score."""
    start_lat, start_lng = start
    end_lat, end_lng = end
    
    routes = await get_osrm_routes(start_lat, start_lng, end_lat, end_lng)
    if not routes:
        return {"error": "No routes found"}
    
    scored_routes = []
    for route in routes:
        geometry = route.get("geometry", {}).get("coordinates", [])
        points = [(p[1], p[0]) for p in geometry]
        
        risk_score, details = await get_route_risk(points, db)
        scored_routes.append({
            "risk_score": risk_score,
            "distance_m": route.get("distance"),
            "duration_s": route.get("duration"),
            "geometry": route.get("geometry"),
            "hazards": details
        })
        
    # Sort by risk first, then distance
    scored_routes.sort(key=lambda x: (x["risk_score"], x["distance_m"]))
    
    return {
        "safest": scored_routes[0],
        "alternatives": scored_routes[1:] if len(scored_routes) > 1 else []
    }
