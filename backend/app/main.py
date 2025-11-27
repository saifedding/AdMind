from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
from pathlib import Path
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import configuration
from app.core.config import settings

# Import routers
from app.routers import health, ads, competitors, daily_scraping, favorites, settings as settings_router
from app.api import internal_router

# Database imports
from app.database import engine, Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    pass

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="A comprehensive API for managing Facebook Ads data with AI-powered analysis",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for saved media
media_storage_path = Path("backend/media_storage")
media_storage_path.mkdir(parents=True, exist_ok=True)
app.mount("/media_storage", StaticFiles(directory=str(media_storage_path)), name="media_storage")

# Mount merged videos directory
merged_videos_path = Path("media")
merged_videos_path.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(merged_videos_path)), name="media")

# Include routers
app.include_router(health.router, prefix=settings.API_V1_PREFIX, tags=["health"])
app.include_router(ads.router, prefix=settings.API_V1_PREFIX, tags=["ads"])
app.include_router(competitors.router, prefix=f"{settings.API_V1_PREFIX}/competitors", tags=["competitors"])
app.include_router(daily_scraping.router, prefix=f"{settings.API_V1_PREFIX}/scraping", tags=["daily-scraping"])
app.include_router(settings_router.router, prefix=f"{settings.API_V1_PREFIX}/settings", tags=["settings"])
app.include_router(internal_router, prefix=settings.API_V1_PREFIX, tags=["internal"])
app.include_router(favorites.router, tags=["favorites"])

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
        "health": f"{settings.API_V1_PREFIX}/health"
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    ) 
