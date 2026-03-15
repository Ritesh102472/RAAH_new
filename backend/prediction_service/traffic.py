"""
Traffic Intelligence Service — Fetches real-time congestion data using TomTom API.
"""
import httpx
from typing import Dict, Any
from config import settings

TOMTOM_FLOW_URL = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"

async def get_traffic_intensity(lat: float, lng: float) -> float:
    """
    Fetch real-time traffic intensity for a coordinate.
    If no API key, simulates based on local time and coordinate hashing.
    """
    if not settings.TOMTOM_API_KEY:
        # SIMULATION LOGIC: Use time of day + lat/lng hash to create "real-feeling" variance
        import datetime, hashlib
        now = datetime.datetime.now()
        hour = now.hour
        
        # Base intensity follows a typical commuter curve (peaks at 9am and 6pm)
        if 8 <= hour <= 10 or 17 <= hour <= 19:
            base = 0.6  # Rush hour
        elif 23 <= hour or hour <= 5:
            base = 0.05 # Night
        else:
            base = 0.25 # Normal day
            
        # Add "Road Specific" variance based on coordinate hash
        coord_seed = int(hashlib.md5(f"{lat:.3f}{lng:.3f}".encode()).hexdigest(), 16)
        variance = (coord_seed % 30) / 100.0 - 0.15 # -0.15 to +0.15
        
        simulated = max(0.05, min(0.95, base + variance))
        return round(simulated, 2)

    try:
        params = {
            "key": settings.TOMTOM_API_KEY,
            "point": f"{lat},{lng}",
            "unit": "KMPH",
            "thickness": 1
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(TOMTOM_FLOW_URL, params=params)
            if resp.status_code == 403:
                print(f"[Traffic] API Key invalid or quota reached. Falling back to simulation.")
                settings.TOMTOM_API_KEY = "" # Fallback to simulation for this run
                return await get_traffic_intensity(lat, lng)
                
            resp.raise_for_status()
            data = resp.json()

        flow = data.get("flowSegmentData", {})
        current_speed = flow.get("currentSpeed", 40)
        free_flow_speed = flow.get("freeFlowSpeed", 40)

        if free_flow_speed <= 0:
            return 0.2

        intensity = 1.0 - (current_speed / free_flow_speed)
        return max(0.0, min(1.0, intensity))

    except Exception as e:
        print(f"[Traffic] Failed to fetch for ({lat},{lng}): {e}")
        return 0.2
