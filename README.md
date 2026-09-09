# AGOS — Hackathon MVP

## Local Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- `pip` and `npm`

### Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows
.venv\Scripts\activate
# On Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt

# Run the backend
uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### CV POC Setup
```bash
cd cv
# Activate the same virtual environment or create a new one
pip install -r requirements.txt
# Calibrate a camera once, then run detection per clip — see cv/README.md
python calibrate.py --input ../data/videos/<clip>.mp4 --output calibration/<name>.json \
  --point-a x,y --point-b x,y --length-cm N --label "..."
python detect_waterline.py --input ../data/videos/<clip>.mp4 \
  --calibration calibration/<name>.json --scan-column x --scan-range y0,y1 \
  --output-dir output/<clip>
```

See `docs/setup.md` for more complete instructions and `docs/tickets.md` for our current status.
