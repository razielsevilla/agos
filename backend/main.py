# main.py — AGOS FastAPI application entry point (AGOS-009)
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from auth import require_session
from auth import router as auth_router
from database import engine, SessionLocal, Base
from models import Street, Household, FloodEvent  # ensure models are registered
from seed import load_seed
from routers import streets, households


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables then seed on first run
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        load_seed(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="AGOS API",
    description="Flood risk management API for the AGOS hackathon MVP. See docs/api-contract.md.",
    version="0.1.0",
    lifespan=lifespan,
)

# Allow the local Vite dev server to call the API. A regex (rather than a
# fixed port list) is used because Vite auto-increments past 5173 whenever
# that port is already taken (e.g. a second `npm run dev` instance) — a
# fixed allowlist breaks every time that happens.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,  # required for the session cookie to be sent/set cross-origin
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(streets.router, prefix="/api", dependencies=[Depends(require_session)])
app.include_router(households.router, prefix="/api", dependencies=[Depends(require_session)])

app.mount("/videos", StaticFiles(directory="../data/videos"), name="videos")


@app.get("/api/health", tags=["health"])
def health_check():
    """Liveness check — returns 200 when the service is up."""
    return {"status": "ok", "service": "agos-api"}
