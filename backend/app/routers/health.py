from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.core.config import settings
import redis
import os
from datetime import datetime

router = APIRouter()

@router.get("/health")
async def health_check():
    """Basic health check endpoint - returns the exact format requested in the prompt"""
    return {"status": "ok"}

@router.get("/health/detailed")
async def detailed_health_check(db: Session = Depends(get_db)):
    """Detailed health check including database and Redis connectivity"""
    health_status = {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "checks": {}
    }
    
    # Check database connectivity
    try:
        db.execute(text("SELECT 1"))
        health_status["checks"]["database"] = {
            "status": "ok", 
            "message": "Database connection successful"
        }
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "error", 
            "message": f"Database connection failed: {str(e)}"
        }
        health_status["status"] = "error"
    
    # Check Redis connectivity
    try:
        redis_client = redis.from_url(settings.REDIS_URL)
        redis_client.ping()
        health_status["checks"]["redis"] = {
            "status": "ok", 
            "message": "Redis connection successful"
        }
    except Exception as e:
        health_status["checks"]["redis"] = {
            "status": "error", 
            "message": f"Redis connection failed: {str(e)}"
        }
        health_status["status"] = "error"
    
    # Check Celery worker connectivity
    try:
        from app.celery_worker import celery_app
        inspect = celery_app.control.inspect()
        stats = inspect.stats()
        if stats:
            health_status["checks"]["celery"] = {
                "status": "ok", 
                "message": "Celery workers are active",
                "active_workers": len(stats)
            }
        else:
            health_status["checks"]["celery"] = {
                "status": "warning", 
                "message": "No active Celery workers found"
            }
    except Exception as e:
        health_status["checks"]["celery"] = {
            "status": "error", 
            "message": f"Celery check failed: {str(e)}"
        }
    
    if health_status["status"] == "error":
        raise HTTPException(status_code=503, detail=health_status)
    
    return health_status 