"""
Weather data fetching from Open-Meteo API (free, no API key required)
"""
import httpx
from typing import Dict, Any

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


async def get_weather(lat: float, lng: float) -> Dict[str, Any]:
    """
    Fetch current weather data for a location.
    Returns: temperature_c, rainfall_mm, freeze_thaw (bool)
    """
    try:
        params = {
            "latitude": lat,
            "longitude": lng,
            "hourly": "temperature_2m,precipitation",
            "forecast_days": 1,
            "timezone": "Asia/Kolkata",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(OPEN_METEO_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        hourly = data.get("hourly", {})
        temps = hourly.get("temperature_2m", [20.0])
        precip = hourly.get("precipitation", [0.0])

        # Use last 24h averages
        avg_temp = sum(temps[-24:]) / len(temps[-24:]) if temps else 20.0
        total_rain = sum(precip[-24:]) if precip else 0.0
        min_temp = min(temps[-24:]) if temps else 20.0
        max_temp = max(temps[-24:]) if temps else 20.0
        freeze_thaw = min_temp < 0 < max_temp

        return {
            "temperature_c": round(avg_temp, 1),
            "rainfall_mm": round(total_rain, 2),
            "freeze_thaw": freeze_thaw,
        }
    except Exception as e:
        print(f"[Weather] Failed to fetch for ({lat},{lng}): {e}")
        return {"temperature_c": 25.0, "rainfall_mm": 0.0, "freeze_thaw": False}
