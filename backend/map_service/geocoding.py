"""
Reverse Geocoding using OpenStreetMap Nominatim API (free, no key required)
"""
import httpx
from typing import Optional, Dict


async def reverse_geocode(lat: float, lng: float) -> Dict[str, str]:
    """
    Convert lat/lng to road name, city, state using Nominatim.
    Returns dict with: road, city, state, country
    """
    default = {
        "road": "Unknown Road",
        "city": "Unknown City",
        "state": "Unknown State",
        "country": "India",
    }
    try:
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            "lat": lat,
            "lon": lng,
            "format": "json",
            "addressdetails": 1,
        }
        headers = {"User-Agent": "RAAH-Pothole-System/1.0"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
        addr = data.get("address", {})
        road = (
            addr.get("road") or
            addr.get("highway") or
            addr.get("footway") or
            addr.get("street") or
            "Unknown Road"
        )
        city = (
            addr.get("city") or
            addr.get("town") or
            addr.get("village") or
            addr.get("county") or
            "Unknown City"
        )
        state = addr.get("state", "Unknown State")
        country = addr.get("country", "India")
        return {"road": road, "city": city, "state": state, "country": country}
    except Exception as e:
        print(f"[Geocoding] Failed for ({lat},{lng}): {e}")
        return default
