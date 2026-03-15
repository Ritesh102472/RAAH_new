"""
Admin Service Router — admin-only actions
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database.connection import get_db
from database.models import (
    User, Pothole, Complaint, AdminAction, Report, Prediction,
    UserRole, PotholeStatus, ComplaintStatus, Severity, ReportSource
)
from auth.dependencies import require_admin, require_superadmin
import datetime
from utils.file_storage import get_file_url

from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["admin"])


class ComplaintActionRequest(BaseModel):
    complaint_id: int


class RoleUpdate(BaseModel):
    role: str


def complaint_to_dict(c: Complaint, db: Session = None) -> dict:
    p = c.pothole
    image_url = None
    if p:
        img_path = p.annotated_image_path or p.image_path
        if img_path:
            image_url = get_file_url(img_path)
            
    citizen_name = "Unknown Citizen"
    if p and p.reporter:
        citizen_name = p.reporter.name or "Anonymous"

    unique_reporters_count = 1
    if db and p:
        from database.models import Report
        unique_reporters_count = db.query(Report.user_id).filter(Report.pothole_id == p.id).distinct().count() or 1

    return {
        "id": c.id,
        "complaint_number": c.complaint_number,
        "pothole_id": c.pothole_id,
        "location": c.location_text or (f"{p.lat}, {p.lng}" if p else "Unknown"),
        "road_name": c.road_name,
        "severity": c.severity.value if c.severity else "medium",
        "status": c.status.value if c.status else "reported",
        "agency": c.agency,
        "number_of_reports": c.number_of_reports,
        "unique_reporters_count": unique_reporters_count,
        "created_at": str(c.created_at)[:10] if c.created_at else "",
        "citizen_name": citizen_name,
        "image_url": image_url,
    }


@router.get("/complaints")
def list_admin_complaints(
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    q = db.query(Complaint).join(Pothole).order_by(desc(Complaint.created_at))
    if status:
        try:
            q = q.filter(Complaint.status == ComplaintStatus(status))
        except ValueError:
            raise HTTPException(400, detail=f"Invalid status: {status}")
    
    total = q.count()
    items = q.offset(offset).limit(limit).all()
    return {
        "total": total,
        "items": [complaint_to_dict(c, db=db) for c in items],
    }


@router.get("/citizens-reports")
def list_citizen_groupings(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Get all users who have filed reports, grouped.
    """
    # Fetch all citizens who have reported at least one pothole
    citizens = db.query(User).filter(User.role == UserRole.citizen).all()
    
    results = []
    for citizen in citizens:
        # Find all potholes reported by this citizen
        potholes = db.query(Pothole).filter(Pothole.reporter_id == citizen.id).all()
        if not potholes:
            continue
            
        # Get their complaints
        complaints_list = []
        for p in potholes:
            if p.complaint:
                complaints_list.append(complaint_to_dict(p.complaint, db=db))
        
        if complaints_list:
            results.append({
                "citizen_id": citizen.id,
                "name": citizen.name,
                "email": citizen.email,
                "complaints": complaints_list,
                "total_reports": len(complaints_list)
            })
            
    return results


@router.post("/mark-repaired")
def admin_mark_repaired(
    req: ComplaintActionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    complaint = db.query(Complaint).filter(Complaint.id == req.complaint_id).first()
    if not complaint:
        raise HTTPException(404, detail="Complaint not found")

    complaint.status = ComplaintStatus.resolved
    complaint.updated_at = datetime.datetime.utcnow()
    
    pothole = complaint.pothole
    if pothole:
        pothole.status = PotholeStatus.resolved

    action = AdminAction(
        admin_id=admin.id,
        pothole_id=complaint.pothole_id,
        action_type="mark_repaired",
        note="Marked as repaired via admin dashboard",
    )
    db.add(action)
    db.commit()
    return {"status": "success", "complaint_id": req.complaint_id}


@router.post("/rescan")
async def admin_rescan(
    req: ComplaintActionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Force an immediate AI verification for a specific complaint.
    """
    from database.models import Complaint, PotholeStatus, ComplaintStatus
    import asyncio
    import datetime
    from map_service.mapillary import fetch_nearby_images, get_image_by_id
    from ai_service.model import run_detection

    c = db.query(Complaint).filter(Complaint.id == req.complaint_id).first()
    if not c:
        raise HTTPException(404, detail="Complaint not found")

    try:
        p = c.pothole
        if not p:
             raise HTTPException(400, detail="No pothole data associated with this complaint")

        # Fetch fresh imagery — increase radius to 200m for better demo reliability
        fresh_images = await fetch_nearby_images(p.lat, p.lng, radius=200)
        
        target_img_id = None
        is_fallback = False
        
        img_id = fresh_images[0].get("id")
        img_thumb = fresh_images[0].get("thumb_256_url")
        img_captured = fresh_images[0].get("captured_at")
        
        img_bytes = await get_image_by_id(img_id)
        if not img_bytes:
             return {"status": "error", "message": "Failed to retrieve fresh imagery."}

        detection = await run_detection(img_bytes, f"admin_verify_{p.id}.jpg")
        potholes_found = detection.get("potholes", [])

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
        
        msg = f"AI Verification Complete: Pothole {'still detected' if result_status == 'persists' else 'no longer detected'}."
            
        return {
            "status": "success",
            "detection_result": result_status,
            "image_url": img_thumb,
            "captured_at": img_captured,
            "message": msg
        }
    except Exception as e:
        import traceback
        print(f"Admin rescan failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(500, detail=str(e))


@router.post("/escalate")
def admin_escalate(
    req: ComplaintActionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    complaint = db.query(Complaint).filter(Complaint.id == req.complaint_id).first()
    if not complaint:
        raise HTTPException(404, detail="Complaint not found")

    complaint.status = ComplaintStatus.escalated
    complaint.escalated_at = datetime.datetime.utcnow()
    complaint.updated_at = datetime.datetime.utcnow()
    
    pothole = complaint.pothole
    if pothole:
        pothole.status = PotholeStatus.escalated

    action = AdminAction(
        admin_id=admin.id,
        pothole_id=complaint.pothole_id,
        action_type="escalate",
        note="Escalated via admin dashboard",
    )
    db.add(action)
    db.commit()
    return {"status": "success", "complaint_id": req.complaint_id}


@router.get("/users")
def list_users(
    role: Optional[str] = Query(None),
    limit: int = Query(50, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = db.query(User).order_by(desc(User.created_at))
    if role:
        q = q.filter(User.role == UserRole(role))
    total = q.count()
    users = q.offset(offset).limit(limit).all()
    return {
        "total": total,
        "items": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "phone": u.phone,
                "role": u.role.value,
                "is_active": u.is_active,
                "created_at": str(u.created_at)[:10],
                "report_count": len(u.reports),
            }
            for u in users
        ],
    }


@router.patch("/users/{user_id}/role")
def change_user_role(
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Admin can change roles, but only superadmin can manage other superadmins."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, detail="User not found")
    
    # Security Checks
    if user.role == UserRole.superadmin and current_admin.role != UserRole.superadmin:
        raise HTTPException(403, detail="Only superadmins can manage other superadmins")
    
    if role == UserRole.superadmin and current_admin.role != UserRole.superadmin:
        raise HTTPException(403, detail="Only superadmins can promote users to superadmin")
    try:
        user.role = UserRole(role)
    except ValueError:
        raise HTTPException(400, detail=f"Invalid role: {role}. Choose: citizen, admin, superadmin")
    db.commit()
    return {"id": user.id, "name": user.name, "role": user.role.value}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Remove a user from the system."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": f"User {user.name} removed successfully"}


@router.get("/map-data")
def get_map_data(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Returns all potholes, citizen reports, and predictions for the admin map.
    Matches the unified format requested from the Pothole_Detection_AI repo.
    """
    # 1. Potholes (from AI or system)
    potholes = db.query(Pothole).all()
    pothole_list = []
    for p in potholes:
        pothole_list.append({
            "id": p.id,
            "lat": p.lat,
            "lng": p.lng,
            "severity": p.severity.value,
            "confidence": p.confidence,
            "road": p.road_name,
            "city": p.city,
            "status": p.status.value,
            "date": p.created_at.strftime("%Y-%m-%d %H:%M") if p.created_at else None,
        })

    # 2. Citizen Reports
    reports = db.query(Report).all()
    report_list = []
    for r in reports:
        report_list.append({
            "id": r.id,
            "lat": r.lat,
            "lng": r.lng,
            "source": r.source.value if r.source else "upload",
            "user_name": r.user.name if r.user else "Anonymous",
            "date": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else None,
        })

    # 3. Predictions
    predictions = db.query(Prediction).all()
    prediction_list = []
    for p in predictions:
        prediction_list.append({
            "id": p.id,
            "lat": p.lat,
            "lng": p.lng,
            "pvi_score": p.pvi_score,
            "risk_level": p.risk_level,
            "rainfall_mm": p.rainfall_mm,
            "temperature_c": p.temperature_c,
            "traffic_intensity": p.traffic_intensity,
            "road_type": p.road_type,
        })

    return {
        "potholes": pothole_list,
        "reports": report_list,
        "predictions": prediction_list,
    }


@router.patch("/potholes/{pothole_id}/repair")
def mark_repaired(
    pothole_id: int,
    note: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    pothole = db.query(Pothole).filter(Pothole.id == pothole_id).first()
    if not pothole:
        raise HTTPException(404, detail="Pothole not found")

    pothole.status = PotholeStatus.resolved
    if pothole.complaint:
        pothole.complaint.status = ComplaintStatus.resolved
        pothole.complaint.updated_at = datetime.datetime.utcnow()

    action = AdminAction(
        admin_id=admin.id,
        pothole_id=pothole_id,
        action_type="mark_repaired",
        note=note,
    )
    db.add(action)
    db.commit()
    return {"pothole_id": pothole_id, "status": "resolved", "note": note}


@router.patch("/potholes/{pothole_id}/escalate")
def escalate_pothole(
    pothole_id: int,
    note: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    pothole = db.query(Pothole).filter(Pothole.id == pothole_id).first()
    if not pothole:
        raise HTTPException(404, detail="Pothole not found")

    pothole.status = PotholeStatus.escalated
    if pothole.complaint:
        pothole.complaint.status = ComplaintStatus.escalated
        pothole.complaint.escalated_at = datetime.datetime.utcnow()
        pothole.complaint.updated_at = datetime.datetime.utcnow()

    action = AdminAction(
        admin_id=admin.id,
        pothole_id=pothole_id,
        action_type="escalate",
        note=note,
    )
    db.add(action)
    db.commit()
    return {"pothole_id": pothole_id, "status": "escalated", "note": note}


@router.get("/actions")
def get_admin_actions(
    limit: int = 50,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    actions = (
        db.query(AdminAction)
        .order_by(desc(AdminAction.created_at))
        .limit(limit)
        .all()
    )
    return {
        "items": [
            {
                "id": a.id,
                "admin_id": a.admin_id,
                "admin_name": a.admin.name if a.admin else "Unknown",
                "pothole_id": a.pothole_id,
                "action_type": a.action_type,
                "note": a.note,
                "created_at": str(a.created_at),
            }
            for a in actions
        ]
    }
