import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from database.connection import SessionLocal
from database.models import Pothole
from map_service.router import pothole_to_geojson

db = SessionLocal()
potholes = db.query(Pothole).all()
print(f"Found {len(potholes)} potholes")
if potholes:
    p = potholes[0]
    print(f"severity type: {type(p.severity)}, value: {p.severity}")
    try:
        geo = pothole_to_geojson(p)
        print("Success:", geo)
    except Exception as e:
        print("Error in pothole_to_geojson:", e)
