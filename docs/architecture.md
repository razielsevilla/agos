# AGOS — System Architecture (Hackathon MVP)

Referenced by: `tickets.md` (AGOS-022), `data-model.md`, `api-contract.md`

## Overview

AGOS's architectural point is that **one data pipeline serves both halves of Challenge 3**. The same `Household` risk list that drives pre-flood alerting is, after a "mark as flooded/affected" action, the post-flood recovery-priority record.

## Components (hackathon build)

| Component | Role | Tech |
|---|---|---|
| CV POC | Standalone waterline detection proof-of-concept on recorded footage | Python + OpenCV |
| Backend API | Serves streets, households, flood events; owns the fusion/ranking logic and the mark-affected transition | FastAPI/Flask + SQLite |
| Frontend Dashboard | Renders flagged streets, household list, mark-affected action, recovery view, mock alert | React JS |
| Seed data | Illustrative streets/households/flood events | JSON/CSV, loaded into SQLite on startup |

The CV POC is intentionally **not wired live** into the backend for the hackathon — it produces packaged output (annotated frames, sample values) that is referenced as supporting evidence, and optionally logged as an illustrative `water_level_estimate_cm` value on a `Street`/`FloodEvent` record (see `data-model.md`). Full integration (live frame → live reading → live fusion) is a pilot-phase activity.

## Closing-the-loop diagram

```
                        ┌─────────────────────────┐
                        │   FloodEvent (rainfall/ │
                        │   CV-reading sample)    │
                        └────────────┬────────────┘
                                     │ fuses into
                                     ▼
                        ┌─────────────────────────┐
                        │   Street.risk_score /   │
                        │   status = "flagged"    │
                        └────────────┬────────────┘
                                     │ triggers
                                     ▼
                        ┌─────────────────────────┐
              ┌─────────┤  Household risk list    │
              │         │  (ranked, pre-flood)    │
              │         └────────────┬────────────┘
   sent as    │                      │ CDRRMO marks households
   mock alert │                      │ during the simulated event
              ▼                      ▼
   ┌───────────────────┐   ┌─────────────────────────┐
   │  Alert payload    │   │  SAME Household records │
   │  (street + list + │   │  now carry affected_    │
   │  evac route)      │   │  status                 │
   └───────────────────┘   └────────────┬────────────┘
                                        │ re-sorted, not regenerated
                                        ▼
                            ┌─────────────────────────┐
                            │  Recovery-priority      │
                            │  record (post-flood)    │
                            └─────────────────────────┘
```

The key visual point for the demo/pitch: the **household list box in the middle is the same record** before and after the event — the diagram should draw attention to that, not just the top-to-bottom flow.

## Data flow narrative

**Pre-flood path**
1. A `FloodEvent` sample (rainfall, optionally a CV water-level reading) is recorded against a `Street`.
2. The fusion logic (see `data-model.md`) computes `Street.risk_score` and flips `status` to `"flagged"` past threshold.
3. The backend computes/serves the ranked `Household` list for that street (`GET /streets/{id}/households`).
4. The dashboard displays the flagged street and its household list; the mock alert view composes the same data into an alert-shaped payload.

**Post-flood path (the loop closes here)**
1. During the simulated event, CDRRMO staff (in the demo: the presenter) mark specific households via `PATCH /households/{id}`.
2. No new record is created — the existing `Household` row gets `affected_status` and `marked_at` set.
3. `GET /streets/{id}/recovery-record` returns the same rows, re-sorted to surface households that were both predicted at-risk and confirmed affected — CDRRMO's relief-prioritization starting point.

## Component → ticket mapping

| Component | Tickets |
|---|---|
| CV POC | AGOS-005, 006, 007, 008 |
| Backend API | AGOS-009 – 015 |
| Frontend Dashboard | AGOS-016 – 021 |
| Data model / seed data | AGOS-002, 004 |
| Integration & demo readiness | AGOS-022 – 025 |

## What's real vs. mocked in this build

See `scope.md` for the full in/out-of-scope list. In short: the CV method, the fusion logic, and the closing-the-loop mechanic are real and working end-to-end against synthetic data. Live camera feeds, real CDRRMO-validated household data, measured CV accuracy, and live alert delivery channels are not — and are explicitly deferred to a CDRRMO-partnered pilot.
