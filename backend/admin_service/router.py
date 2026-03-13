"""
Admin Service Router — admin-only actions
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database.connection import get_db
from database.models import (
    User, Pothole, Complaint, AdminAction,
    UserRole, PotholeStatus, ComplaintStatus
)
from auth.dependencies import require_admin, require_superadmin
import datetime

router = APIRouter(prefix="/admin", tags=["admin"])


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
    superadmin: User = Depends(require_superadmin),
):
    """Only superadmin can change user roles."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, detail="User not found")
    try:
        user.role = UserRole(role)
    except ValueError:
        raise HTTPException(400, detail=f"Invalid role: {role}. Choose: citizen, admin, superadmin")
    db.commit()
    return {"id": user.id, "name": user.name, "role": user.role.value}


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
