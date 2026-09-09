# routers/households.py — Household endpoints (AGOS-012, 013, 014, 015)
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import Household, Street

router = APIRouter(tags=["households"])

VALID_STATUSES = {"confirmed_affected", "confirmed_dry"}


class AffectedStatusUpdate(BaseModel):
    affected_status: str


def _household_dict(h: Household) -> dict:
    return {
        "id": h.id,
        "street_id": h.street_id,
        "address_label": h.address_label,
        "elevation_m": h.elevation_m,
        "ground_floor": h.ground_floor,
        "risk_score": h.risk_score,
        "risk_rank": h.risk_rank,
        "predicted_at_risk": h.predicted_at_risk,
        "affected_status": h.affected_status,
        "marked_at": h.marked_at,
    }


# AGOS-012: GET /streets/{street_id}/households
@router.get(
    "/streets/{street_id}/households",
    summary="Ranked household risk list for a street",
)
def list_households(street_id: str, db: Session = Depends(get_db)):
    """
    Returns households for the given street sorted ascending by risk_rank (1 = highest priority).
    Ranking basis (elevation_m, ground_floor) is included in every record so the UI can
    display the human-readable rationale — not just a raw score.
    """
    s = db.query(Street).filter(Street.id == street_id).first()
    if not s:
        raise HTTPException(status_code=404, detail=f"Street '{street_id}' not found.")
    households = (
        db.query(Household)
        .filter(Household.street_id == street_id)
        .order_by(Household.risk_rank)
        .all()
    )
    return [_household_dict(h) for h in households]


# AGOS-013: PATCH /households/{household_id}
@router.patch(
    "/households/{household_id}",
    summary="Mark a household as flooded/affected or dry",
)
def mark_household(
    household_id: str,
    body: AffectedStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Accepts household ID + affected_status. Allowed values: confirmed_affected | confirmed_dry.
    Sets marked_at to the current UTC timestamp and persists the change.
    Returns the updated household record.
    """
    if body.affected_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid affected_status '{body.affected_status}'. Must be one of: {sorted(VALID_STATUSES)}.",
        )
    h = db.query(Household).filter(Household.id == household_id).first()
    if not h:
        raise HTTPException(status_code=404, detail=f"Household '{household_id}' not found.")

    h.affected_status = body.affected_status
    h.marked_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(h)
    return _household_dict(h)


# AGOS-014: GET /streets/{street_id}/recovery-record
@router.get(
    "/streets/{street_id}/recovery-record",
    summary="Post-flood recovery-priority record (closing the loop)",
)
def recovery_record(street_id: str, db: Session = Depends(get_db)):
    """
    Returns the same household list as /households, now annotated with affected_status.
    Sort order: households predicted_at_risk AND confirmed_affected first (these are
    CDRRMO's immediate relief priority), then the rest by risk_rank.
    This is the closing-the-loop transformation — same records, re-sorted post-event.
    """
    s = db.query(Street).filter(Street.id == street_id).first()
    if not s:
        raise HTTPException(status_code=404, detail=f"Street '{street_id}' not found.")

    households = (
        db.query(Household)
        .filter(Household.street_id == street_id)
        .all()
    )

    def sort_key(h: Household):
        # Priority 0 = predicted at-risk AND confirmed affected (relief-first)
        # Priority 1 = everything else, ordered by original risk_rank
        top = h.predicted_at_risk and h.affected_status == "confirmed_affected"
        return (0 if top else 1, h.risk_rank)

    households.sort(key=sort_key)

    return [
        {
            "id": h.id,
            "address_label": h.address_label,
            "elevation_m": h.elevation_m,
            "ground_floor": h.ground_floor,
            "risk_rank": h.risk_rank,
            "predicted_at_risk": h.predicted_at_risk,
            "affected_status": h.affected_status,
            "marked_at": h.marked_at,
        }
        for h in households
    ]


# AGOS-015: GET /streets/{street_id}/alert
@router.get(
    "/streets/{street_id}/alert",
    summary="Composed mock alert payload for DRRMO/resident",
)
def alert_payload(street_id: str, db: Session = Depends(get_db)):
    """
    Returns a mock alert shaped for a barangay DRRMO or resident:
    flagged street summary + ranked household list + suggested evacuation route.
    """
    s = db.query(Street).filter(Street.id == street_id).first()
    if not s:
        raise HTTPException(status_code=404, detail=f"Street '{street_id}' not found.")

    households = (
        db.query(Household)
        .filter(Household.street_id == street_id)
        .order_by(Household.risk_rank)
        .all()
    )

    return {
        "street": {
            "id": s.id,
            "name": s.name,
            "status": s.status,
            "risk_score": s.risk_score,
        },
        "household_list": [
            {"id": h.id, "address_label": h.address_label, "risk_rank": h.risk_rank, "predicted_at_risk": h.predicted_at_risk}
            for h in households
        ],
        "suggested_evacuation_route": s.suggested_evacuation_route,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
