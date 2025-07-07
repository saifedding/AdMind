from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, TYPE_CHECKING, Dict
from datetime import datetime
import logging
from pydantic import BaseModel, Field
import uuid
import json

from app.database import get_db
from app.models.dto.ad_dto import (
    PaginatedAdResponseDTO,
    AdDetailResponseDTO,
    AdFilterParams,
    AdStatsResponseDTO,
    AdResponseDTO
)
from app.models import Ad, TaskStatus, Competitor
from app.services.facebook_ads_scraper import FacebookAdsScraperService, FacebookAdsScraperConfig
from app.services.ingestion_service import DataIngestionService
from app.services.enhanced_ad_extraction import EnhancedAdExtractionService

# Import Celery tasks
from app.tasks.basic_tasks import add_together, test_task, long_running_task
from app.tasks.facebook_ads_scraper_task import scrape_facebook_ads_task, scrape_competitor_ads_task
from app.tasks.ai_analysis_tasks import ai_analysis_task, batch_ai_analysis_task

# Use TYPE_CHECKING to avoid circular imports
if TYPE_CHECKING:
    from app.services.ad_service import AdService

router = APIRouter()
logger = logging.getLogger(__name__)

# ========================================
# Request/Response Models
# ========================================

class BulkDeleteRequest(BaseModel):
    ad_ids: List[int]

class TaskResponse(BaseModel):
    task_id: str
    status: str
    message: str

class FacebookAdsScraperRequest(BaseModel):
    """
    Request model for scraping Facebook ads.
    """
    view_all_page_id: Optional[str] = "1591077094491398"
    countries: Optional[List[str]] = ["AE"]
    max_pages: Optional[int] = 10
    delay_between_requests: Optional[int] = 1
    active_status: Optional[str] = "active"
    ad_type: Optional[str] = "ALL"
    media_type: Optional[str] = "all"
    search_type: Optional[str] = "page"
    query_string: Optional[str] = ""
    save_json: Optional[bool] = False

class CompetitorAdsScraperRequest(BaseModel):
    """
    Request model for scraping ads from a specific competitor page.
    """
    competitor_page_id: str
    countries: Optional[List[str]] = ["AE"]
    max_pages: Optional[int] = 5
    delay_between_requests: Optional[int] = 1
    active_status: Optional[str] = "active"
    ad_type: Optional[str] = "ALL"
    media_type: Optional[str] = "all"
    save_json: Optional[bool] = False

class AddNumbersRequest(BaseModel):
    x: int
    y: int

class TestTaskRequest(BaseModel):
    message: Optional[str] = "Hello from API!"

class ReprocessAdsRequest(BaseModel):
    """
    Request model for reprocessing ads
    
    ad_ids: Optional list of ad IDs to reprocess. If None, all ads with raw data will be reprocessed.
    """
    ad_ids: Optional[List[str]] = None

class DeleteAllAdsResponse(BaseModel):
    message: str
    deleted_count: int

# Dependency factory to avoid circular imports
def get_ad_service_dependency(db: Session = Depends(get_db)) -> "AdService":
    """Factory function to create AdService instance for dependency injection."""
    from app.services.ad_service import AdService
    return AdService(db)

# ========================================
# Main Dashboard API Endpoints
# ========================================

@router.get("/ads", response_model=PaginatedAdResponseDTO)
async def get_ads(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of items per page"),
    competitor_id: Optional[int] = Query(None, description="Filter by competitor ID"),
    competitor_name: Optional[str] = Query(None, description="Filter by competitor name"),
    media_type: Optional[str] = Query(None, description="Filter by media type"),
    has_analysis: Optional[bool] = Query(None, description="Filter by analysis availability"),
    min_hook_score: Optional[float] = Query(None, ge=0, le=10, description="Minimum hook score"),
    max_hook_score: Optional[float] = Query(None, ge=0, le=10, description="Maximum hook score"),
    min_overall_score: Optional[float] = Query(None, ge=0, le=10, description="Minimum overall score"),
    max_overall_score: Optional[float] = Query(None, ge=0, le=10, description="Maximum overall score"),
    date_from: Optional[datetime] = Query(None, description="Filter ads from this date"),
    date_to: Optional[datetime] = Query(None, description="Filter ads to this date"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search in ad copy and titles"),
    sort_by: Optional[str] = Query("created_at", description="Sort by field"),
    sort_order: Optional[str] = Query("desc", description="Sort order (asc/desc)"),
    ad_service: "AdService" = Depends(get_ad_service_dependency)
) -> PaginatedAdResponseDTO:
    """
    Get paginated and filtered ads with AI analysis data.
    
    This is the main endpoint for the dashboard to fetch ads with comprehensive
    filtering, pagination, and sorting capabilities.
    """
    try:
        # Create filter parameters
        filters = AdFilterParams(
            page=page,
            page_size=page_size,
            competitor_id=competitor_id,
            competitor_name=competitor_name,
            media_type=media_type,
            has_analysis=has_analysis,
            min_hook_score=min_hook_score,
            max_hook_score=max_hook_score,
            min_overall_score=min_overall_score,
            max_overall_score=max_overall_score,
            date_from=date_from,
            date_to=date_to,
            is_active=is_active,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        # Get ads using service
        result = ad_service.get_ads(filters)
        
        logger.info(f"Retrieved {len(result.data)} ads for page {page}")
        return result
        
    except Exception as e:
        logger.error(f"Error fetching ads: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching ads: {str(e)}")

@router.get("/ads/{ad_id}", response_model=AdDetailResponseDTO)
async def get_ad(
    ad_id: int, 
    ad_service: "AdService" = Depends(get_ad_service_dependency)
):
    """
    Get detailed information for a specific ad including AI analysis.
    """
    try:
        ad = ad_service.get_ad_by_id(ad_id)
        
        if not ad:
            raise HTTPException(status_code=404, detail="Ad not found")
        
        return ad
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching ad: {str(e)}")

@router.get("/ads/stats/overview", response_model=AdStatsResponseDTO)
async def get_ads_stats(
    ad_service: "AdService" = Depends(get_ad_service_dependency)
):
    """
    Get comprehensive statistics about ads and analysis for the dashboard.
    """
    try:
        stats = ad_service.get_ad_stats()
        return stats
        
    except Exception as e:
        logger.error(f"Error fetching ad stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching ad stats: {str(e)}")

@router.get("/ads/search", response_model=List[AdResponseDTO])
async def search_ads(
    q: str = Query(..., description="Search query"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results"),
    ad_service: "AdService" = Depends(get_ad_service_dependency)
):
    """
    Search ads by text content in ad copy, titles, and page names.
    """
    try:
        results = ad_service.search_ads(q, limit)
        return results
        
    except Exception as e:
        logger.error(f"Error searching ads: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error searching ads: {str(e)}")

@router.get("/ads/top-performing", response_model=List[AdResponseDTO])
async def get_top_performing_ads(
    limit: int = Query(10, ge=1, le=50, description="Number of top ads to return"),
    ad_service: "AdService" = Depends(get_ad_service_dependency)
):
    """
    Get top performing ads based on AI analysis scores.
    """
    try:
        top_ads = ad_service.get_top_performing_ads(limit)
        return top_ads
        
    except Exception as e:
        logger.error(f"Error fetching top performing ads: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching top performing ads: {str(e)}")

@router.get("/ads/competitor/{competitor_id}", response_model=List[AdResponseDTO])
async def get_competitor_ads(
    competitor_id: int,
    limit: int = Query(50, ge=1, le=100, description="Maximum number of ads to return"),
    ad_service: "AdService" = Depends(get_ad_service_dependency)
):
    """
    Get ads for a specific competitor.
    """
    try:
        ads = ad_service.get_competitor_ads(competitor_id, limit)
        return ads
        
    except Exception as e:
        logger.error(f"Error fetching competitor ads: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching competitor ads: {str(e)}")

@router.delete("/ads/bulk")
async def bulk_delete_ads(
    request: BulkDeleteRequest,
    ad_service: "AdService" = Depends(get_ad_service_dependency)
):
    """
    Delete multiple ads by IDs.
    """
    try:
        if not request.ad_ids:
            raise HTTPException(status_code=400, detail="No ad IDs provided")
        
        deleted_count = ad_service.bulk_delete_ads(request.ad_ids)
        
        return {
            "message": f"Successfully deleted {deleted_count} ads",
            "deleted_count": deleted_count,
            "requested_count": len(request.ad_ids)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error bulk deleting ads: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error bulk deleting ads: {str(e)}")

@router.delete("/ads/{ad_id}")
async def delete_ad(
    ad_id: int,
    ad_service: "AdService" = Depends(get_ad_service_dependency)
):
    """
    Delete an ad by ID.
    """
    try:
        result = ad_service.delete_ad(ad_id)
        logger.info(f"Deleted ad ID {ad_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting ad: {str(e)}")

@router.delete("/ads/all", response_model=DeleteAllAdsResponse)
async def delete_all_ads(
    ad_service: "AdService" = Depends(get_ad_service_dependency)
):
    """
    Delete all ads from the database.
    
    DANGER: This endpoint is for development purposes only!
    It will delete all ads and their analyses from the database.
    """
    try:
        count = ad_service.delete_all_ads()
        return DeleteAllAdsResponse(
            message=f"Successfully deleted all {count} ads",
            deleted_count=count
        )
    except Exception as e:
        logger.error(f"Error deleting all ads: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting all ads: {str(e)}")

# ========================================
# AI Analysis Endpoints
# ========================================

@router.post("/ads/{ad_id}/analyze")
async def trigger_ad_analysis(
    ad_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Manually trigger AI analysis for a specific ad.
    """
    try:
        # Check if ad exists
        ad = db.query(Ad).filter(Ad.id == ad_id).first()
        if not ad:
            raise HTTPException(status_code=404, detail="Ad not found")
        
        # Trigger analysis task
        task = ai_analysis_task.delay(ad_id)
        
        return {
            "message": f"AI analysis triggered for ad {ad_id}",
            "task_id": task.id,
            "ad_id": ad_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering analysis for ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error triggering analysis: {str(e)}")

@router.post("/ads/analyze/batch")
async def trigger_batch_analysis(
    ad_ids: List[int],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Trigger AI analysis for multiple ads.
    """
    try:
        # Validate ad IDs exist
        existing_ads = db.query(Ad.id).filter(Ad.id.in_(ad_ids)).all()
        existing_ad_ids = [ad.id for ad in existing_ads]
        
        if not existing_ad_ids:
            raise HTTPException(status_code=404, detail="No valid ads found")
        
        # Trigger batch analysis
        task = batch_ai_analysis_task.delay(existing_ad_ids)
        
        return {
            "message": f"Batch AI analysis triggered for {len(existing_ad_ids)} ads",
            "task_id": task.id,
            "ad_ids": existing_ad_ids,
            "invalid_ids": list(set(ad_ids) - set(existing_ad_ids))
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering batch analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error triggering batch analysis: {str(e)}")

@router.post("/ads/reprocess", response_model=Dict)
def reprocess_ads_data(
    request: ReprocessAdsRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Reprocess existing ads data with enhanced extraction
    
    This endpoint starts a background task to reprocess ads data that was previously scraped,
    applying the enhanced extraction to structure the data better.
    """
    logger.info(f"Received request to reprocess ads with enhanced extraction")
    
    try:
        # Start background task
        background_tasks.add_task(
            _run_enhanced_reprocessing,
            db=db,
            ad_ids=request.ad_ids
        )
        
        return {
            "success": True,
            "message": "Ads reprocessing task started",
            "ad_count": len(request.ad_ids) if request.ad_ids else "all"
        }
    except Exception as e:
        logger.error(f"Error starting ads reprocessing task: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting reprocessing task: {str(e)}")

async def _run_enhanced_reprocessing(db: Session, ad_ids: Optional[List[str]] = None):
    """
    Background task to reprocess ads with enhanced extraction
    
    Args:
        db: Database session
        ad_ids: Optional list of ad IDs to reprocess. If None, all ads with raw data will be reprocessed.
    """
    logger.info(f"Starting background task for ads reprocessing")
    
    try:
        # Create enhanced extraction service
        enhanced_extraction_service = EnhancedAdExtractionService(db)
        
        # Query ads to reprocess
        query = db.query(Ad)
        
        # Filter by ad_ids if provided
        if ad_ids:
            logger.info(f"Reprocessing specific ads: {ad_ids}")
            query = query.filter(Ad.ad_id.in_(ad_ids))
        else:
            logger.info("Reprocessing all ads with raw data")
            query = query.filter(Ad.raw_data.isnot(None))
        
        # Execute query
        ads = query.all()
        logger.info(f"Found {len(ads)} ads to reprocess")
        
        if not ads:
            logger.warning("No ads found to reprocess")
            return
        
        # Group ads by campaign_id for batch processing
        campaigns = {}
        for ad in ads:
            campaign_id = ad.campaign_id or "unknown"
            if campaign_id not in campaigns:
                campaigns[campaign_id] = []
            campaigns[campaign_id].append(ad)
        
        logger.info(f"Grouped ads into {len(campaigns)} campaigns")
        
        # Process each campaign
        processed_campaigns = 0
        total_processed = 0
        total_updated = 0
        total_errors = 0
        
        for campaign_id, campaign_ads in campaigns.items():
            try:
                # Prepare raw data for enhanced extraction
                raw_responses = []
                for ad in campaign_ads:
                    if ad.raw_data:
                        # Create a mock response structure that the enhanced extractor can process
                        mock_response = {
                            "data": {
                                "ad_library_main": {
                                    "search_results_connection": {
                                        "edges": [
                                            {
                                                "node": {
                                                    "collated_results": [ad.raw_data]
                                                }
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                        raw_responses.append(mock_response)
                    else:
                        logger.warning(f"Ad {ad.ad_id} has no raw data, skipping")
                    
                if not raw_responses:
                    logger.warning(f"No raw data found for campaign {campaign_id}, skipping")
                    continue
                    
                # Process with enhanced extraction
                enhanced_data, stats = enhanced_extraction_service.process_raw_responses(raw_responses)
                
                # Update stats
                processed_campaigns += 1
                total_processed += len(campaign_ads)
                total_updated += stats.get("total_updated", 0)
                total_errors += stats.get("total_errors", 0)
                
                logger.info(f"Processed campaign {campaign_id}: {stats}")
                    
            except Exception as e:
                logger.error(f"Error processing campaign {campaign_id}: {str(e)}")
                total_errors += 1
        
        # Log final stats
        logger.info(f"Reprocessing complete!")
        logger.info(f"Campaigns processed: {processed_campaigns}")
        logger.info(f"Total ads processed: {total_processed}")
        logger.info(f"Total ads updated: {total_updated}")
        logger.info(f"Total errors: {total_errors}")
        
    except Exception as e:
        logger.error(f"Error in reprocessing: {str(e)}")
    finally:
        # Close database session
        db.close()

# ========================================
# Scraping Endpoints (Backward Compatibility)
# ========================================

@router.post("/ads/scrape", response_model=Dict)
def scrape_facebook_ads(
    request: FacebookAdsScraperRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Endpoint to scrape Facebook Ads Library data
    
    This endpoint will start a background task to scrape Facebook Ads Library data.
    """
    logger.info(f"Received request to scrape Facebook Ads for page: {request.view_all_page_id}")
    
    # Create task ID
    task_id = str(uuid.uuid4())
    
    # Create config from request
    config = {
        "view_all_page_id": request.view_all_page_id,
        "countries": request.countries,
        "max_pages": request.max_pages,
        "delay_between_requests": request.delay_between_requests,
        "active_status": request.active_status,
        "ad_type": request.ad_type,
        "media_type": request.media_type,
        "search_type": request.search_type,
        "query_string": request.query_string,
        "save_json": request.save_json
    }
    
    # Start background task
    background_tasks.add_task(
        _run_facebook_ads_scraper_task,
        task_id=task_id,
        config=config,
        db=db
    )
    
    return {
        "message": "Facebook Ads scraping task started",
        "task_id": task_id,
        "status": "pending"
    }

@router.post("/ads/scrape/competitor", response_model=Dict)
def scrape_competitor_ads(
    request: CompetitorAdsScraperRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Endpoint to scrape ads from a specific competitor page
    
    This endpoint will start a background task to scrape ads from a specific competitor page.
    """
    logger.info(f"Received request to scrape competitor ads for {request.competitor_page_id}")
    
    # Create task ID
    task_id = str(uuid.uuid4())
    
    # Start background task
    background_tasks.add_task(
        _run_competitor_ads_scraper_task,
        task_id=task_id,
            competitor_page_id=request.competitor_page_id,
            countries=request.countries,
            max_pages=request.max_pages,
        delay_between_requests=request.delay_between_requests,
        active_status=request.active_status,
        ad_type=request.ad_type,
        media_type=request.media_type,
        save_json=request.save_json,
        db=db
    )
    
    return {
        "message": f"Competitor ads scraping task started for {request.competitor_page_id}",
        "task_id": task_id,
        "status": "pending"
    }

@router.get("/ads/scrape/status/{task_id}", response_model=Dict)
def get_scraping_task_status(task_id: str):
    """
    Get the status of a scraping task
    
    This endpoint returns the current status of a Facebook Ads scraping task,
    including progress information and results if the task is complete.
    """
    try:
        # Get task result from Celery
        from celery.result import AsyncResult
        from app.celery_worker import celery_app
        
        task = AsyncResult(task_id, app=celery_app)
        
        # Check if task exists
        if not task:
            logger.error(f"Task {task_id} not found")
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
        
        # Get task state
        state = task.state
        
        # Prepare response
        response = {
            "task_id": task_id,
            "state": state
        }
        
        # Add info based on state
        if state == "PENDING":
            response["status"] = "Task is pending execution"
            
        elif state == "STARTED":
            response["status"] = "Task has started"
            
        elif state == "PROGRESS":
            # Task is in progress, get meta info
            meta = task.info
            response["status"] = meta.get("status", "Task is in progress")
            response["progress"] = {
                "current": meta.get("current", 0),
                "total": meta.get("total", 100)
            }
            
        elif state == "SUCCESS":
            # Task completed successfully
            result = task.result
            
            # Add task result to response
            response["status"] = "Task completed successfully"
            response["result"] = {
                "success": result.get("success", True),
                "total_ads_scraped": result.get("total_ads_scraped", 0),
                "database_stats": result.get("database_stats", {}),
                "completion_time": result.get("completion_time")
            }
            
            # Add scraper config if available
            if "scraper_config" in result:
                response["result"]["scraper_config"] = result["scraper_config"]
            
            # Add competitor info if available
            if "competitor_page_id" in result:
                response["result"]["competitor_page_id"] = result["competitor_page_id"]
            
        elif state == "FAILURE":
            # Task failed
            response["status"] = "Task failed"
            
            # Add error info if available
            if task.info:
                if isinstance(task.info, dict):
                    response["error"] = task.info.get("status", str(task.info))
                else:
                    response["error"] = str(task.info)
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting task status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting task status: {str(e)}")

# ========================================
# Competitors endpoints have been moved to dedicated competitors router
# ========================================

# ========================================
# Testing Endpoints (Backward Compatibility)
# ========================================

@router.post("/test/add", response_model=TaskResponse)
async def test_add_numbers(request: AddNumbersRequest):
    """Test endpoint for adding numbers via Celery task"""
    try:
        task = add_together.delay(request.x, request.y)
        return TaskResponse(
            task_id=task.id,
            status="started",
            message=f"Addition task started: {request.x} + {request.y}"
        )
    except Exception as e:
        logger.error(f"Error starting addition task: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting addition task: {str(e)}")

@router.post("/test/task", response_model=TaskResponse)
async def test_celery_task(request: TestTaskRequest):
    """Test endpoint for basic Celery task"""
    try:
        task = test_task.delay(request.message)
        return TaskResponse(
            task_id=task.id,
            status="started",
            message="Test task started successfully"
        )
    except Exception as e:
        logger.error(f"Error starting test task: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting test task: {str(e)}")

@router.get("/test/task/{task_id}", response_model=None)
async def get_task_status(task_id: str):
    """Get the status of any Celery task"""
    try:
        from celery.result import AsyncResult
        from app.celery_worker import celery_app
        
        task_result = AsyncResult(task_id, app=celery_app)
        
        if task_result.state == 'PENDING':
            response = {
                'task_id': task_id,
                'state': task_result.state,
                'status': 'Task is pending...'
            }
        elif task_result.state == 'SUCCESS':
            response = {
                'task_id': task_id,
                'state': task_result.state,
                'result': task_result.result,
                'status': 'Task completed successfully'
            }
        elif task_result.state == 'FAILURE':
            response = {
                'task_id': task_id,
                'state': task_result.state,
                'error': str(task_result.info),
                'status': 'Task failed'
            }
        else:
            response = {
                'task_id': task_id,
                'state': task_result.state,
                'info': task_result.info,
                'status': f'Task is {task_result.state.lower()}'
            }
        
        return response
        
    except Exception as e:
        logger.error(f"Error fetching task status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching task status: {str(e)}") 

def _run_facebook_ads_scraper_task(
    task_id: str,
    config: Dict,
    db: Session
):
    """Run Facebook Ads scraper task in the background"""
    try:
        # Create scraper service
        scraper = FacebookAdsScraperService(db)
        
        # Create configuration
        scraper_config = FacebookAdsScraperConfig(**config)
        
        # Scrape ads
        all_ads_data, all_json_responses, enhanced_data, stats = scraper.scrape_ads(scraper_config)
        
        # Save to database if requested
        if scraper_config.save_json and all_json_responses:
            # Save raw JSON responses to file
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"facebook_ads_{scraper_config.view_all_page_id}_{timestamp}.json"
            with open(filename, "w") as f:
                json.dump(all_json_responses, f)
            logger.info(f"Saved raw JSON responses to {filename}")
        
        # Update task status
        task_status = TaskStatus(
            task_id=task_id,
            status="completed",
            result={
                "stats": stats,
                "enhanced_data_summary": {
                    "advertiser_info": enhanced_data.get("advertiser_info", {}),
                    "campaigns_count": len(enhanced_data.get("campaigns", [])),
                    "total_ads": sum(len(c.get("ads", [])) for c in enhanced_data.get("campaigns", []))
                }
            }
        )
        db.add(task_status)
        db.commit()
        
    except Exception as e:
        logger.error(f"Error in Facebook Ads scraping task: {str(e)}")
        # Update task status with error
        task_status = TaskStatus(
            task_id=task_id,
            status="failed",
            result={"error": str(e)}
        )
        db.add(task_status)
        db.commit()

def _run_competitor_ads_scraper_task(
    task_id: str,
    competitor_page_id: str,
    countries: List[str],
    max_pages: int,
    delay_between_requests: int,
    active_status: str,
    ad_type: str,
    media_type: str,
    save_json: bool,
    db: Session
):
    """Run competitor ads scraper task in the background"""
    try:
        # Create scraper service
        scraper = FacebookAdsScraperService(db)
        
        # Get competitor
        competitor = db.query(Competitor).filter_by(page_id=competitor_page_id).first()
        if not competitor:
            # Don't create new competitor, exit early
            logger.warning(f"Competitor with page_id {competitor_page_id} not found, skipping scraping")
            # Update task status with warning
            task_status = TaskStatus(
                task_id=task_id,
                status="completed",
                result={"warning": f"Competitor with page_id {competitor_page_id} not found, skipping scraping"}
            )
            db.add(task_status)
            db.commit()
            return
        
        # Create configuration
        scraper_config = FacebookAdsScraperConfig(
            view_all_page_id=competitor_page_id,
            countries=countries,
            max_pages=max_pages,
            delay_between_requests=delay_between_requests,
            active_status=active_status,
            ad_type=ad_type,
            media_type=media_type,
            save_json=save_json
        )
        
        # Scrape ads
        all_ads_data, all_json_responses, enhanced_data, stats = scraper.scrape_ads(scraper_config)
        
        # Save to database if requested
        if scraper_config.save_json and all_json_responses:
            # Save raw JSON responses to file
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"competitor_ads_{competitor_page_id}_{timestamp}.json"
            with open(filename, "w") as f:
                json.dump(all_json_responses, f)
            logger.info(f"Saved raw JSON responses to {filename}")
        
        # Update task status
        task_status = TaskStatus(
            task_id=task_id,
            status="completed",
            result={
                "competitor_id": competitor.id,
                "competitor_page_id": competitor_page_id,
                "stats": stats,
                "enhanced_data_summary": {
                    "advertiser_info": enhanced_data.get("advertiser_info", {}),
                    "campaigns_count": len(enhanced_data.get("campaigns", [])),
                    "total_ads": sum(len(c.get("ads", [])) for c in enhanced_data.get("campaigns", []))
                }
            }
        )
        db.add(task_status)
        db.commit()
        
    except Exception as e:
        logger.error(f"Error in competitor ads scraping task: {str(e)}")
        # Update task status with error
        task_status = TaskStatus(
            task_id=task_id,
            status="failed",
            result={"error": str(e)}
        )
        db.add(task_status)
        db.commit() 