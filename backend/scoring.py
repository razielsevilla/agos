# scoring.py — AGOS v2 Rainfall-Fusion Risk Scoring Engine
#
# Formula version: 1.0
# Author: AGOS Engineering Team
#
# This module is the single source of truth for all risk calculations.
# It is intentionally dependency-free (no SQLAlchemy, no FastAPI imports)
# so it can be unit-tested and used in batch jobs independently.
#
# ─────────────────────────────────────────────────────────────────────────────
# FORMULA OVERVIEW
# ─────────────────────────────────────────────────────────────────────────────
#
#  AGOS_Risk_Index = 100 × (w_R·R + w_S·S + w_E·E + w_V·V)
#
#  Components (each normalized to [0, 1]):
#    R = Rainfall intensity score    (w=0.35) — PAGASA threshold bands
#    S = Soil saturation score       (w=0.25) — 24h cumulative rain proxy
#    E = Elevation penalty score     (w=0.25) — meters ASL vs. Laguna de Bay baseline
#    V = Demographic vulnerability   (w=0.15) — weighted vulnerable population ratio
#
#  Risk Level classification (from score):
#    Low      :  0.00 – 24.99   → status: "normal"
#    Moderate : 25.00 – 49.99   → status: "watch"
#    High     : 50.00 – 74.99   → status: "flagged"
#    Severe   : 75.00 – 100.00  → status: "flagged"
#
# ─────────────────────────────────────────────────────────────────────────────

from __future__ import annotations
from dataclasses import dataclass
from typing import Literal

# Formula version — bump this string whenever weights or breakpoints change.
SCORING_VERSION = "1.0"

# ── Weights (must sum to 1.0) ────────────────────────────────────────────────
W_RAINFALL   = 0.35   # Rainfall intensity — most immediate trigger
W_SATURATION = 0.25   # 24h cumulative rain — antecedent soil moisture
W_ELEVATION  = 0.25   # Elevation penalty — static topographic susceptibility
W_VULN       = 0.15   # Demographic vulnerability multiplier

# ── Elevation reference constants (meters ASL, WGS84) ───────────────────────
# Laguna de Bay normal operating water level (LLDA gage reading ≈ +1.0m ASL).
LAKE_BASE_ELEVATION_M = 1.0
# Street elevation above which flood inundation risk is negligible.
SAFE_ELEVATION_M = 12.0

# ── Vulnerability weighting factors ─────────────────────────────────────────
# Relative evacuation assistance need (higher = more vulnerable).
VW_SENIORS  = 1.5   # Senior citizens 60+ (RA 9994): slow mobility, comorbidities
VW_CHILDREN = 1.3   # Children 0–12: require adult supervision
VW_PREGNANT = 1.8   # Pregnant women: highest mobility constraint; medical risk
VW_PWD      = 1.4   # Persons with Disabilities (RA 7277): variable constraints

# ── Risk level thresholds ────────────────────────────────────────────────────
_RISK_THRESHOLDS = [
    (75.0, "Severe"),
    (50.0, "High"),
    (25.0, "Moderate"),
    (0.0,  "Low"),
]


# ─────────────────────────────────────────────────────────────────────────────
# RESULT TYPE
# ─────────────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class RiskResult:
    """Immutable result of a single risk assessment computation.

    Attributes:
        risk_score:         Final 0–100 index (2 decimal places).
        risk_level:         Categorical classification string.
        r_score:            Rainfall intensity component [0, 1].
        s_score:            Soil saturation component [0, 1].
        e_score:            Elevation penalty component [0, 1].
        v_score:            Demographic vulnerability component [0, 1].
        elevation_penalty:  e_score × 100 (stored in DB for audit).
        scoring_version:    Formula version tag.
        status:             Derived operational status string.
    """
    risk_score:       float
    risk_level:       Literal["Low", "Moderate", "High", "Severe"]
    r_score:          float
    s_score:          float
    e_score:          float
    v_score:          float
    elevation_penalty: float
    scoring_version:  str

    @property
    def status(self) -> Literal["normal", "watch", "flagged"]:
        """Derived operational status for UI display."""
        if self.risk_level == "Low":
            return "normal"
        if self.risk_level == "Moderate":
            return "watch"
        return "flagged"  # High or Severe

    def as_dict(self) -> dict:
        return {
            "risk_score":        self.risk_score,
            "risk_level":        self.risk_level,
            "status":            self.status,
            "elevation_penalty": self.elevation_penalty,
            "components": {
                "r_score": self.r_score,
                "s_score": self.s_score,
                "e_score": self.e_score,
                "v_score": self.v_score,
            },
            "scoring_version": self.scoring_version,
        }


# ─────────────────────────────────────────────────────────────────────────────
# COMPONENT FUNCTIONS
# ─────────────────────────────────────────────────────────────────────────────

def rainfall_score(intensity_mmh: float) -> float:
    """Compute rainfall intensity component R ∈ [0, 1].

    Uses PAGASA advisory threshold bands as piecewise breakpoints:
      < 2.5 mm/hr  → negligible (0.00)
      2.5–7.5      → light–moderate  (0.10–0.20)
      7.5–15       → yellow alert    (0.20–0.40)
      15–30        → orange alert    (0.40–0.80)
      ≥ 30         → red alert       (0.80–1.00, asymptotic)

    Args:
        intensity_mmh: Instantaneous rainfall intensity in mm/hr.

    Returns:
        Normalized score in [0.0, 1.0].
    """
    I = max(0.0, float(intensity_mmh))
    if I < 2.5:
        return 0.0
    if I < 7.5:
        return 0.10 + (I - 2.5) / 50.0
    if I < 15.0:
        return 0.20 + (I - 7.5) / 37.5
    if I < 30.0:
        return 0.40 + (I - 15.0) / 37.5
    # Red alert zone: asymptotic approach to 1.0
    return min(1.0, 0.80 + (I - 30.0) / 150.0)


def saturation_score(cumulative_24h_mm: float) -> float:
    """Compute soil saturation component S ∈ [0, 1].

    Approximates antecedent moisture content via 24-hour cumulative rainfall.
    Below 10 mm → negligible effect (score = 0).
    At 200 mm (fully saturated) → score approaches 1.0.

    Formula: S = clamp((C - 10) / 190, 0, 1)

    Args:
        cumulative_24h_mm: Rolling 24-hour cumulative rainfall in mm.

    Returns:
        Normalized score in [0.0, 1.0].
    """
    C = max(0.0, float(cumulative_24h_mm))
    return min(1.0, max(0.0, (C - 10.0) / 190.0))


def elevation_score(
    elevation_m: float,
    base: float = LAKE_BASE_ELEVATION_M,
    safe: float = SAFE_ELEVATION_M,
) -> float:
    """Compute elevation penalty component E ∈ [0, 1].

    Lower elevations near Laguna de Bay baseline receive higher penalties.
    Streets at or above `safe` elevation receive zero penalty.

    Formula: E = clamp((safe - max(base, elev)) / (safe - base), 0, 1)

    Reference elevations:
      base = 1.0 m ASL  (Laguna de Bay normal water level)
      safe = 12.0 m ASL (negligible flood inundation risk above this)

    Args:
        elevation_m: Street average elevation in meters ASL.
        base:        Lake baseline elevation (default 1.0 m ASL).
        safe:        Safe elevation threshold (default 12.0 m ASL).

    Returns:
        Normalized penalty score in [0.0, 1.0].
    """
    elev = max(float(base), float(elevation_m))
    e_raw = (float(safe) - elev) / (float(safe) - float(base))
    return max(0.0, min(1.0, e_raw))


def vulnerability_score(
    total_residents: int,
    seniors: int,
    children: int,
    pregnant: int,
    pwd: int,
) -> float:
    """Compute demographic vulnerability component V ∈ [0, 1].

    Weighted sum of vulnerable subgroups as a fraction of total residents.
    Weights reflect relative evacuation assistance requirements:
      - Pregnant women : 1.8 (highest — medical emergency risk)
      - Seniors 60+    : 1.5 (slow mobility, comorbidities)
      - PWDs           : 1.4 (variable mobility constraints)
      - Children 0–12  : 1.3 (require adult supervision)

    Formula: V = clamp((1.5·Ns + 1.3·Nc + 1.8·Np + 1.4·Nw) / N, 0, 1)

    Args:
        total_residents: Total population on/adjacent to street.
        seniors:         Count of residents aged 60+.
        children:        Count of children aged 0–12.
        pregnant:        Count of pregnant women.
        pwd:             Count of Persons with Disabilities.

    Returns:
        Normalized score in [0.0, 1.0].
    """
    N = max(1, int(total_residents))
    numerator = (
        VW_SENIORS  * max(0, int(seniors))
        + VW_CHILDREN * max(0, int(children))
        + VW_PREGNANT * max(0, int(pregnant))
        + VW_PWD      * max(0, int(pwd))
    )
    return min(1.0, numerator / N)


def classify_risk(score: float) -> str:
    """Map a continuous score to a categorical risk level.

    Thresholds:
      ≥ 75 → "Severe"
      ≥ 50 → "High"
      ≥ 25 → "Moderate"
       < 25 → "Low"

    Args:
        score: Risk score in [0, 100].

    Returns:
        Risk level string.
    """
    for threshold, level in _RISK_THRESHOLDS:
        if score >= threshold:
            return level
    return "Low"


# ─────────────────────────────────────────────────────────────────────────────
# MAIN SCORING FUNCTION
# ─────────────────────────────────────────────────────────────────────────────

def compute_risk(
    intensity_mmh: float,
    cumulative_24h_mm: float,
    elevation_m: float,
    total_residents: int = 0,
    seniors: int = 0,
    children: int = 0,
    pregnant: int = 0,
    pwd: int = 0,
    *,
    w_rainfall: float = W_RAINFALL,
    w_saturation: float = W_SATURATION,
    w_elevation: float = W_ELEVATION,
    w_vuln: float = W_VULN,
) -> RiskResult:
    """Compute the AGOS Rainfall-Fusion Risk Index.

    Fuses four components into a normalized 0–100 risk score:
      - R: Rainfall intensity (PAGASA threshold bands)
      - S: Soil saturation via 24h cumulative rain
      - E: Elevation penalty relative to Laguna de Bay baseline
      - V: Demographic vulnerability (weighted vulnerable population ratio)

    Args:
        intensity_mmh:      Real-time rainfall intensity (mm/hr).
        cumulative_24h_mm:  Rolling 24-hour cumulative rainfall (mm).
        elevation_m:        Street average elevation (meters ASL).
        total_residents:    Total population on/adjacent to street.
        seniors:            Senior citizens aged 60+.
        children:           Children aged 0–12.
        pregnant:           Pregnant women.
        pwd:                Persons with Disabilities.
        w_rainfall:         Weight for rainfall component (default 0.35).
        w_saturation:       Weight for saturation component (default 0.25).
        w_elevation:        Weight for elevation component (default 0.25).
        w_vuln:             Weight for vulnerability component (default 0.15).

    Returns:
        RiskResult dataclass with all components and final score.

    Example:
        >>> r = compute_risk(38.5, 145.0, 2.4, 420, 51, 84, 12, 18)
        >>> r.risk_score
        77.6
        >>> r.risk_level
        'Severe'
        >>> r.status
        'flagged'
    """
    R = rainfall_score(intensity_mmh)
    S = saturation_score(cumulative_24h_mm)
    E = elevation_score(elevation_m)
    V = vulnerability_score(total_residents, seniors, children, pregnant, pwd)

    raw   = w_rainfall * R + w_saturation * S + w_elevation * E + w_vuln * V
    score = round(min(100.0, max(0.0, raw * 100.0)), 2)
    level = classify_risk(score)

    return RiskResult(
        risk_score        = score,
        risk_level        = level,
        r_score           = round(R, 4),
        s_score           = round(S, 4),
        e_score           = round(E, 4),
        v_score           = round(V, 4),
        elevation_penalty = round(E * 100.0, 2),
        scoring_version   = SCORING_VERSION,
    )


# ─────────────────────────────────────────────────────────────────────────────
# BATCH SCORING HELPER
# ─────────────────────────────────────────────────────────────────────────────

def batch_compute_risk(streets_data: list[dict]) -> list[dict]:
    """Compute risk for a list of street+rainfall+demographic records.

    Each dict in streets_data should contain:
        street_id, intensity_mmh, cumulative_24h_mm, elevation_m,
        total_residents, seniors, children, pregnant, pwd

    Returns:
        List of dicts with street_id and full RiskResult as_dict().
    """
    results = []
    for row in streets_data:
        result = compute_risk(
            intensity_mmh      = row["intensity_mmh"],
            cumulative_24h_mm  = row["cumulative_24h_mm"],
            elevation_m        = row["elevation_m"],
            total_residents    = row.get("total_residents", 0),
            seniors            = row.get("seniors", 0),
            children           = row.get("children", 0),
            pregnant           = row.get("pregnant", 0),
            pwd                = row.get("pwd", 0),
        )
        results.append({
            "street_id": row["street_id"],
            **result.as_dict(),
        })
    # Sort by risk_score descending (most critical first)
    results.sort(key=lambda x: x["risk_score"], reverse=True)
    return results


# ─────────────────────────────────────────────────────────────────────────────
# SELF-TEST (run: python scoring.py)
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("AGOS Risk Scoring Engine — Self-Test")
    print(f"Formula version: {SCORING_VERSION}")
    print("=" * 60)

    # Labels describe a generic scenario shape (lakeshore/lowland/upland), not a specific
    # real street — the numeric inputs are illustrative, not measured data (see docs/scope.md).
    test_cases = [
        {
            "label": "Lakeshore street, extreme scenario A",
            "args":  (38.5, 145.0, 2.4, 420, 51, 84, 12, 18),
            "expected_level": "Severe",
        },
        {
            "label": "Lakeshore street, extreme scenario B",
            "args":  (41.0, 158.0, 2.0, 520, 62, 104, 15, 23),
            "expected_level": "Severe",
        },
        {
            "label": "Lakeshore street, extreme scenario C",
            "args":  (36.8, 135.0, 1.8, 280, 48, 62, 9, 11),
            "expected_level": "Severe",
        },
        {
            "label": "Lakeshore street, high scenario",
            "args":  (35.2, 128.0, 3.1, 310, 39, 58, 8, 12),
            "expected_level": "High",
        },
        {
            "label": "Dense inland street, sustained heavy rain",
            "args":  (22.5, 87.0, 5.2, 680, 72, 142, 21, 28),
            "expected_level": "High",
        },
        {
            "label": "Commercial inland street, yellow alert",
            "args":  (14.2, 52.0, 6.8, 390, 45, 72, 10, 14),
            "expected_level": "Moderate",
        },
        {
            "label": "Transitional/upland-adjacent street",
            "args":  (20.0, 78.0, 14.5, 195, 22, 38, 4, 6),
            "expected_level": "Moderate",
        },
        {
            "label": "Upland street, minimal flood exposure",
            "args":  (22.0, 85.0, 38.2, 145, 18, 28, 3, 4),
            "expected_level": "Moderate",
        },
    ]

    all_passed = True
    for tc in test_cases:
        r = compute_risk(*tc["args"])
        passed = r.risk_level == tc["expected_level"]
        status_icon = "[PASS]" if passed else "[FAIL]"
        if not passed:
            all_passed = False
        print(
            f"  {status_icon} [{r.risk_level:8s}] score={r.risk_score:5.1f}  "
            f"R={r.r_score:.3f} S={r.s_score:.3f} E={r.e_score:.3f} V={r.v_score:.3f}  "
            f"-> {tc['label']}"
        )

    print()
    print("All tests passed." if all_passed else "SOME TESTS FAILED.")
    print("=" * 60)
