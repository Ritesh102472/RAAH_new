"""
Prediction Service Router
"""
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import Prediction
from prediction_service.pvi import compute_predictions_for_grid
import datetime

router = APIRouter(prefix="/predictions", tags=["predictions"])


async def _refresh_predictions(db: Session):
    """Delete old predictions and insert fresh ones from PVI engine."""
    try:
        predictions = await compute_predictions_for_grid()
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
        print(f"[PVI] Refreshed {len(predictions)} predictions")
    except Exception as e:
        print(f"[PVI] Refresh failed: {e}")
        db.rollback()


@router.get("")
def get_predictions(db: Session = Depends(get_db)):
    """Returns current PVI predictions. Note: does NOT create complaints."""
    preds = db.query(Prediction).all()
    color_map = {"low": "#22c55e", "medium": "#eab308", "high": "#ef4444"}
    features = [
        {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [p.lng, p.lat]},
            "properties": {
                "id": p.id,
                "pvi_score": p.pvi_score,
                "risk_level": p.risk_level,
                "road_type": p.road_type,
                "rainfall_mm": p.rainfall_mm,
                "temperature_c": p.temperature_c,
                "color": color_map.get(p.risk_level, "#22c55e"),
                "computed_at": str(p.computed_at)[:10] if p.computed_at else "",
            },
        }
        for p in preds
    ]
    return {"type": "FeatureCollection", "features": features, "total": len(features)}


@router.post("/refresh")
async def refresh_predictions(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Trigger a fresh PVI computation in the background."""
    background_tasks.add_task(_refresh_predictions, db)
    return {"status": "queued", "message": "PVI refresh started in background"}
