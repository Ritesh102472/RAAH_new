"""
Map Service Router — potholes, predictions, mapillary integration
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database.connection import get_db
from database.models import Pothole, Prediction, Severity, PotholeStatus

router = APIRouter(prefix="/map", tags=["map"])


def pothole_to_geojson(p: Pothole) -> dict:
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [p.lng, p.lat]},
        "properties": {
            "id": p.id,
            "pothole_id": f"PTH-{p.id:04d}",
            "road_name": p.road_name,
            "city": p.city,
            "state": p.state,
            "severity": p.severity.value if hasattr(p.severity, 'value') else (p.severity or "medium"),
            "status": p.status.value if hasattr(p.status, 'value') else (p.status or "detected"),
            "confidence": p.confidence,
            "image_url": f"/uploads/{p.image_path.split('/')[-1]}" if p.image_path else None,
            "created_at": str(p.created_at)[:10] if p.created_at else "",
        },
    }


def prediction_to_geojson(pred: Prediction) -> dict:
    color_map = {"low": "#22c55e", "medium": "#eab308", "high": "#ef4444"}
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [pred.lng, pred.lat]},
        "properties": {
            "id": pred.id,
            "pvi_score": pred.pvi_score,
            "risk_level": pred.risk_level,
            "road_type": pred.road_type,
            "color": color_map.get(pred.risk_level, "#22c55e"),
            "computed_at": str(pred.computed_at)[:10] if pred.computed_at else "",
        },
    }


@router.get("/potholes")
def get_potholes_geojson(
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(500, le=2000),
    db: Session = Depends(get_db),
):
    """Returns GeoJSON FeatureCollection of all potholes for map rendering."""
    q = db.query(Pothole).order_by(desc(Pothole.created_at))
    if severity:
        q = q.filter(Pothole.severity == Severity(severity))
    if status:
        q = q.filter(Pothole.status == PotholeStatus(status))
    potholes = q.limit(limit).all()

    return {
        "type": "FeatureCollection",
        "features": [pothole_to_geojson(p) for p in potholes],
        "total": len(potholes),
    }


@router.get("/predictions")
def get_predictions_geojson(
    risk_level: Optional[str] = Query(None),
    limit: int = Query(500, le=2000),
    db: Session = Depends(get_db),
):
    """Returns GeoJSON FeatureCollection of PVI predictions."""
    q = db.query(Prediction).order_by(desc(Prediction.computed_at))
    if risk_level:
        q = q.filter(Prediction.risk_level == risk_level)
    predictions = q.limit(limit).all()

    return {
        "type": "FeatureCollection",
        "features": [prediction_to_geojson(p) for p in predictions],
        "total": len(predictions),
    }


@router.get("/stats")
def get_map_stats(db: Session = Depends(get_db)):
    """Quick stats for map overlay."""
    total = db.query(Pothole).count()
    high = db.query(Pothole).filter(Pothole.severity == Severity.high).count()
    medium = db.query(Pothole).filter(Pothole.severity == Severity.medium).count()
    low = db.query(Pothole).filter(Pothole.severity == Severity.low).count()
    resolved = db.query(Pothole).filter(Pothole.status == PotholeStatus.resolved).count()
    return {
        "total": total,
        "high": high,
        "medium": medium,
        "low": low,
        "resolved": resolved,
    }

@router.get("/list")
def get_potholes_list(db: Session = Depends(get_db)):
    """Simple list of potholes in user-requested format."""
    potholes = db.query(Pothole).order_by(desc(Pothole.created_at)).all()
    return {
        "potholes": [
            {
                "id": f"PTH-{p.id:04d}",
                "latitude": p.lat,
                "longitude": p.lng,
                "severity": p.severity.value if hasattr(p.severity, 'value') else (p.severity or "medium"),
                "confidence": p.confidence,
                "status": p.status.value if hasattr(p.status, 'value') else (p.status or "detected"),
                "timestamp": p.created_at.isoformat() if p.created_at else ""
            }
            for p in potholes
        ]
    }
