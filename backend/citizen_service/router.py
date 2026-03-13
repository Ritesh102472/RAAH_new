"""
Citizen Upload Router
Handles image/video upload → EXIF extraction → AI detection → complaint filing
"""
import re
import math
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import User, Pothole, Complaint, Report, Severity, PotholeStatus, ComplaintStatus, ReportSource
from auth.dependencies import get_current_user, get_optional_user
from utils.exif import extract_gps_from_image
from utils.file_storage import save_file, get_file_url
from ai_service.model import run_detection, classify_severity_from_detection
from map_service.geocoding import reverse_geocode
import asyncio

router = APIRouter(prefix="/citizen", tags=["citizen"])

MERGE_RADIUS_METERS = 15.0


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in meters between two GPS coordinates."""
    R = 6371000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def assign_agency(state: str, road_name: str) -> str:
    """Assign maintenance agency based on road type."""
    road_upper = road_name.upper()
    if any(tag in road_upper for tag in ["NH-", "NATIONAL HIGHWAY"]):
        return "NHAI"
    elif any(tag in road_upper for tag in ["SH-", "STATE HIGHWAY"]):
        return f"PWD {state}"
    return "Municipal Corporation"


def generate_complaint_number(pothole_id: int) -> str:
    from datetime import date
    return f"CMP-{date.today().year}-{pothole_id:04d}"


async def find_nearby_pothole(db: Session, lat: float, lng: float) -> Optional[Pothole]:
    """Find an existing pothole within MERGE_RADIUS_METERS."""
    potholes = db.query(Pothole).filter(
        Pothole.status != PotholeStatus.resolved
    ).all()
    for p in potholes:
        dist = haversine_distance(lat, lng, p.lat, p.lng)
        if dist <= MERGE_RADIUS_METERS:
            return p
    return None


@router.post("/upload")
async def upload_pothole(
    file: UploadFile = File(...),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Main upload endpoint:
    1. Save file
    2. Extract GPS from EXIF (or use provided lat/lng)
    3. Run AI detection
    4. Reverse geocode
    5. Create/merge pothole record
    6. Auto-generate complaint
    """
    ALLOWED = {"image/jpeg", "image/png", "image/webp", "image/jpg", "video/mp4", "video/quicktime"}
    if file.content_type not in ALLOWED:
        raise HTTPException(400, detail=f"Unsupported file type: {file.content_type}")

    file_bytes = await file.read()
    if len(file_bytes) > 50 * 1024 * 1024:
        raise HTTPException(400, detail="File too large (max 50MB)")

    # 1. Save file
    file_path = await save_file(file_bytes, file.filename)
    file_url = get_file_url(file_path)

    # 2. Extract GPS
    detected_coords = None
    if file.content_type.startswith("image/"):
        detected_coords = extract_gps_from_image(file_bytes)

    location_source = "provided"
    if detected_coords:
        lat, lng = detected_coords
        location_source = "exif"
    elif lat is None or lng is None:
        return {
            "status": "location_required",
            "message": "We couldn't detect the location automatically. Please drop a pin on the map.",
            "file_path": file_url,
            "potholes": [],
        }

    # 3. Run AI detection
    detection_result = await run_detection(file_bytes, file.filename)
    potholes_detected = detection_result.get("potholes", [])

    if not potholes_detected:
        return {
            "status": "no_pothole_detected",
            "message": "No potholes detected in this image.",
            "location": {"lat": lat, "lng": lng, "source": location_source},
            "potholes": [],
        }

    # 4. Reverse geocode
    geo = await reverse_geocode(lat, lng)

    # 5. Create/merge potholes
    created_potholes = []
    for det in potholes_detected:
        bbox = det.get("bbox", [0, 0, 0, 0])
        confidence = det.get("confidence", 0.0)
        sev_str = classify_severity_from_detection(bbox, confidence)
        severity = Severity(sev_str)

        # Try to merge with nearby existing pothole
        nearby = await find_nearby_pothole(db, lat, lng)

        if nearby:
            # Merge — increment report count on complaint
            report = Report(
                pothole_id=nearby.id,
                user_id=current_user.id if current_user else None,
                source=ReportSource.citizen_upload,
                image_path=file_path,
                lat=lat, lng=lng,
            )
            db.add(report)
            if nearby.complaint:
                nearby.complaint.number_of_reports += 1
                nearby.complaint.updated_at = __import__("datetime").datetime.utcnow()
            db.commit()
            created_potholes.append({
                "pothole_id": nearby.id,
                "merged": True,
                "severity": sev_str,
                "confidence": confidence,
                "lat": lat, "lng": lng,
            })
        else:
            # New pothole
            pothole = Pothole(
                lat=lat, lng=lng,
                road_name=geo["road"],
                city=geo["city"],
                state=geo["state"],
                image_path=file_path,
                severity=severity,
                confidence=confidence,
                bbox_x=bbox[0] if len(bbox) > 0 else None,
                bbox_y=bbox[1] if len(bbox) > 1 else None,
                bbox_w=bbox[2] if len(bbox) > 2 else None,
                bbox_h=bbox[3] if len(bbox) > 3 else None,
                status=PotholeStatus.detected,
                source=ReportSource.citizen_upload,
                reporter_id=current_user.id if current_user else None,
            )
            db.add(pothole)
            db.flush()

            # 6. Auto-generate complaint
            agency = assign_agency(geo["state"], geo["road"])
            complaint = Complaint(
                complaint_number=generate_complaint_number(pothole.id),
                pothole_id=pothole.id,
                location_text=f"{geo['road']}, {geo['city']}, {geo['state']}",
                road_name=geo["road"],
                severity=severity,
                number_of_reports=1,
                status=ComplaintStatus.filed,
                agency=agency,
            )
            db.add(complaint)
            pothole.status = PotholeStatus.complaint_filed

            # Initial report
            report = Report(
                pothole_id=pothole.id,
                user_id=current_user.id if current_user else None,
                source=ReportSource.citizen_upload,
                image_path=file_path,
                lat=lat, lng=lng,
            )
            db.add(report)
            db.commit()
            db.refresh(pothole)

            created_potholes.append({
                "pothole_id": pothole.id,
                "merged": False,
                "severity": sev_str,
                "confidence": confidence,
                "lat": lat, "lng": lng,
                "complaint_number": complaint.complaint_number,
            })

    return {
        "status": "success",
        "location": {"lat": lat, "lng": lng, "source": location_source},
        "road": geo["road"],
        "city": geo["city"],
        "potholes": created_potholes,
        "total_detected": len(potholes_detected),
        "file_url": file_url,
    }
