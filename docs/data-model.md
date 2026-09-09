# AGOS — Data Model (Hackathon MVP)

Referenced by: `tickets.md` (AGOS-002, AGOS-004), `api-contract.md`, `architecture.md`

This is the **illustrative/synthetic** data model used for the 48-hour build. Field values (elevation, ground-floor flags, rainfall figures) are placeholder data to demonstrate the risk-ranking logic — not real CDRRMO-validated data. Real barangay-validated data and live camera feeds are pilot-phase concerns (see `scope.md`).

---

## Entities

### Street

One entity per pilot camera location. Carries the current fused risk state shown on the dashboard.

| Field | Type | Description | Example |
|---|---|---|---|
| `id` | string | Unique street ID | `"STR-001"` |
| `name` | string | Human-readable location | `"Purok 3, Brgy. Banay-Banay"` |
| `barangay` | string | Barangay name | `"Banay-Banay"` |
| `camera_label` | string | Which camera feed this represents | `"Banay-Banay Bridge Cam 1"` |
| `reference_object` | string | Calibration reference used by the CV POC | `"Bridge support pillar, marked at 0.5m intervals"` |
| `video_filename` | string \| null | Filename under `data/videos/`, served at `GET /videos/<file>` — a live-matched camera feed for this exact street. `null` means no camera feed is configured for this street (the dashboard should show a "no feed" placeholder, not a substitute video — see `cv/README.md` for why unrelated footage isn't reused across streets) | `"flood_3.mp4"` |
| `status` | enum | `"normal"` \| `"watch"` \| `"flagged"` | `"flagged"` |
| `risk_score` | number (0–100) | Fused rainfall risk score, see logic below | `72` |
| `water_level_estimate_cm` | number \| null | Optional illustrative reading sourced from the CV POC (AGOS-008) | `18` |
| `suggested_evacuation_route` | string | Static, illustrative route text | `"Proceed via Purok 3 Main Rd to the covered court on higher ground."` |
| `last_updated` | ISO 8601 timestamp | When this record last changed | `"2026-09-07T14:32:00+08:00"` |

### Household

Belongs to a Street. This is the ranked list that closes the loop.

| Field | Type | Description | Example |
|---|---|---|---|
| `id` | string | Unique household ID | `"HH-014"` |
| `street_id` | string | FK → `Street.id` | `"STR-001"` |
| `address_label` | string | Illustrative address | `"Blk 4 Lot 12"` |
| `elevation_m` | number | Relative elevation above the street's local low point (illustrative) | `0.3` |
| `ground_floor` | boolean | Whether the household occupies a ground-floor unit | `true` |
| `risk_score` | number (0–100) | Computed, see logic below | `88` |
| `risk_rank` | integer | Rank within its street; `1` = highest priority | `1` |
| `predicted_at_risk` | boolean | Whether this household is in the pre-flood risk-ranked list | `true` |
| `affected_status` | enum | `"unmarked"` \| `"confirmed_affected"` \| `"confirmed_dry"` | `"unmarked"` |
| `marked_at` | ISO 8601 timestamp \| null | When `affected_status` was last set | `null` |

### FloodEvent

A rainfall/risk-fusion sample tied to a street at a point in time — the input that produces `Street.risk_score`. Represents the "Data Fusion" stage from the proposal.

| Field | Type | Description | Example |
|---|---|---|---|
| `id` | string | Unique event/sample ID | `"EVT-001"` |
| `street_id` | string | FK → `Street.id` | `"STR-001"` |
| `rainfall_mm_hr` | number | Sample rainfall intensity (stands in for a PAGASA/rain-gauge feed) | `18.2` |
| `water_level_estimate_cm` | number \| null | Optional CV-derived reading at time of sample | `18` |
| `fused_risk_score` | number (0–100) | Output of the fusion logic below | `72` |
| `recorded_at` | ISO 8601 timestamp | When the sample was taken | `"2026-09-07T14:30:00+08:00"` |

### Relationships

```
Street (1) ──< (N) Household
Street (1) ──< (N) FloodEvent
```

---

## Illustrative scoring logic

Explicitly a stand-in for demo purposes — not a trained model, and not calibrated against real Cabuyao data. Real calibration is a pilot-phase activity.

**Street status/risk (from `rainfall_mm_hr`, loosely modeled on PAGASA's rainfall warning tiers):**

| Rainfall intensity | Status | `risk_score` formula |
|---|---|---|
| < 7.5 mm/hr | `normal` | `(rainfall_mm_hr / 7.5) * 30` |
| 7.5–14.9 mm/hr | `watch` | `30 + ((rainfall_mm_hr - 7.5) / 7.4) * 30` |
| ≥ 15 mm/hr | `flagged` | `60 + min(40, ((rainfall_mm_hr - 15) / 15) * 40)` |

Optional stretch: if `water_level_estimate_cm` is present and above a per-street threshold, add a flat `+10` (capped at 100) — a small, visible way to tie the CV track's output into the fused score for the demo narrative.

**Household risk (from `elevation_m` and `ground_floor`):**

```
elevation_score = max(0, 100 - (elevation_m * 25))
risk_score       = min(100, elevation_score * 0.8 + (15 if ground_floor else 0))
```

`risk_rank` = households on the same street sorted descending by `risk_score` (1 = highest). `predicted_at_risk` = true for households above a risk_score threshold (suggested: `≥ 50`, or simply the top N per flagged street) — this is the list CDRRMO would act on first.

---

## Seed data volume (suggested)

Enough to look real without over-building: **3–4 streets**, **5–8 households per street**, **1–2 flood events per street**. At least one street should land in `flagged` status out of the box so the demo doesn't require manual setup to show the core flow.
