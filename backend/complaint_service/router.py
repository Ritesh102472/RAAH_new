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
        c.status = ComplaintStatus(status)
    except ValueError:
        raise HTTPException(400, detail=f"Invalid status: {status}")

    if note:
        c.maintenance_notes = note

    # Update pothole status accordingly
    pothole = c.pothole
    if status == "resolved" and pothole:
        pothole.status = PotholeStatus.resolved
    elif status == "pending" and pothole:
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
    current_user: User = Depends(get_current_user),
):
    c = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(404, detail="Complaint not found")
    # In production this would queue a Celery task to fetch Mapillary
    # images and re-run detection. For now returns a queued response.
    return {
        "status": "queued",
        "message": "Re-scan queued. Results will appear in the complaint within minutes.",
        "complaint_id": complaint_id,
    }
