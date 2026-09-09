# routers/streets.py — GET /streets and GET /streets/{street_id} (AGOS-011)
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Street, FloodEvent

router = APIRouter(prefix="/streets", tags=["streets"])


def _street_summary(s: Street) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "barangay": s.barangay,
        "camera_label": s.camera_label,
        "reference_object": s.reference_object,
        "video_filename": s.video_filename,
        "latitude": s.latitude,
        "longitude": s.longitude,
        "status": s.status,
        "risk_score": s.risk_score,
        "water_level_estimate_cm": s.water_level_estimate_cm,
        "last_updated": s.last_updated,
    }


def _street_detail(s: Street) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "barangay": s.barangay,
        "latitude": s.latitude,
        "longitude": s.longitude,
        "camera_label": s.camera_label,
        "reference_object": s.reference_object,
        "video_filename": s.video_filename,
        "status": s.status,
        "risk_score": s.risk_score,
        "water_level_estimate_cm": s.water_level_estimate_cm,
        "suggested_evacuation_route": s.suggested_evacuation_route,
        "last_updated": s.last_updated,
    }


@router.get("", summary="List all streets with summary risk data")
def list_streets(db: Session = Depends(get_db)):
    """Returns all streets. Flagged streets appear first, then watch, then normal."""
    STATUS_ORDER = {"flagged": 0, "watch": 1, "normal": 2}
    streets = db.query(Street).all()
    streets.sort(key=lambda s: STATUS_ORDER.get(s.status, 9))
    return [_street_summary(s) for s in streets]


@router.get("/{street_id}", summary="Full street detail including evacuation route")
def get_street(street_id: str, db: Session = Depends(get_db)):
    s = db.query(Street).filter(Street.id == street_id).first()
    if not s:
        raise HTTPException(status_code=404, detail=f"Street '{street_id}' not found.")
    return _street_detail(s)


@router.get("/{street_id}/flood-events", summary="Rainfall/risk-fusion sample history (optional stretch)")
def get_flood_events(street_id: str, db: Session = Depends(get_db)):
    s = db.query(Street).filter(Street.id == street_id).first()
    if not s:
        raise HTTPException(status_code=404, detail=f"Street '{street_id}' not found.")
    events = db.query(FloodEvent).filter(FloodEvent.street_id == street_id).all()
    return [
        {
            "id": e.id,
            "street_id": e.street_id,
            "rainfall_mm_hr": e.rainfall_mm_hr,
            "water_level_estimate_cm": e.water_level_estimate_cm,
            "fused_risk_score": e.fused_risk_score,
            "recorded_at": e.recorded_at,
        }
        for e in events
    ]
