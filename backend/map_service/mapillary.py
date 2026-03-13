"""
Mapillary API Client
Fetches street-level imagery near a GPS coordinate.
"""
import httpx
from typing import List, Dict, Any, Optional
from config import settings


MAPILLARY_BASE = "https://graph.mapillary.com"


async def fetch_nearby_images(lat: float, lng: float, radius: int = 50) -> List[Dict[str, Any]]:
    """
    Fetch Mapillary images near a given coordinate (within radius meters).
    Returns list of image objects with id, thumb_url, captured_at.
    """
    if not settings.MAPILLARY_ACCESS_TOKEN or settings.MAPILLARY_ACCESS_TOKEN == "your-mapillary-token-here":
        return []

    try:
        bbox = f"{lng - 0.001},{lat - 0.001},{lng + 0.001},{lat + 0.001}"
        url = f"{MAPILLARY_BASE}/images"
        params = {
            "access_token": settings.MAPILLARY_ACCESS_TOKEN,
            "fields": "id,thumb_256_url,captured_at,geometry,sequence",
            "bbox": bbox,
            "limit": 5,
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        return data.get("data", [])
    except Exception as e:
        print(f"[Mapillary] Failed to fetch images: {e}")
        return []


async def get_image_by_id(image_id: str) -> Optional[bytes]:
    """Fetch raw image bytes from Mapillary for detection."""
    if not settings.MAPILLARY_ACCESS_TOKEN:
        return None
    try:
        url = f"{MAPILLARY_BASE}/{image_id}"
        params = {
            "access_token": settings.MAPILLARY_ACCESS_TOKEN,
            "fields": "thumb_1024_url",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            image_url = resp.json().get("thumb_1024_url")
            if not image_url:
                return None
            img_resp = await client.get(image_url)
            img_resp.raise_for_status()
            return img_resp.content
    except Exception as e:
        print(f"[Mapillary] Failed to fetch image {image_id}: {e}")
        return None
