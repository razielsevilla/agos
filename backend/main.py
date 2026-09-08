# main.py — AGOS FastAPI application entry point (AGOS-009)
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

# Allow the local Vite dev server (port 5173) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(streets.router, prefix="/api")
app.include_router(households.router, prefix="/api")


@app.get("/api/health", tags=["health"])
def health_check():
    """Liveness check — returns 200 when the service is up."""
    return {"status": "ok", "service": "agos-api"}
