"""
EXIF GPS Extraction Utility
Extracts latitude/longitude from image EXIF metadata using Pillow and ExifRead.
"""
import io
from typing import Optional, Tuple
import exifread
from PIL import Image, ExifTags


def _convert_to_degrees(value) -> float:
    """Convert GPS coordinate from EXIF rational format to decimal degrees."""
    d = float(value.values[0].num) / float(value.values[0].den)
    m = float(value.values[1].num) / float(value.values[1].den)
    s = float(value.values[2].num) / float(value.values[2].den)
    return d + (m / 60.0) + (s / 3600.0)


def extract_gps_from_image(file_bytes: bytes) -> Optional[Tuple[float, float]]:
    """
    Extract (latitude, longitude) from image EXIF data.
    Returns None if no GPS data is found.
    """
    try:
        tags = exifread.process_file(io.BytesIO(file_bytes), stop_tag="GPS")

        lat_ref = tags.get("GPS GPSLatitudeRef")
        lat = tags.get("GPS GPSLatitude")
        lon_ref = tags.get("GPS GPSLongitudeRef")
        lon = tags.get("GPS GPSLongitude")

        if all([lat, lon, lat_ref, lon_ref]):
            latitude = _convert_to_degrees(lat)
            longitude = _convert_to_degrees(lon)
            if str(lat_ref) == "S":
                latitude = -latitude
            if str(lon_ref) == "W":
                longitude = -longitude
            return round(latitude, 6), round(longitude, 6)
    except Exception as e:
        print(f"[EXIF] Could not extract GPS: {e}")

    # Fallback: try PIL
    try:
        img = Image.open(io.BytesIO(file_bytes))
        exif_data = img._getexif()
        if exif_data:
            gps_info = {}
            for tag, value in exif_data.items():
                tag_name = ExifTags.TAGS.get(tag, tag)
                if tag_name == "GPSInfo":
                    for gps_tag, gps_value in value.items():
                        gps_tag_name = ExifTags.GPSTAGS.get(gps_tag, gps_tag)
                        gps_info[gps_tag_name] = gps_value
            if "GPSLatitude" in gps_info and "GPSLongitude" in gps_info:
                def to_deg(v): return v[0] + v[1] / 60.0 + v[2] / 3600.0
                lat = to_deg(gps_info["GPSLatitude"])
                lon = to_deg(gps_info["GPSLongitude"])
                if gps_info.get("GPSLatitudeRef") == "S": lat = -lat
                if gps_info.get("GPSLongitudeRef") == "W": lon = -lon
                return round(lat, 6), round(lon, 6)
    except Exception as e:
        print(f"[PIL EXIF] Failed: {e}")

    return None
