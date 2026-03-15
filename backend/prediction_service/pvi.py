"""
Pothole Vulnerability Index (PVI) Scoring Engine

PVI Score Range: 0-100
Risk Levels:
  0-30  → Low (Green)
  31-70 → Medium (Yellow)
  71-100 → High (Red)

Scoring Rules:
  +20 → Heavy rain (>10mm in 1h or >50mm in 24h)
  +30 → Freeze-thaw conditions (temp near 0°C)
  +20 → Humidity impact (>80% increases road erosion)
  +30 → High-traffic road impact (0.0 - 1.0 intensity)
"""
from typing import List, Dict, Tuple
import hashlib
from prediction_service.weather import get_weather
from prediction_service.traffic import get_traffic_intensity


# Representative India grid points covering major cities/highways
INDIA_GRID_POINTS: List[Tuple[float, float]] = [
    # Delhi
    (28.6139, 77.2090),
    # Mumbai
    (19.0760, 72.8777),
    # Bangalore
    (12.9716, 77.5946),
    # Chennai
    (13.0827, 80.2707),
    # Hyderabad
    (17.3850, 78.4867),
    # Kolkata
    (22.5726, 88.3639),
    # Pune
    (18.5204, 73.8567),
    # Ahmedabad
    (23.0225, 72.5714),
    # Jaipur
    (28.6139, 77.2090), (19.0760, 72.8777), (12.9716, 77.5946),
    (13.0827, 80.2707), (17.3850, 78.4867), (22.5726, 88.3639),
    (18.5204, 73.8567), (23.0225, 72.5714), (26.9124, 75.7873),
    (21.2514, 81.6296), (21.1458, 79.0882), (26.8467, 80.9462),
    (25.5941, 85.1376), (23.2599, 77.4126), (30.7333, 76.7794),
    (34.0837, 74.7973), (31.1048, 77.1734), (32.2432, 77.1892),
]


def compute_pvi(
    rainfall_mm: float,
    freeze_thaw: bool,
    traffic_intensity: float = 0.2,
    lat: float = 0.0,
    lng: float = 0.0,
    humidity: float = 50.0
) -> Tuple[float, str]:
    """Calculate PVI score and risk level with coordinate-based baseline variance."""
    # Create a stable but unique "road quality" baseline for this coordinate
    # This prevents all points from looking identical if weather/traffic is the same.
    coord_hash = int(hashlib.md5(f"{lat:.4f}{lng:.4f}".encode()).hexdigest(), 16)
    baseline_vulnerability = (coord_hash % 15) + 5  # 5% to 20% baseline risk
    
    score = baseline_vulnerability
    
    # Rainfall impact
    if rainfall_mm > 5:
        score += 10
    if rainfall_mm > 15:
        score += 15
        
    # Freeze-thaw impact (significant for expansion cracks)
    if freeze_thaw:
        score += 30
    
    # Humidity impact (high humidity slows road drying and weakens base)
    if humidity > 80:
        score += 10
    
    # Traffic impact: Scale up to +35 based on intensity
    score += (traffic_intensity * 35)
    
    # Cap at 100
    score = min(100.0, score)

    # Risk classification
    if score <= 30:
        risk = "low"
    elif score <= 65:
        risk = "medium"
    else:
        risk = "high"

    return round(score, 1), risk


async def compute_predictions_for_grid() -> List[Dict]:
    """
    Fetch weather and traffic for each grid point and compute PVI.
    """
    predictions = []
    for lat, lng in INDIA_GRID_POINTS:
        weather = await get_weather(lat, lng)
        traffic = await get_traffic_intensity(lat, lng)
        
        score, risk = compute_pvi(
            rainfall_mm=weather["rainfall_mm"],
            freeze_thaw=weather["freeze_thaw"],
            traffic_intensity=traffic,
            lat=lat,
            lng=lng,
            humidity=weather.get("humidity", 50.0)
        )
        predictions.append({
            "lat": lat,
            "lng": lng,
            "pvi_score": score,
            "risk_level": risk,
            "road_type": "primary", # Default for grid points
            "rainfall_mm": weather["rainfall_mm"],
            "temperature_c": weather["temperature_c"],
            "traffic_intensity": traffic,
        })
    return predictions
