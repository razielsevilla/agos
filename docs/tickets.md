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
| AGOS-002 | Define data model schema | Ready to Start | Data | - [ ] Household record fields defined (address, street ID, elevation, ground-floor flag, risk score, status)<br>- [ ] Street/camera record fields defined<br>- [ ] Flood event / rainfall record fields defined<br>- [ ] Schema written to `docs/data-model.md` | None |
| AGOS-003 | Define API contract | Blocked | Backend | - [ ] Endpoint list drafted (streets, households, mark-affected, recovery record, alert payload)<br>- [ ] Request/response shapes agreed with frontend dev<br>- [ ] Contract written to `docs/api-contract.md` | AGOS-002 |
| AGOS-004 | Prepare illustrative/synthetic dataset | Blocked | Data | - [ ] Sample streets with rainfall-fusion risk scores<br>- [ ] Sample households per street with elevation/ground-floor data and ranked risk<br>- [ ] Dataset saved as seed file (JSON/CSV) matching AGOS-002 schema | AGOS-002 |
| AGOS-005 | Source sample flood footage for CV POC | Ready to Start | CV/ML | - [ ] 2–3 public/recorded flood or bridge-camera clips or image sequences collected<br>- [ ] At least one clip has a clear fixed reference object (curb, bridge support, staff marking) visible across frames | None |

---

## Phase 1 — CV Track (independent, can run in parallel with Backend/Frontend)

| Ticket ID | Ticket Name | Status | Type | Acceptance Criteria | Dependency |
|---|---|---|---|---|---|
| AGOS-006 | Waterline detection — reference object calibration | Blocked | CV/ML | - [ ] Fixed in-frame reference object identified and marked per clip<br>- [ ] OpenCV segmentation isolates waterline pixel band<br>- [ ] Calibration scale (pixels → relative level) documented | AGOS-005 |
| AGOS-007 | Relative water-level estimation output | Blocked | CV/ML | - [ ] Script outputs a relative water-level value per frame/clip<br>- [ ] Output validated by eye against 2+ clips for plausibility<br>- [ ] Explicitly logged as a POC estimate, not a trained model | AGOS-006 |
| AGOS-008 | Package CV POC output for demo | Blocked | CV/ML | - [ ] Before/after annotated frames exported (waterline + reference line drawn)<br>- [ ] Sample output values ready to reference in dashboard/pitch<br>- [ ] Short clip or GIF ready for live/backup demo | AGOS-007 |

---

## Phase 2 — Backend Track

| Ticket ID | Ticket Name | Status | Type | Acceptance Criteria | Dependency |
|---|---|---|---|---|---|
| AGOS-009 | Backend service scaffolding (FastAPI/Flask + SQLite) | Blocked | Backend | - [ ] Service runs locally with a health-check route<br>- [ ] SQLite (or local file store) connected<br>- [ ] Project follows AGOS-003 contract structure | AGOS-001, AGOS-003 |
| AGOS-010 | Seed database with synthetic dataset | Blocked | Backend | - [ ] AGOS-004 dataset loaded into DB on startup<br>- [ ] Data queryable via a basic script/shell check | AGOS-004, AGOS-009 |
| AGOS-011 | Endpoint: flagged streets & risk score | Blocked | Backend | - [ ] Returns list of flagged streets with a rainfall-fusion sample risk score<br>- [ ] Risk score derived from static/sample rainfall input, not live feed<br>- [ ] Matches AGOS-003 contract | AGOS-010 |
| AGOS-012 | Endpoint: ranked household risk list | Blocked | Backend | - [ ] Returns ranked households for a given street<br>- [ ] Ranking uses elevation/ground-floor fields, human-reviewable (not a black-box score alone)<br>- [ ] Matches AGOS-003 contract | AGOS-010 |
| AGOS-013 | Endpoint: mark household as flooded/affected | Blocked | Backend | - [ ] Accepts household ID + affected status during a simulated event<br>- [ ] Persists status change<br>- [ ] Returns updated household record | AGOS-012 |
| AGOS-014 | Endpoint: post-flood recovery-priority record | Blocked | Backend | - [ ] Returns same household list annotated with actual affected status<br>- [ ] Sorts/flags households that were both predicted at-risk and confirmed affected<br>- [ ] Demonstrates closing-the-loop transformation from AGOS-012's list | AGOS-013 |
| AGOS-015 | Endpoint: generate mock alert payload | Blocked | Backend | - [ ] Returns flagged street, household list, and a suggested still-passable evacuation route<br>- [ ] Formatted as what a barangay DRRMO/resident would receive | AGOS-011, AGOS-012 |

---

## Phase 3 — Frontend Track

| Ticket ID | Ticket Name | Status | Type | Acceptance Criteria | Dependency |
|---|---|---|---|---|---|
| AGOS-016 | Dashboard app scaffolding & routing | Blocked | Frontend | - [ ] App runs locally with routes for: streets, household list, alert view, recovery view<br>- [ ] Base layout/nav in place | AGOS-001, AGOS-003 |
| AGOS-017 | View: flagged street list & risk score | Blocked | Frontend | - [ ] Displays flagged streets with sample rainfall-fusion risk score from AGOS-011<br>- [ ] Selecting a street navigates to its household list | AGOS-011, AGOS-016 |
| AGOS-018 | View: household risk list | Blocked | Frontend | - [ ] Displays ranked household list from AGOS-012 for a selected street<br>- [ ] Shows elevation/ground-floor basis for ranking, not just a raw score | AGOS-012, AGOS-016 |
| AGOS-019 | Interaction: "mark as flooded/affected" action | Blocked | Frontend | - [ ] User can mark a household as flooded/affected during a simulated event<br>- [ ] Calls AGOS-013 and reflects updated state in UI immediately | AGOS-013, AGOS-018 |
| AGOS-020 | View: post-flood recovery-priority record (closing the loop) | Blocked | Frontend | - [ ] Displays AGOS-014's annotated household list as the post-flood recovery view<br>- [ ] Visually distinguishes "predicted + confirmed affected" households<br>- [ ] Clear before/after framing showing the same list evolving across the event | AGOS-014, AGOS-019 |
| AGOS-021 | View: mocked alert output screen | Blocked | Frontend | - [ ] Renders AGOS-015's alert payload as a barangay DRRMO/resident-facing mock screen<br>- [ ] Includes flagged street, household list, and evacuation route | AGOS-015, AGOS-016 |

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
