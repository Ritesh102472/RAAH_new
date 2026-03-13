"""
Celery Background Tasks
"""
import datetime
from celery_app import celery_app


@celery_app.task(name="utils.tasks.auto_escalate_complaints")
def auto_escalate_complaints():
    """
    Auto-escalate complaints that have been pending for more than 7 days.
    Runs daily via Celery Beat.
    """
    from database.connection import SessionLocal
    from database.models import Complaint, Pothole, ComplaintStatus, PotholeStatus
    db = SessionLocal()
    try:
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=7)
        pending = db.query(Complaint).filter(
            Complaint.status.in_([ComplaintStatus.filed, ComplaintStatus.pending]),
            Complaint.created_at < cutoff,
        ).all()

        count = 0
        for c in pending:
            c.status = ComplaintStatus.escalated
            c.escalated_at = datetime.datetime.utcnow()
            c.updated_at = datetime.datetime.utcnow()
            if c.pothole:
                c.pothole.status = PotholeStatus.escalated
            count += 1
        db.commit()
        print(f"[Celery] Auto-escalated {count} complaints")
        return {"escalated": count}
    except Exception as e:
        db.rollback()
        print(f"[Celery] Escalation failed: {e}")
        return {"error": str(e)}
    finally:
        db.close()


@celery_app.task(name="utils.tasks.refresh_predictions")
def refresh_predictions():
    """Refresh PVI predictions every 6 hours."""
    import asyncio
    from database.connection import SessionLocal
    from database.models import Prediction
    from prediction_service.pvi import compute_predictions_for_grid

    db = SessionLocal()
    try:
        predictions = asyncio.run(compute_predictions_for_grid())
        db.query(Prediction).delete()
        for pred in predictions:
            p = Prediction(
                lat=pred["lat"],
                lng=pred["lng"],
                pvi_score=pred["pvi_score"],
                risk_level=pred["risk_level"],
                road_type=pred["road_type"],
                rainfall_mm=pred["rainfall_mm"],
                temperature_c=pred["temperature_c"],
                computed_at=datetime.datetime.utcnow(),
            )
            db.add(p)
        db.commit()
        print(f"[Celery] Refreshed {len(predictions)} predictions")
        return {"count": len(predictions)}
    except Exception as e:
        db.rollback()
        print(f"[Celery] Prediction refresh failed: {e}")
        return {"error": str(e)}
    finally:
        db.close()
