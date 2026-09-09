# seed.py — Load data/seed.json into the SQLite DB on startup (AGOS-010)
import json
import os
from sqlalchemy.orm import Session
from models import Street, Household, FloodEvent

_SEED_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "data", "seed.json"
)


def load_seed(db: Session) -> None:
    """Wipes existing data to ensure the new dataset is always perfectly in sync during MVP development."""
    if db.query(Street).count() > 0:
        print("[seed] Wiping old data to sync with new dataset...")
        db.query(FloodEvent).delete()
        db.query(Household).delete()
        db.query(Street).delete()
        db.commit()
    with open(_SEED_PATH, encoding="utf-8-sig") as f:
        data = json.load(f)

    # Streets
    for s in data["streets"]:
        db.add(Street(
            id=s["id"],
            name=s["name"],
            barangay=s["barangay"],
            camera_label=s["camera_label"],
            reference_object=s["reference_object"],
            status=s["status"],
            risk_score=s["risk_score"],
            water_level_estimate_cm=s.get("water_level_estimate_cm"),
            suggested_evacuation_route=s["suggested_evacuation_route"],
            last_updated=s["last_updated"],
        ))

    # Households
    for h in data["households"]:
        db.add(Household(
            id=h["id"],
            street_id=h["street_id"],
            address_label=h["address_label"],
            elevation_m=h["elevation_m"],
            ground_floor=h["ground_floor"],
            risk_score=h["risk_score"],
            risk_rank=h["risk_rank"],
            predicted_at_risk=h["predicted_at_risk"],
            affected_status=h["affected_status"],
            marked_at=h.get("marked_at"),
        ))

    # Flood events
    for e in data["flood_events"]:
        db.add(FloodEvent(
            id=e["id"],
            street_id=e["street_id"],
            rainfall_mm_hr=e["rainfall_mm_hr"],
            water_level_estimate_cm=e.get("water_level_estimate_cm"),
            fused_risk_score=e["fused_risk_score"],
            recorded_at=e["recorded_at"],
        ))

    db.commit()
    print(f"[seed] Loaded {len(data['streets'])} streets, {len(data['households'])} households, {len(data['flood_events'])} flood events.")
