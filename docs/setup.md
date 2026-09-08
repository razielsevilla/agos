# AGOS — Local Setup (Hackathon MVP)

Referenced by: `tickets.md` (AGOS-001), `README.md`. This describes the setup that AGOS-001 (repo & dev environment scaffolding) should produce — follow it when scaffolding the repo, and keep it updated if the actual structure diverges.

## Prerequisites

- Python 3.10+
- Node.js 18+ (only needed if the dashboard is built with React; skip if plain HTML/JS)
- `pip` and `npm` available on PATH
- SQLite (bundled with Python — no separate install needed)

## Planned repo structure

```
agos/
├── backend/   # FastAPI/Flask service — risk scoring, household ranking, alert endpoints
├── frontend/  # Dashboard (React or plain HTML/JS) — flagged streets, household list, closing-the-loop views
├── cv/        # OpenCV waterline detection POC
├── data/      # Illustrative/synthetic seed data (streets, households, flood events)
└── docs/      # Proposal, planning, and reference docs
```

## Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python seed.py                   # loads data/ seed files into local SQLite per data-model.md
uvicorn main:app --reload --port 8000
```

Confirm it's running: `GET http://localhost:8000/api/streets` should return the seeded streets (see `api-contract.md`).

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Confirm it's running: the dashboard should load in the browser and show the flagged street(s) from the backend.

If the dashboard is plain HTML/JS instead of a framework, skip `npm` and just open `frontend/index.html` (with the backend running, since it fetches from `http://localhost:8000/api`).

## CV POC setup

```bash
cd cv
pip install -r requirements.txt   # opencv-python, numpy
python detect_waterline.py --input sample-footage/<clip>.mp4
```

Outputs annotated frames/values into `cv/output/` — this is the packaged evidence referenced in `demo-script.md` and `docs/tickets.md` (AGOS-008).

## Environment variables

None required for the hackathon build — SQLite is a local file, there's no external API key or auth secret in scope (see `scope.md`). A pilot deployment would introduce config for a real database connection string, PAGASA API access, and CDRRMO alert-channel credentials at this point.

## Verifying everything works end-to-end

- [ ] `GET /api/streets` returns seeded streets, including one already `flagged`
- [ ] Dashboard loads and shows that flagged street
- [ ] Clicking into the street shows its ranked household list
- [ ] Marking a household as `confirmed_affected` updates the UI and is reflected in `GET /streets/{id}/recovery-record`
- [ ] The mock alert view renders without errors
- [ ] The CV script runs against at least one sample clip and produces annotated output

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Frontend shows no streets | Backend not running, or seed step (`python seed.py`) wasn't run |
| `CORS` error in browser console | Backend needs CORS middleware enabled for the frontend's local port |
| CV script errors on import | `opencv-python` not installed in the active virtualenv |
| Household list doesn't re-sort after marking affected | Recovery-record endpoint sorting logic not applied — check `api-contract.md` for the expected order |
