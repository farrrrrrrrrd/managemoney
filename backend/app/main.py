"""
ApexAlpha Application Entrypoint
Initializes FastAPI, mounts REST routes, enables CORS, and serves the static frontend.
"""

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.api.routes import router

app = FastAPI(
    title="ApexAlpha // Quantitative Portfolio & Risk Engine SaaS",
    description="Production-grade Modern Portfolio Theory & Monte Carlo Simulation API.",
    version="2.0.0"
)

# Security & CORS Middleware (Allow frontend communication)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(router)

# Mount Frontend Static Directory
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8050, reload=True)
