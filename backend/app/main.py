"""
RIED Application Entrypoint
Initializes FastAPI, mounts REST routes, enables CORS, manages Telegram bot lifecycle,
and serves the static frontend.
"""

from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.api.routes import router
from backend.app.telegram_service import telegram_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Launch Telegram Bot Long-Polling Service
    telegram_service.start()
    yield
    # Shutdown: Gracefully stop Telegram Bot Long-Polling
    await telegram_service.stop()


app = FastAPI(
    title="RIED Financial Studio // Smart Personal Finance & Telegram Bot API",
    description="High-density personal & SME financial management with real-time Telegram integration.",
    version="2.5.0",
    lifespan=lifespan
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
