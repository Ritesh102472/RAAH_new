"""
Analytics Service Router
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from database.connection import get_db
from database.models import Pothole, Complaint, User, Report, PotholeStatus, Severity, ComplaintStatus
import datetime

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """
    Returns dashboard headline statistics:
    - total_scans, active_potholes, repairs_pending
    - road_health_index, total_detections, repair_rate, avg_resolution_days
    """
    total_scans = db.query(Report).count()
    active_potholes = db.query(Pothole).filter(
        Pothole.status.in_([PotholeStatus.detected, PotholeStatus.complaint_filed, PotholeStatus.escalated])
    ).count()
    repair_in_progress = db.query(Pothole).filter(
        Pothole.status == PotholeStatus.repair_in_progress
    ).count()
    resolved = db.query(Pothole).filter(Pothole.status == PotholeStatus.resolved).count()
    total_potholes = db.query(Pothole).count()
    total_users = db.query(User).count()
    total_complaints = db.query(Complaint).count()

    # Repair rate
    repair_rate = round((resolved / total_potholes * 100) if total_potholes > 0 else 0, 1)

    # Road Health Index: inverse of severity-weighted active pothole proportion
    high_count = db.query(Pothole).filter(Pothole.severity == Severity.high).count()
    med_count = db.query(Pothole).filter(Pothole.severity == Severity.medium).count()
    if total_potholes > 0:
        weighted = (high_count * 3 + med_count * 2) / (total_potholes * 3)
        road_health = max(0, round(100 - weighted * 100))
    else:
        road_health = 100

    # Average resolution time (days) for resolved complaints
    resolved_complaints = db.query(Complaint).filter(
        Complaint.status == ComplaintStatus.resolved
    ).all()
    if resolved_complaints:
        avg_days = sum(
            (c.updated_at - c.created_at).days
            for c in resolved_complaints
            if c.updated_at and c.created_at
        ) / len(resolved_complaints)
    else:
        avg_days = 0.0

    return {
        "total_scans": total_scans,
        "active_potholes": active_potholes,
        "repairs_pending": repair_in_progress,
        "total_detections": total_scans,
        "road_health_index": road_health,
        "repair_rate": repair_rate,
        "avg_resolution_days": round(avg_days, 1),
        "total_users": total_users,
        "total_complaints": total_complaints,
        "resolved": resolved,
    }


@router.get("/highways")
def get_highway_breakdown(db: Session = Depends(get_db)):
    """Returns per-road pothole counts for the analytics bar chart."""
    rows = (
        db.query(Pothole.road_name, func.count(Pothole.id).label("count"))
        .group_by(Pothole.road_name)
        .order_by(desc("count"))
        .limit(8)
        .all()
    )
    if not rows:
        return {"items": []}

    max_count = rows[0].count if rows else 1
    items = [
        {
            "name": row.road_name or "Unknown",
            "count": row.count,
            "percentage": f"{round(row.count / max_count * 100)}%",
        }
        for row in rows
    ]
    return {"items": items}


@router.get("/weekly")
def get_weekly_trend(db: Session = Depends(get_db)):
    """Returns report counts for the last 7 days (including merges)."""
    today = datetime.datetime.utcnow().date()
    result = []
    for i in range(6, -1, -1):
        day = today - datetime.timedelta(days=i)
        start = datetime.datetime.combine(day, datetime.time.min)
        end = datetime.datetime.combine(day, datetime.time.max)
        count = db.query(Report).filter(
            Report.created_at >= start,
            Report.created_at <= end,
        ).count()
        result.append({"date": str(day), "count": count})
    return {"days": result}
