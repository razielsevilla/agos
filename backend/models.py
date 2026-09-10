# models.py — SQLAlchemy ORM models matching docs/data-model.md
from sqlalchemy import Boolean, Column, Float, Integer, String
from database import Base


class Street(Base):
    __tablename__ = "streets"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    barangay = Column(String, nullable=False)
    camera_label = Column(String, nullable=False)
    reference_object = Column(String, nullable=False)
    video_filename = Column(String, nullable=True)    # filename under data/videos/, served at /videos/<file> — null if no camera feed is configured for this street
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String, nullable=False)          # "normal" | "watch" | "flagged"
    risk_score = Column(Float, nullable=False)
    water_level_estimate_cm = Column(Float, nullable=True)
    suggested_evacuation_route = Column(String, nullable=False)
    last_updated = Column(String, nullable=False)    # ISO 8601 string


class Household(Base):
    __tablename__ = "households"

    id = Column(String, primary_key=True, index=True)
    street_id = Column(String, nullable=False, index=True)
    address_label = Column(String, nullable=False)
    elevation_m = Column(Float, nullable=False)
    ground_floor = Column(Boolean, nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_rank = Column(Integer, nullable=False)
    predicted_at_risk = Column(Boolean, nullable=False)
    affected_status = Column(String, nullable=False, default="unmarked")  # "unmarked" | "confirmed_affected" | "confirmed_dry" — legacy, unused by the active UI (see evacuation_status)
    # Whether flooding itself needs confirming is redundant once a street is
    # already flagged/critical — that's what risk_score already predicts.
    # What's genuinely uncertain, varies per household, and matters for a
    # real recovery report is whether THIS household has actually been
    # reached and gotten to safety yet.
    evacuation_status = Column(String, nullable=False, default="pending")  # "pending" | "evacuated" | "unable_to_evacuate"
    # Coarse damage observed at point of rescue contact — not a full PDNA,
    # just what a rescue team could plausibly radio in during/after contact.
    # null = not yet assessed (household not yet reached).
    damage_level = Column(String, nullable=True)  # null | "none" | "minor" | "severe"
    marked_at = Column(String, nullable=True)        # ISO 8601 string | null


class FloodEvent(Base):
    __tablename__ = "flood_events"

    id = Column(String, primary_key=True, index=True)
    street_id = Column(String, nullable=False, index=True)
    rainfall_mm_hr = Column(Float, nullable=False)
    water_level_estimate_cm = Column(Float, nullable=True)
    fused_risk_score = Column(Float, nullable=False)
    recorded_at = Column(String, nullable=False)     # ISO 8601 string
