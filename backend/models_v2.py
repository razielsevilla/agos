# models_v2.py — AGOS v2 Normalized SQLAlchemy ORM (PostgreSQL + PostGIS)
#
# Schema: 4-table normalized architecture
#   barangays → streets → street_demographics
#                       → risk_assessments (append-only time-series)
#
# Prerequisites:
#   pip install geoalchemy2 psycopg2-binary
#
# Drop-in upgrade path from models.py (SQLite flat schema).
# The old Street, Household, FloodEvent models are kept below in a
# LEGACY COMPAT block for reference during the migration transition.

from __future__ import annotations
import enum
from datetime import datetime

# pyrefly: ignore [missing-import]
from sqlalchemy import (
    BigInteger, CheckConstraint, Column, Enum, ForeignKey,
    Integer, Numeric, SmallInteger, String, Text, UniqueConstraint
)
# pyrefly: ignore [missing-import]
from sqlalchemy.dialects.postgresql import TIMESTAMPTZ
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship
# pyrefly: ignore [missing-import]
from geoalchemy2 import Geometry

from database import Base


# ── Enums ───────────────────────────────────────────────────────────────────

class FloodSusceptibilityLevel(str, enum.Enum):
    """Static PAGASA/PHIVOLCS-derived susceptibility class (does not change with rain)."""
    Low      = "Low"
    Medium   = "Medium"
    High     = "High"
    Critical = "Critical"


class RiskLevel(str, enum.Enum):
    """Dynamic computed risk level from scoring formula (changes each assessment cycle)."""
    Low      = "Low"
    Moderate = "Moderate"
    High     = "High"
    Severe   = "Severe"


# ── Primary Models ───────────────────────────────────────────────────────────

class Barangay(Base):
    """Official 18 barangays of Cabuyao, Laguna (PSGC: 043410300).

    Acts as the root geographic entity. All streets belong to a barangay.
    Boundary geometry is nullable — populated separately from NAMRIA shapefiles.
    """
    __tablename__ = "barangays"

    id               = Column(Integer,     primary_key=True, index=True)
    name             = Column(String(100), nullable=False)
    code             = Column(String(10),  nullable=False, unique=True)   # PSGC 10-digit
    boundary         = Column(
        Geometry("MULTIPOLYGON", srid=4326),
        nullable=True,
        comment="NAMRIA/PSA boundary polygon. Nullable until shapefile import."
    )
    total_population = Column(
        Integer,
        CheckConstraint("total_population >= 0"),
        nullable=True,
        comment="PSA 2020 CPH total population."
    )
    created_at       = Column(TIMESTAMPTZ, nullable=False, default=datetime.utcnow)
    updated_at       = Column(TIMESTAMPTZ, nullable=False, default=datetime.utcnow,
                              onupdate=datetime.utcnow)

    # ── Relationships ──
    streets: list[Street] = relationship(
        "Street", back_populates="barangay", lazy="dynamic"
    )

    def __repr__(self) -> str:
        return f"<Barangay id={self.id} name={self.name!r} code={self.code!r}>"


class Street(Base):
    """Monitored road segment. Belongs to one barangay.

    Geometry fields:
      - geom:     Full LINESTRING centerline from OpenStreetMap (nullable).
      - centroid:  Pre-computed POINT centroid for fast nearest-neighbor queries.

    Static vs. dynamic risk:
      - baseline_flood_susceptibility: STATIC — derived from PAGASA hazard maps.
      - Current risk state is always in the latest risk_assessments row.
    """
    __tablename__ = "streets"

    id                            = Column(Integer, primary_key=True, index=True)
    barangay_id                   = Column(
        Integer,
        ForeignKey("barangays.id", ondelete="RESTRICT"),
        nullable=False, index=True
    )
    street_name                   = Column(String(200), nullable=False)
    geom                          = Column(
        Geometry("LINESTRING", srid=4326),
        nullable=True,
        comment="Full road centerline from OSM. WGS84 (SRID 4326)."
    )
    centroid                      = Column(
        Geometry("POINT", srid=4326),
        nullable=True,
        comment="Pre-computed centroid. Stored for fast spatial lookups."
    )
    average_elevation_m           = Column(
        Numeric(6, 2),
        CheckConstraint("average_elevation_m >= 0"),
        nullable=True,
        comment="Mean elevation of road centerline in meters ASL (SRTM 30m)."
    )
    ground_floor_elevation_m      = Column(
        Numeric(6, 2),
        CheckConstraint("ground_floor_elevation_m >= 0"),
        nullable=True,
        comment="Estimated ground-floor elevation of adjacent structures (m ASL)."
    )
    baseline_flood_susceptibility = Column(
        Enum(FloodSusceptibilityLevel, name="flood_susceptibility_level"),
        nullable=False,
        default=FloodSusceptibilityLevel.Low,
        comment="Static PAGASA susceptibility class. Never changed by scoring engine."
    )
    camera_label                  = Column(String(200), nullable=True)
    reference_object              = Column(String(300), nullable=True)
    suggested_evacuation_route    = Column(Text,         nullable=True)
    osm_way_id                    = Column(
        BigInteger, unique=True, nullable=True,
        comment="OpenStreetMap way ID for GIS traceability."
    )
    created_at                    = Column(TIMESTAMPTZ, nullable=False, default=datetime.utcnow)
    updated_at                    = Column(TIMESTAMPTZ, nullable=False, default=datetime.utcnow,
                                          onupdate=datetime.utcnow)

    # ── Relationships ──
    barangay: Barangay                        = relationship("Barangay", back_populates="streets")
    demographics: StreetDemographics          = relationship(
        "StreetDemographics", back_populates="street", uselist=False
    )
    risk_assessments: list[RiskAssessment]    = relationship(
        "RiskAssessment", back_populates="street",
        order_by="RiskAssessment.recorded_at.desc()",
        lazy="dynamic"
    )

    @property
    def latest_assessment(self) -> RiskAssessment | None:
        """Returns the most recent risk assessment, or None if none exist."""
        return self.risk_assessments.first()

    def __repr__(self) -> str:
        return (
            f"<Street id={self.id} name={self.street_name!r} "
            f"barangay_id={self.barangay_id} "
            f"elev={self.average_elevation_m}m "
            f"susceptibility={self.baseline_flood_susceptibility}>"
        )


class StreetDemographics(Base):
    """Census-derived vulnerability data. 1:1 relationship with streets.

    Kept in a separate table so that GIS/spatial queries on streets stay lean.
    All counts are sourced from PSA 2020 CPH data, proportionally allocated
    to the street's coverage area within the barangay.

    Vulnerability groups:
      - children_count:       Age 0–12 (require adult supervision; cannot self-evacuate)
      - senior_citizen_count: Age 60+ (RA 9994 Expanded Senior Citizens Act)
      - pregnant_count:       Must be ≤ women_count
      - pwd_count:            Persons with Disabilities (RA 7277)
    """
    __tablename__ = "street_demographics"
    __table_args__ = (
        # Subgroup counts cannot logically exceed total residents
        CheckConstraint("women_count <= total_residents",          name="chk_women_lte_residents"),
        CheckConstraint("children_count <= total_residents",       name="chk_children_lte_residents"),
        CheckConstraint("senior_citizen_count <= total_residents", name="chk_seniors_lte_residents"),
        CheckConstraint("pwd_count <= total_residents",            name="chk_pwd_lte_residents"),
        CheckConstraint("pregnant_count <= women_count",           name="chk_pregnant_lte_women"),
    )

    id                   = Column(Integer, primary_key=True, index=True)
    street_id            = Column(
        Integer,
        ForeignKey("streets.id", ondelete="CASCADE"),
        nullable=False, unique=True,    # Enforces 1:1 at DB level
        index=True
    )
    total_residents      = Column(Integer, nullable=False, default=0,
                                  comment="Total residential population on/adjacent to street.")
    total_households     = Column(Integer, nullable=False, default=0)
    women_count          = Column(Integer, nullable=False, default=0)
    children_count       = Column(Integer, nullable=False, default=0,
                                  comment="Children aged 0–12 years inclusive.")
    pregnant_count       = Column(Integer, nullable=False, default=0)
    senior_citizen_count = Column(Integer, nullable=False, default=0,
                                  comment="Senior citizens aged 60+ (RA 9994).")
    pwd_count            = Column(Integer, nullable=False, default=0,
                                  comment="Persons with Disabilities (RA 7277).")
    census_year          = Column(SmallInteger, nullable=True,
                                  comment="Reference census year (e.g., 2020).")
    source_notes         = Column(Text, nullable=True)
    created_at           = Column(TIMESTAMPTZ, nullable=False, default=datetime.utcnow)
    updated_at           = Column(TIMESTAMPTZ, nullable=False, default=datetime.utcnow,
                                  onupdate=datetime.utcnow)

    # ── Relationships ──
    street: Street = relationship("Street", back_populates="demographics")

    def vulnerability_ratio(self) -> float:
        """Compute raw vulnerability ratio for scoring (pre-normalization).

        Returns the weighted sum of vulnerable subgroups divided by total residents.
        Formula: (1.5·seniors + 1.3·children + 1.8·pregnant + 1.4·pwd) / total_residents
        """
        if self.total_residents <= 0:
            return 0.0
        numerator = (
            1.5 * (self.senior_citizen_count or 0)
            + 1.3 * (self.children_count or 0)
            + 1.8 * (self.pregnant_count or 0)
            + 1.4 * (self.pwd_count or 0)
        )
        return min(1.0, numerator / self.total_residents)

    def __repr__(self) -> str:
        return (
            f"<StreetDemographics street_id={self.street_id} "
            f"residents={self.total_residents} "
            f"households={self.total_households}>"
        )


class RiskAssessment(Base):
    """Append-only rainfall-fused risk scoring log.

    IMPORTANT: Never UPDATE a row in this table.
    Always INSERT a new row for each assessment cycle.
    The latest row per street_id = the live risk state.

    Use the view v_current_street_risk for dashboard reads (avoids
    manually querying DISTINCT ON each time).

    Rainfall inputs:
      - rainfall_intensity_mmh: Instantaneous mm/hr from Open-Meteo or PAGASA SYNOP.
      - cumulative_rain_24h:    Rolling 24-hr total in mm (soil saturation proxy).

    Scoring:
      - elevation_penalty:      Pre-computed E_score × 100. Stored for audit.
      - calculated_risk_score:  Final 0–100 index (weighted sum of 4 components × 100).
      - risk_level:             Categorical classification from score thresholds.
      - scoring_version:        Formula version tag for audit trail.
    """
    __tablename__ = "risk_assessments"

    id                      = Column(BigInteger, primary_key=True, autoincrement=True)
    street_id               = Column(
        Integer,
        ForeignKey("streets.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    recorded_at             = Column(TIMESTAMPTZ, nullable=False, default=datetime.utcnow,
                                     index=True)

    # Rainfall inputs
    rainfall_intensity_mmh  = Column(
        Numeric(7, 2),
        CheckConstraint("rainfall_intensity_mmh >= 0"),
        nullable=False,
        comment="Instantaneous rainfall in mm/hr at time of assessment."
    )
    cumulative_rain_24h     = Column(
        Numeric(8, 2),
        CheckConstraint("cumulative_rain_24h >= 0"),
        nullable=False,
        comment="Rolling 24-hour cumulative rainfall in mm (soil saturation proxy)."
    )

    # Scoring components (stored for audit/debugging)
    elevation_penalty       = Column(
        Numeric(5, 2),
        CheckConstraint("elevation_penalty BETWEEN 0 AND 100"),
        nullable=False,
        comment="Elevation component × 100. Higher = lower elevation = more flood-prone."
    )

    # Output
    calculated_risk_score   = Column(
        Numeric(5, 2),
        CheckConstraint("calculated_risk_score BETWEEN 0 AND 100"),
        nullable=False,
        comment="Final normalized risk index (0–100). See scoring.py for formula."
    )
    risk_level              = Column(
        Enum(RiskLevel, name="risk_level_enum"),
        nullable=False,
        comment="Categorical classification: Low < 25 | Moderate 25–50 | High 50–75 | Severe ≥ 75"
    )

    # Audit
    scoring_version         = Column(String(20), nullable=False, default="1.0",
                                     comment="Formula version tag for reproducibility.")
    rainfall_source         = Column(String(50),  nullable=True, default="open-meteo")
    water_level_estimate_cm = Column(
        Numeric(6, 1),
        CheckConstraint("water_level_estimate_cm >= 0"),
        nullable=True,
        comment="Observed or CV-estimated water level depth in cm. NULL if no data."
    )

    # ── Relationships ──
    street: Street = relationship("Street", back_populates="risk_assessments")

    def __repr__(self) -> str:
        return (
            f"<RiskAssessment id={self.id} street_id={self.street_id} "
            f"score={self.calculated_risk_score} level={self.risk_level} "
            f"at={self.recorded_at}>"
        )
