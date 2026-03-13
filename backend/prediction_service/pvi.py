"""
Pothole Vulnerability Index (PVI) Scoring Engine

PVI Score Range: 0-100
Risk Levels:
  0-30  → Low (Green)
  31-70 → Medium (Yellow)
  71-100 → High (Red)

Scoring Rules:
  +20 → Heavy rain (>10mm in 24h)
  +50 → Freeze-thaw conditions (temp crossing 0°C)
  +30 → High-traffic road (primary or trunk from OSM)
"""
from typing import List, Dict, Tuple
from prediction_service.weather import get_weather


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
    (26.9124, 75.7873),
    # Raipur
    (21.2514, 81.6296),
    # Nagpur
    (21.1458, 79.0882),
    # Lucknow
    (26.8467, 80.9462),
    # Patna
    (25.5941, 85.1376),
    # Bhopal
    (23.2599, 77.4126),
    # Chandigarh
    (30.7333, 76.7794),
    # Srinagar (freeze-thaw common)
    (34.0837, 74.7973),
    # Shimla (hilly, freeze-thaw)
    (31.1048, 77.1734),
    # Manali (extreme freeze-thaw)
    (32.2432, 77.1892),
]

HIGH_TRAFFIC_ROAD_TYPES = {"primary", "trunk", "motorway"}


def compute_pvi(
    rainfall_mm: float,
    freeze_thaw: bool,
    road_type: str = "secondary",
) -> Tuple[float, str]:
    """Calculate PVI score and risk level."""
    score = 0.0
    if rainfall_mm > 10:
        score += 20
    if freeze_thaw:
        score += 50
    if road_type in HIGH_TRAFFIC_ROAD_TYPES:
        score += 30
    score = min(100.0, score)

    if score <= 30:
        risk = "low"
    elif score <= 70:
        risk = "medium"
    else:
        risk = "high"

    return round(score, 1), risk


async def compute_predictions_for_grid() -> List[Dict]:
    """
    Fetch weather for each grid point and compute PVI.
    Returns list of prediction records ready for DB insertion.
    """
    predictions = []
    for lat, lng in INDIA_GRID_POINTS:
        weather = await get_weather(lat, lng)
        # Assume primary road for major city grid points
        road_type = "primary"
        score, risk = compute_pvi(
            rainfall_mm=weather["rainfall_mm"],
            freeze_thaw=weather["freeze_thaw"],
            road_type=road_type,
        )
        predictions.append({
            "lat": lat,
            "lng": lng,
            "pvi_score": score,
            "risk_level": risk,
            "road_type": road_type,
            "rainfall_mm": weather["rainfall_mm"],
            "temperature_c": weather["temperature_c"],
        })
    return predictions
