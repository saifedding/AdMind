from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
from pydantic import BaseModel, Field
from datetime import datetime, timedelta

from app.database import get_db
from app.models.competitor import Competitor
from app.tasks.daily_ads_scraper import scrape_new_ads_daily_task, scrape_specific_competitors_task
from app.celery_worker import celery_app

router = APIRouter()
logger = logging.getLogger(__name__)

# ========================================
# Request/Response Models
# ========================================

class DailyScrapeRequest(BaseModel):
    """Request model for daily ads scraping"""
    countries: Optional[List[str]] = ["AE", "US", "UK"]
    max_pages_per_competitor: Optional[int] = 3
    delay_between_requests: Optional[int] = 2
    hours_lookback: Optional[int] = 24
    days_lookback: Optional[int] = None  # New parameter for days-based lookback
    min_duration_days: Optional[int] = Field(None, ge=1, description="Minimum days running filter (must be >= 1)")
    active_status: Optional[str] = "active"

class SpecificCompetitorsScrapeRequest(BaseModel):
    """Request model for specific competitors scraping"""
    competitor_ids: List[int]
    countries: Optional[List[str]] = ["AE", "US", "UK"]
    max_pages_per_competitor: Optional[int] = 3
    delay_between_requests: Optional[int] = 2
    days_lookback: Optional[int] = None  # New parameter for days-based lookback
    min_duration_days: Optional[int] = Field(None, ge=1, description="Minimum days running filter (must be >= 1)")
    active_status: Optional[str] = "active"

class TaskResponse(BaseModel):
    """Response model for task operations"""
    task_id: str
    status: str
    message: str
    started_at: str

class TaskStatusResponse(BaseModel):
    """Response model for task status"""
    task_id: str
    state: str
    result: Optional[dict] = None
    info: Optional[dict] = None
    error: Optional[str] = None

# ========================================
# Daily Scraping Endpoints
# ========================================

@router.post("/daily/start", response_model=TaskResponse)
async def start_daily_scraping(
    scrape_request: DailyScrapeRequest,
    db: Session = Depends(get_db)
) -> TaskResponse:
    """
    Start daily scraping for new ads from all active competitors.
    
    This will:
    1. Find all active competitors
    2. For each competitor, scrape new ads since last scraping
    3. Process and save ads to database
    4. Return task ID for monitoring progress
    """
    try:
        # Check if there are any active competitors
        active_count = db.query(Competitor).filter(
            Competitor.is_active == True
        ).count()
        
        if active_count == 0:
            raise HTTPException(
                status_code=400,
                detail="No active competitors found. Please add some competitors first."
            )
        
        # Calculate hours_lookback from days if provided
        hours_lookback = scrape_request.hours_lookback
        if scrape_request.days_lookback is not None:
            hours_lookback = scrape_request.days_lookback * 24
        
        # Start the daily scraping task
        task = scrape_new_ads_daily_task.delay(
            countries=scrape_request.countries,
            max_pages_per_competitor=scrape_request.max_pages_per_competitor,
            delay_between_requests=scrape_request.delay_between_requests,
            hours_lookback=hours_lookback,
            min_duration_days=scrape_request.min_duration_days,
            active_status=scrape_request.active_status
        )
        
        logger.info(f"Started daily ads scraping task with ID: {task.id}")
        
        return TaskResponse(
            task_id=task.id,
            status="started",
            message=f"Daily ads scraping started for {active_count} active competitors",
            started_at=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting daily scraping: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting daily scraping: {str(e)}")

@router.post("/competitors/scrape", response_model=TaskResponse)
async def start_specific_competitors_scraping(
    scrape_request: SpecificCompetitorsScrapeRequest,
    db: Session = Depends(get_db)
) -> TaskResponse:
    """
    Start scraping for specific competitors.
    
    This will:
    1. Validate that the specified competitors exist and are active
    2. Scrape ads from those competitors
    3. Return task ID for monitoring progress
    """
    try:
        # Validate that competitors exist and are active
        valid_competitors = db.query(Competitor).filter(
            Competitor.id.in_(scrape_request.competitor_ids),
            Competitor.is_active == True
        ).all()
        
        if not valid_competitors:
            raise HTTPException(
                status_code=400,
                detail="No active competitors found with the specified IDs"
            )
        
        if len(valid_competitors) < len(scrape_request.competitor_ids):
            valid_ids = [c.id for c in valid_competitors]
            invalid_ids = [id for id in scrape_request.competitor_ids if id not in valid_ids]
            logger.warning(f"Some competitor IDs are invalid or inactive: {invalid_ids}")
        
        # Calculate hours_lookback from days if provided (default to 24 hours)
        hours_lookback = 24
        if scrape_request.days_lookback is not None:
            hours_lookback = scrape_request.days_lookback * 24
        
        # Start the specific competitors scraping task
        task = scrape_specific_competitors_task.delay(
            competitor_ids=scrape_request.competitor_ids,
            countries=scrape_request.countries,
            max_pages_per_competitor=scrape_request.max_pages_per_competitor,
            delay_between_requests=scrape_request.delay_between_requests,
            hours_lookback=hours_lookback,
            min_duration_days=scrape_request.min_duration_days,
            active_status=scrape_request.active_status
        )
        
        logger.info(f"Started specific competitors scraping task with ID: {task.id}")
        
        return TaskResponse(
            task_id=task.id,
            status="started",
            message=f"Scraping started for {len(valid_competitors)} competitors",
            started_at=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting specific competitors scraping: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting scraping: {str(e)}")

@router.get("/tasks/{task_id}/status", response_model=TaskStatusResponse)
async def get_scraping_task_status(task_id: str) -> TaskStatusResponse:
    """
    Get the status of a scraping task.
    
    Returns current task state and results if completed.
    """
    try:
        # Get task result from Celery
        task_result = celery_app.AsyncResult(task_id)
        
        if task_result.state == 'PENDING':
            response = TaskStatusResponse(
                task_id=task_id,
                state=task_result.state,
                info={"status": "Task is waiting to be processed"}
            )
        elif task_result.state == 'PROGRESS':
            response = TaskStatusResponse(
                task_id=task_id,
                state=task_result.state,
                info=task_result.info
            )
        elif task_result.state == 'SUCCESS':
            response = TaskStatusResponse(
                task_id=task_id,
                state=task_result.state,
                result=task_result.result
            )
        else:
            # Task failed or in error state
            response = TaskStatusResponse(
                task_id=task_id,
                state=task_result.state,
                error=str(task_result.info)
            )
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting task status for {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting task status: {str(e)}")

@router.get("/active-competitors")
async def get_active_competitors_summary(db: Session = Depends(get_db)):
    """
    Get summary of active competitors that will be processed in daily scraping.
    """
    try:
        active_competitors = db.query(Competitor).filter(
            Competitor.is_active == True
        ).all()
        
        competitors_data = []
        for competitor in active_competitors:
            # Get latest ad date for this competitor
            from app.models.ad import Ad
            latest_ad = db.query(Ad).filter(
                Ad.competitor_id == competitor.id
            ).order_by(Ad.created_at.desc()).first()
            
            competitors_data.append({
                "id": competitor.id,
                "name": competitor.name,
                "page_id": competitor.page_id,
                "latest_ad_date": latest_ad.created_at.isoformat() if latest_ad else None,
                "created_at": competitor.created_at.isoformat(),
                "updated_at": competitor.updated_at.isoformat()
            })
        
        return {
            "total_active_competitors": len(active_competitors),
            "competitors": competitors_data,
            "message": f"Found {len(active_competitors)} active competitors ready for scraping"
        }
        
    except Exception as e:
        logger.error(f"Error getting active competitors: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting active competitors: {str(e)}")

# ========================================
# Task Management Endpoints
# ========================================

@router.get("/tasks/active")
async def get_active_scraping_tasks():
    """
    Get list of currently active scraping tasks.
    """
    try:
        # Get active tasks from Celery
        inspect = celery_app.control.inspect()
        active_tasks = inspect.active()
        
        if not active_tasks:
            return {
                "active_tasks": [],
                "message": "No active scraping tasks found"
            }
        
        # Filter for scraping tasks only
        scraping_tasks = []
        for worker, tasks in active_tasks.items():
            for task in tasks:
                if task['name'] in ['daily_ads_scraper.scrape_new_ads_daily', 
                                   'daily_ads_scraper.scrape_specific_competitors',
                                   'facebook_ads_scraper.scrape_competitor_ads']:
                    scraping_tasks.append({
                        "task_id": task['id'],
                        "task_name": task['name'],
                        "worker": worker,
                        "args": task.get('args', []),
                        "kwargs": task.get('kwargs', {})
                    })
        
        return {
            "active_tasks": scraping_tasks,
            "total_active": len(scraping_tasks)
        }
        
    except Exception as e:
        logger.error(f"Error getting active tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting active tasks: {str(e)}")

@router.delete("/tasks/{task_id}/cancel")
async def cancel_scraping_task(task_id: str):
    """
    Cancel a running scraping task.
    """
    try:
        # Revoke the task
        celery_app.control.revoke(task_id, terminate=True)
        
        logger.info(f"Cancelled scraping task: {task_id}")
        
        return {
            "message": f"Task {task_id} has been cancelled",
            "task_id": task_id,
            "cancelled_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error cancelling task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error cancelling task: {str(e)}")

@router.get("/tasks/{task_id}/ads")
async def get_ads_found_by_task(
    task_id: str,
    db: Session = Depends(get_db)
):
    """
    Get the ads that were found/created by a specific scraping task.
    
    This endpoint looks for ads created in the last hour and returns them
    with pagination support.
    """
    try:
        from app.models.ad import Ad
        from app.models.competitor import Competitor
        
        # Get ads created in the last hour (assuming task completed recently)
        # In a production system, you might want to store task_id with each ad
        recent_ads = db.query(Ad).join(Competitor).filter(
            Ad.created_at >= datetime.utcnow() - timedelta(hours=1),
            Competitor.is_active == True
        ).order_by(Ad.created_at.desc()).limit(100).all()
        
        ads_data = []
        for ad in recent_ads:
            # Extract headline and body from meta or raw_data
            headline = "N/A"
            body = "N/A"
            countries = []
            media_type = "N/A"
            
            if ad.meta:
                headline = ad.meta.get('headline', 'N/A')
                body = ad.meta.get('body', 'N/A')
                countries = ad.meta.get('countries', [])
                media_type = ad.meta.get('media_type', 'N/A')
            elif ad.raw_data:
                headline = ad.raw_data.get('headline', 'N/A')
                body = ad.raw_data.get('body', 'N/A')
                countries = ad.raw_data.get('countries', [])
                media_type = ad.raw_data.get('media_type', 'N/A')
            
            ads_data.append({
                "id": ad.id,
                "ad_archive_id": ad.ad_archive_id,
                "competitor_id": ad.competitor_id,
                "competitor_name": ad.competitor.name if ad.competitor else "Unknown",
                "headline": headline,
                "body": body,
                "created_at": ad.created_at.isoformat(),
                "date_found": ad.date_found.isoformat() if ad.date_found else None,
                "duration_days": ad.duration_days,
                "countries": countries,
                "media_type": media_type,
                "is_favorite": ad.is_favorite
            })
        
        return {
            "task_id": task_id,
            "total_ads": len(ads_data),
            "ads": ads_data,
            "message": f"Found {len(ads_data)} ads created in the last hour"
        }
        
    except Exception as e:
        logger.error(f"Error getting ads for task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting ads: {str(e)}")