"""
R.A.A.H. — Autonomous Pothole Intelligence System
FastAPI Main Application Entry Point
"""
import os
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import traceback
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import datetime

from config import settings
from database.connection import engine
from database.models import Base

# Import all routers
from auth.router import router as auth_router
from ai_service.router import router as ai_router
from citizen_service.router import router as citizen_router
from map_service.router import router as map_router
from complaint_service.router import router as complaint_router
from analytics_service.router import router as analytics_router
from admin_service.router import router as admin_router
from prediction_service.router import router as prediction_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    Base.metadata.create_all(bind=engine)

    # Ensure upload dir exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    print("✅ R.A.A.H. Backend started")
    yield
    print("👋 R.A.A.H. Backend shutting down")


app = FastAPI(
    title="R.A.A.H. — Autonomous Pothole Intelligence System",
    description="Production backend for AI-powered road pothole detection and complaint management.",
    version="1.0.0",
    lifespan=lifespan,
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    with open("error.log", "a") as f:
        f.write(f"\n\n[GLOBAL ERROR] at {datetime.datetime.now()}:\n")
        f.write(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
    )

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files (uploaded images)
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# API Routes
prefix = "/api"
app.include_router(auth_router, prefix=prefix)
app.include_router(ai_router, prefix=prefix)
app.include_router(citizen_router, prefix=prefix)
app.include_router(map_router, prefix=prefix)
app.include_router(complaint_router, prefix=prefix)
app.include_router(analytics_router, prefix=prefix)
app.include_router(admin_router, prefix=prefix)
app.include_router(prediction_router, prefix=prefix)


@app.get("/")
def health():
    return {
        "status": "online",
        "system": "R.A.A.H. Autonomous Pothole Intelligence System",
        "version": "1.0.0",
        "ai_model_enabled": settings.AI_MODEL_ENABLED,
    }


@app.get("/api/health")
def api_health():
    return {"status": "ok"}
