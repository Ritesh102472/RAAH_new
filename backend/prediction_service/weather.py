"""
Weather data fetching from OpenWeatherMap API
"""
import httpx
from typing import Dict, Any
from config import settings

OWM_URL = "https://api.openweathermap.org/data/2.5/weather"


async def get_weather(lat: float, lng: float) -> Dict[str, Any]:
    """
    Fetch current weather data for a location using OpenWeatherMap.
    """
    if not settings.OPENWEATHER_API_KEY:
        # Fallback to hardcoded defaults if no key is present
        return {"temperature_c": 25.0, "rainfall_mm": 0.0, "freeze_thaw": False}

    try:
        params = {
            "lat": lat,
            "lon": lng,
            "appid": settings.OPENWEATHER_API_KEY,
            "units": "metric"
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(OWM_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        temp = data.get("main", {}).get("temp", 25.0)
        # rainfall in last 1h or 3h
        rain_data = data.get("rain", {})
        rainfall = rain_data.get("1h", rain_data.get("3h", 0.0))
        
        # Simple freeze-thaw check based on current temp and standard variations
        # In a real scenario, we'd check floor/min/max from daily forecast
        freeze_thaw = temp < 2.0  # Simplification: if temp is near freezing

        return {
            "temperature_c": round(temp, 1),
            "rainfall_mm": round(rainfall, 2),
            "freeze_thaw": freeze_thaw,
            "humidity": data.get("main", {}).get("humidity", 50.0)
        }
    except Exception as e:
        print(f"[Weather] Failed to fetch for ({lat},{lng}) using OWM: {e}")
        return {"temperature_c": 25.0, "rainfall_mm": 0.0, "freeze_thaw": False}
