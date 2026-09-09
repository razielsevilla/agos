# AGOS — MVP Development Tickets (48-Hour Build)

Development flow for the Hack4Progress hackathon deliverables: the OpenCV waterline POC, the closing-the-loop demo (centerpiece), the demo dashboard, the mocked alert output, and the architecture diagram.

## Legend

- **Status**: `Ready to Start` · `Blocked` · `In Progress` · `For Review` · `Done`
- **Type**: open-ended — `Frontend`, `Backend`, `CV/ML`, `Data`, `Setup`, `Docs`, `Integration`, `QA`
- **Dependency**: Ticket ID(s) that must be `Done` before this ticket can move out of `Blocked`
- Status below reflects the state at project kickoff (nothing started yet) — update as work progresses.

---

## Phase 0 — Foundation

| Ticket ID | Ticket Name | Status | Type | Acceptance Criteria | Dependency |
|---|---|---|---|---|---|
| AGOS-001 | Repo & dev environment scaffolding | Done | Setup | - [x] Repo structure created (backend/, frontend/, cv/, docs/, data/)<br>- [x] README with local run instructions<br>- [x] Python + Node toolchains confirmed working for all 4 members | None |
| AGOS-002 | Define data model schema | Done | Data | - [x] Household record fields defined (address, street ID, elevation, ground-floor flag, risk score, status)<br>- [x] Street/camera record fields defined<br>- [x] Flood event / rainfall record fields defined<br>- [x] Schema written to `docs/data-model.md` | None |
| AGOS-003 | Define API contract | Done | Backend | - [x] Endpoint list drafted (streets, households, mark-affected, recovery record, alert payload)<br>- [x] Request/response shapes agreed with frontend dev<br>- [x] Contract written to `docs/api-contract.md` | AGOS-002 |
| AGOS-004 | Prepare illustrative/synthetic dataset | Done | Data | - [x] Sample streets with rainfall-fusion risk scores<br>- [x] Sample households per street with elevation/ground-floor data and ranked risk<br>- [x] Dataset saved as seed file (JSON/CSV) matching AGOS-002 schema | AGOS-002 |
| AGOS-005 | Source sample flood footage for CV POC | Done | CV/ML | - [x] 2–3 public/recorded flood or bridge-camera clips or image sequences collected (`data/videos/flood_1.mp4` and `flood_2.mp4` — real CDRRMO Water Level Monitoring footage, Fishing Port Brgy. Marinig, two different observations of the same piling; `flood_3.mp4` — a real Marikina River bridge-cam livestream clip). Note: `flood_N.mp4` are reused demo-video slots, not stable identities — see `cv/README.md`'s warning about this before assuming a slot's content from an earlier session.<br>- [x] At least one clip has a clear fixed reference object (mooring piling on the Marinig clips; bridge pier on the Marikina clip) visible across frames | None |

---

## Phase 1 — CV Track (independent, can run in parallel with Backend/Frontend)

| Ticket ID | Ticket Name | Status | Type | Acceptance Criteria | Dependency |
|---|---|---|---|---|---|
| AGOS-006 | Waterline detection — reference object calibration | Done | CV/ML | - [x] Fixed in-frame reference object identified and marked per clip (`cv/calibrate.py`; see `cv/calibration/*.json` + `*_preview.png`)<br>- [x] OpenCV segmentation isolates waterline pixel band (`cv/detect_waterline.py`, HSV color-distance scan within a narrow column)<br>- [x] Calibration scale (pixels → relative level) documented (`px_per_cm` in each calibration JSON, with assumed-vs-measured flagged explicitly) | AGOS-005 |
| AGOS-007 | Relative water-level estimation output | Done | CV/ML | - [x] Script outputs a relative water-level value per frame/clip (`cv/output/<clip>/readings.csv`)<br>- [x] Output validated by eye against 2+ clips for plausibility (`flood_1` vs `flood_2` — same physical piling, independently calibrated per camera framing; water level plausibly rises between the two real recorded observations)<br>- [x] Explicitly logged as a POC estimate, not a trained model (`summary.json`'s `"trained_model": false`, and printed in every annotated frame) | AGOS-006 |
| AGOS-008 | Package CV POC output for demo | For Review | CV/ML | - [x] Before/after annotated frames exported (waterline + reference line drawn) — see `cv/output/*/frames/`<br>- [x] Sample output values ready to reference in dashboard/pitch — see `cv/output/*/summary.json` and `cv/README.md`'s results table<br>- [ ] Short clip or GIF ready for live/backup demo — still to do, see `cv/README.md` known-limitations note on the Marikina clip's jitter first | AGOS-007 |

---

## Phase 2 — Backend Track

| Ticket ID | Ticket Name | Status | Type | Acceptance Criteria | Dependency |
|---|---|---|---|---|---|
| AGOS-009 | Backend service scaffolding (FastAPI/Flask + SQLite) | Done | Backend | - [x] Service runs locally with a health-check route<br>- [x] SQLite (or local file store) connected<br>- [x] Project follows AGOS-003 contract structure | AGOS-001, AGOS-003 |
| AGOS-010 | Seed database with synthetic dataset | Done | Backend | - [x] AGOS-004 dataset loaded into DB on startup<br>- [x] Data queryable via a basic script/shell check | AGOS-004, AGOS-009 |
| AGOS-011 | Endpoint: flagged streets & risk score | Done | Backend | - [x] Returns list of flagged streets with a rainfall-fusion sample risk score<br>- [x] Risk score derived from static/sample rainfall input, not live feed<br>- [x] Matches AGOS-003 contract | AGOS-010 |
| AGOS-012 | Endpoint: ranked household risk list | Done | Backend | - [x] Returns ranked households for a given street<br>- [x] Ranking uses elevation/ground-floor fields, human-reviewable (not a black-box score alone)<br>- [x] Matches AGOS-003 contract | AGOS-010 |
| AGOS-013 | Endpoint: mark household as flooded/affected | Done | Backend | - [x] Accepts household ID + affected status during a simulated event<br>- [x] Persists status change<br>- [x] Returns updated household record | AGOS-012 |
| AGOS-014 | Endpoint: post-flood recovery-priority record | Done | Backend | - [x] Returns same household list annotated with actual affected status<br>- [x] Sorts/flags households that were both predicted at-risk and confirmed affected<br>- [x] Demonstrates closing-the-loop transformation from AGOS-012's list | AGOS-013 |
| AGOS-015 | Endpoint: generate mock alert payload | Done | Backend | - [x] Returns flagged street, household list, and a suggested still-passable evacuation route<br>- [x] Formatted as what a barangay DRRMO/resident would receive | AGOS-011, AGOS-012 |

---

## Phase 3 — Frontend Track

| Ticket ID | Ticket Name | Status | Type | Acceptance Criteria | Dependency |
|---|---|---|---|---|---|
| AGOS-016 | Dashboard app scaffolding & routing | Done | Frontend | - [x] App runs locally with routes for: streets, household list, alert view, recovery view<br>- [x] Base layout/nav in place | AGOS-001, AGOS-003 |
| AGOS-017 | View: flagged street list & risk score | Done | Frontend | - [x] Displays flagged streets with sample rainfall-fusion risk score from AGOS-011<br>- [x] Selecting a street navigates to its household list | AGOS-011, AGOS-016 |
| AGOS-018 | View: household risk list | Done | Frontend | - [x] Displays ranked household list from AGOS-012 for a selected street<br>- [x] Shows elevation/ground-floor basis for ranking, not just a raw score | AGOS-012, AGOS-016 |
| AGOS-019 | Interaction: "mark as flooded/affected" action | Done | Frontend | - [x] User can mark a household as flooded/affected during a simulated event<br>- [x] Calls AGOS-013 and reflects updated state in UI immediately | AGOS-013, AGOS-018 |
| AGOS-020 | View: post-flood recovery-priority record (closing the loop) | Done | Frontend | - [x] Displays AGOS-014's annotated household list as the post-flood recovery view<br>- [x] Visually distinguishes "predicted + confirmed affected" households<br>- [x] Clear before/after framing showing the same list evolving across the event | AGOS-014, AGOS-019 |
| AGOS-021 | View: mocked alert output screen | Done | Frontend | - [x] Renders AGOS-015's alert payload as a barangay DRRMO/resident-facing mock screen<br>- [x] Includes flagged street, household list, and evacuation route | AGOS-015, AGOS-016 |

---

## Phase 4 — Integration & Demo Readiness

| Ticket ID | Ticket Name | Status | Type | Acceptance Criteria | Dependency |
|---|---|---|---|---|---|
| AGOS-022 | System architecture diagram | Blocked | Docs | - [ ] Diagram foregrounds the closing-the-loop mechanic (pre-flood list feeding post-flood record), not just the linear 4-stage pipeline<br>- [ ] Reflects actual schema/API shape from AGOS-002/AGOS-003 | AGOS-002 |
| AGOS-023 | End-to-end walkthrough test of closing-the-loop flow | Blocked | QA | - [ ] Full flow tested: flagged street → household list → mark affected → recovery record → alert view<br>- [ ] No broken states between views<br>- [ ] Known bugs logged as new tickets | AGOS-017, AGOS-018, AGOS-019, AGOS-020, AGOS-021 |
| AGOS-024 | Demo script — judge walkthrough | Blocked | Docs | - [ ] Step-by-step click path written for the live demo<br>- [ ] Explicitly covers the closing-the-loop moment as the centerpiece<br>- [ ] Reviewed by all 4 team members | AGOS-023 |
| AGOS-025 | Demo rehearsal & bug fixes | Blocked | QA | - [ ] Full demo rehearsed at least twice against AGOS-024 script<br>- [ ] Any breakage found during rehearsal fixed or worked around<br>- [ ] Backup plan noted for any live-demo failure point (e.g. CV clip as fallback) | AGOS-024 |

---

## Summary flow

```
AGOS-001/002/005 (foundation, parallel)
        │
        ├── AGOS-003 (API contract) ──┬── AGOS-009→010→011/012→013→014→015 (backend)
        │                             └── AGOS-016→017/018→019→020/021 (frontend)
        │
        ├── AGOS-004 (dataset) ───────┘
        │
        └── AGOS-006→007→008 (CV POC, independent track)

AGOS-002 ── AGOS-022 (architecture diagram, can draft early, finalize late)

AGOS-017/018/019/020/021 ── AGOS-023 (E2E test) ── AGOS-024 (demo script) ── AGOS-025 (rehearsal)
```
