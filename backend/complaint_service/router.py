"""
Complaint Service Router
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database.connection import get_db
from database.models import (
    Complaint, Pothole, Severity, ComplaintStatus, PotholeStatus, AdminAction
)
from auth.dependencies import get_current_user, require_admin
from database.models import User
import datetime
import os

router = APIRouter(prefix="/complaints", tags=["complaints"])


def complaint_to_dict(c: Complaint) -> dict:
    p = c.pothole
    return {
        "id": c.id,
        "complaint_number": c.complaint_number,
        "pothole_id": c.pothole_id,
        "location": c.location_text,
        "road_name": c.road_name,
        "severity": c.severity.value if c.severity else "medium",
        "status": c.status.value if c.status else "filed",
        "agency": c.agency,
        "number_of_reports": c.number_of_reports,
        "maintenance_notes": c.maintenance_notes,
        "created_at": str(c.created_at)[:10] if c.created_at else "",
        "updated_at": str(c.updated_at)[:10] if c.updated_at else "",
        "lat": p.lat if p else None,
        "lng": p.lng if p else None,
        "image_url": f"/uploads/{os.path.basename(p.image_path)}" if p and p.image_path else None,
    }


@router.get("")
def list_complaints(
    status: Optional[str] = Query(None, description="detected, reported, under_repair, resolved, escalated"),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(Complaint).join(Pothole).order_by(desc(Complaint.created_at))
    if status:
        try:
            q = q.filter(Complaint.status == ComplaintStatus(status))
        except ValueError:
            raise HTTPException(400, detail=f"Invalid status: {status}")
    if severity:
        try:
            q = q.filter(Complaint.severity == Severity(severity))
        except ValueError:
            raise HTTPException(400, detail=f"Invalid severity: {severity}")

    total = q.count()
    items = q.offset(offset).limit(limit).all()
    return {
        "total": total,
        "items": [complaint_to_dict(c) for c in items],
    }


@router.get("/my")
def my_complaints(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get complaints for the current user's potholes."""
    potholes = db.query(Pothole).filter(Pothole.reporter_id == current_user.id).all()
    pothole_ids = [p.id for p in potholes]
    complaints = (
        db.query(Complaint)
        .filter(Complaint.pothole_id.in_(pothole_ids))
        .order_by(desc(Complaint.created_at))
        .all()
    )
    return {"items": [complaint_to_dict(c) for c in complaints]}


@router.get("/{complaint_id}")
def get_complaint(complaint_id: int, db: Session = Depends(get_db)):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(404, detail="Complaint not found")
    return complaint_to_dict(c)


@router.patch("/{complaint_id}/status")
def update_complaint_status(
    complaint_id: int,
    status: str,
    note: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(404, detail="Complaint not found")

    try:
        new_status = ComplaintStatus(status)
        c.status = new_status
        if new_status == ComplaintStatus.reported and not c.reported_at:
            c.reported_at = datetime.datetime.utcnow()
    except ValueError:
        raise HTTPException(400, detail=f"Invalid status: {status}")

    if note:
        c.maintenance_notes = note

    # Update pothole status accordingly
    pothole = c.pothole
    if status == "resolved" and pothole:
        pothole.status = PotholeStatus.resolved
    elif status == "reported" and pothole:
        pothole.status = PotholeStatus.complaint_filed
    elif (status == "under_repair" or status == "pending") and pothole:
        pothole.status = PotholeStatus.repair_in_progress

    # Log admin action
    action = AdminAction(
        admin_id=admin.id,
        pothole_id=c.pothole_id,
        action_type=f"status_change_{status}",
        note=note,
    )
    db.add(action)
    db.commit()
    return complaint_to_dict(c)


@router.post("/{complaint_id}/rescan")
async def trigger_rescan(
    complaint_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Force an immediate AI verification for a specific pothole record.
    Useful for demos and manual auditing.
    """
    from utils.tasks import check_pothole_resolution
    from database.models import Complaint
    
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(404, detail="Complaint not found")

    # For the immediate rescan, we can pass a specific complaint_id to the task logic
    # or just run a modified version of the check logic
    try:
        # We manually trigger the resolution check for just this one complaint
        # (This is a simplified version of the background task)
        import asyncio
        from map_service.mapillary import fetch_nearby_images, get_image_by_id
        from ai_service.model import run_detection
        from database.models import PotholeStatus, ComplaintStatus

        p = c.pothole
        if not p:
             raise HTTPException(400, detail="No pothole data associated with this complaint")

        # Use 50m radius for force rescan to ensure we catch nearby imagery
        fresh_images = await fetch_nearby_images(p.lat, p.lng, radius=50)
        if not fresh_images:
            return {
                "status": "inconclusive",
                "message": "No new imagery found for this location to verify repair."
            }

        img_id = fresh_images[0].get("id")
        img_bytes = await get_image_by_id(img_id)
        if not img_bytes:
             return {"status": "error", "message": "Failed to retrieve fresh imagery."}

        detection = await run_detection(img_bytes, f"force_verify_{p.id}.jpg")
        potholes_found = detection.get("potholes", [])

        prev_status = c.status
        if len(potholes_found) > 0:
            c.status = ComplaintStatus.escalated
            c.escalated_at = datetime.datetime.utcnow()
            p.status = PotholeStatus.escalated
            result_status = "persists"
        else:
            c.status = ComplaintStatus.resolved
            p.status = PotholeStatus.resolved
            result_status = "cleared"

        db.commit()
        return {
            "status": "success",
            "detection_result": result_status,
            "previous_status": prev_status,
            "new_status": c.status,
            "message": f"AI Verification Complete: Pothole {'still detected' if result_status == 'persists' else 'no longer detected'}."
        }

    except Exception as e:
        import traceback
        print(f"Force rescan failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(500, detail=str(e))
