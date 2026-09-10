# seed.py — Load data/seed.json into the SQLite DB on startup (AGOS-010)
import json
import os
from collections import defaultdict
from sqlalchemy.orm import Session
from models import Street, Household, FloodEvent
from illustrative_scoring import compute_street_risk, compute_household_risk

_SEED_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "data", "seed.json"
)

_AT_RISK_THRESHOLD = 50  # docs/data-model.md: "suggested: >= 50"


def load_seed(db: Session) -> None:
    """Wipes existing data to ensure the new dataset is always perfectly in sync during MVP development.

    seed.json stores only raw inputs (rainfall_mm_hr, elevation_m, ground_floor).
    risk_score/status/risk_rank/predicted_at_risk are derived here via
    illustrative_scoring.py so they can never drift out of sync with the
    documented formula (docs/data-model.md).
    """
    if db.query(Street).count() > 0:
        print("[seed] Wiping old data to sync with new dataset...")
        db.query(FloodEvent).delete()
        db.query(Household).delete()
        db.query(Street).delete()
        db.commit()
    with open(_SEED_PATH, encoding="utf-8-sig") as f:
        data = json.load(f)

    street_risk = {}  # street_id -> (status, risk_score)

    # Streets
    for s in data["streets"]:
        status, risk_score = compute_street_risk(s["rainfall_mm_hr"])
        street_risk[s["id"]] = (status, risk_score)
        db.add(Street(
            id=s["id"],
            name=s["name"],
            barangay=s["barangay"],
            camera_label=s["camera_label"],
            reference_object=s["reference_object"],
            video_filename=s.get("video_filename"),
            latitude=s["latitude"],
            longitude=s["longitude"],
            status=status,
            risk_score=round(risk_score, 2),
            water_level_estimate_cm=s.get("water_level_estimate_cm"),
            suggested_evacuation_route=s["suggested_evacuation_route"],
            last_updated=s["last_updated"],
        ))

    # Households — compute risk_score, then rank per street (1 = highest risk)
    households_by_street = defaultdict(list)
    for h in data["households"]:
        risk_score = compute_household_risk(h["elevation_m"], h["ground_floor"])
        households_by_street[h["street_id"]].append((h, risk_score))

    for street_id, rows in households_by_street.items():
        rows.sort(key=lambda row: row[1], reverse=True)
        for rank, (h, risk_score) in enumerate(rows, start=1):
            db.add(Household(
                id=h["id"],
                street_id=h["street_id"],
                address_label=h["address_label"],
                elevation_m=h["elevation_m"],
                ground_floor=h["ground_floor"],
                risk_score=round(risk_score, 2),
                risk_rank=rank,
                predicted_at_risk=risk_score >= _AT_RISK_THRESHOLD,
                affected_status="unmarked",
                evacuation_status="pending",
                damage_level=None,
                marked_at=None,
            ))

    # Flood events
    for e in data["flood_events"]:
        _, fused_risk_score = street_risk[e["street_id"]]
        db.add(FloodEvent(
            id=e["id"],
            street_id=e["street_id"],
            rainfall_mm_hr=e["rainfall_mm_hr"],
            water_level_estimate_cm=e.get("water_level_estimate_cm"),
            fused_risk_score=round(fused_risk_score, 2),
            recorded_at=e["recorded_at"],
        ))

    db.commit()
    print(f"[seed] Loaded {len(data['streets'])} streets, {len(data['households'])} households, {len(data['flood_events'])} flood events.")
