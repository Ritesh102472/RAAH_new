"""
Geocoding using ArcGIS Geocoding API (bypass rate limits)
"""
import httpx
from typing import Optional, Dict


async def reverse_geocode(lat: float, lng: float) -> Dict[str, str]:
    """
    Convert lat/lng to road name, city, state using ArcGIS Geocoding.
    """
    default = {
        "road": "Unknown Road",
        "city": "Unknown City",
        "state": "Unknown State",
        "country": "India",
    }
    try:
        url = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode"
        params = {
            "f": "json",
            "location": f"{lng},{lat}",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                print(f"[Geocoding] ArcGIS Reverse Error {resp.status_code}: {resp.text}")
                return default
            data = resp.json()
        
        addr = data.get("address", {})
        # ArcGIS returns address parts in different fields
        road = (
            addr.get("Address") or 
            addr.get("Street") or 
            addr.get("PlaceName") or
            addr.get("District") or 
            addr.get("Neighborhood") or 
            addr.get("Branch") or
            addr.get("Subregion")
        )
        if not road or road == "Unknown Road":
            # Fallback to first part of Match_addr if exists
            match_addr = addr.get("Match_addr", "")
            if match_addr:
                road = match_addr.split(",")[0]
            else:
                road = "Unknown Road"

        city = addr.get("City") or addr.get("Subregion") or "Unknown City"
        state = addr.get("Region") or "Unknown State"
        country = addr.get("CountryCode") or "India"
        full_address = addr.get("Match_addr") or addr.get("LongLabel") or f"{road}, {city}, {state}, {country}"


        
        return {
            "road": road, 
            "city": city, 
            "state": state, 
            "country": country,
            "full_address": full_address
        }
    except Exception as e:
        print(f"[Geocoding] Failed for ({lat},{lng}): {e}")
        return default


async def forward_geocode(query: str, limit: int = 5):
    """
    Convert an address/place name to lat/lng results using ArcGIS.
    """
    try:
        url = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates"
        params = {
            "f": "json",
            "singleLine": query,
            "maxLocations": limit,
            "outFields": "Match_addr,Addr_type"
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                print(f"[Geocoding] ArcGIS Forward Error {resp.status_code}: {resp.text}")
                return []
            data = resp.json()
        
        return [
            {
                "display_name": item.get("address", ""),
                "lat": item.get("location", {}).get("y"),
                "lon": item.get("location", {}).get("x"),
            }
            for item in data.get("candidates", [])
        ]
    except Exception as e:
        print(f"[Geocoding] Forward geocode failed for '{query}': {e}")
        return []
