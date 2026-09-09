# illustrative_scoring.py — the documented MVP scoring formulas (docs/data-model.md)
#
# These are explicitly illustrative stand-ins for the hackathon demo, not a
# calibrated model (see docs/data-model.md, "Illustrative scoring logic").
# seed.py is the only caller — kept here so risk figures are always derived
# from the documented formula instead of being hand-typed into seed data.


def compute_street_risk(rainfall_mm_hr: float) -> tuple[str, float]:
    """Street status/risk from sample rainfall intensity (docs/data-model.md)."""
    if rainfall_mm_hr < 7.5:
        return "normal", (rainfall_mm_hr / 7.5) * 30
    elif rainfall_mm_hr < 15.0:
        return "watch", 30 + ((rainfall_mm_hr - 7.5) / 7.4) * 30
    else:
        return "flagged", 60 + min(40, ((rainfall_mm_hr - 15) / 15) * 40)


def compute_household_risk(elevation_m: float, ground_floor: bool) -> float:
    """Household risk from illustrative elevation-above-local-low-point and
    ground-floor flag (docs/data-model.md)."""
    elevation_score = max(0.0, 100 - (elevation_m * 25))
    return min(100.0, elevation_score * 0.8 + (15 if ground_floor else 0))
