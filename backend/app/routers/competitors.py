from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, TYPE_CHECKING
import logging
from pydantic import BaseModel

from app.database import get_db
from app.models.dto.competitor_dto import (
    CompetitorCreateDTO,
    CompetitorUpdateDTO,
    CompetitorResponseDTO,
    CompetitorDetailResponseDTO,
    PaginatedCompetitorResponseDTO,
    CompetitorFilterParams,
    CompetitorStatsResponseDTO
)

# Import tasks for scraping
from app.tasks.facebook_ads_scraper_task import scrape_competitor_ads_task

# Use TYPE_CHECKING to avoid circular imports
if TYPE_CHECKING:
    from app.services.competitor_service import CompetitorService

router = APIRouter()
logger = logging.getLogger(__name__)

# Dependency factory to avoid circular imports
def get_competitor_service_dependency(db: Session = Depends(get_db)) -> "CompetitorService":
    """Factory function to create CompetitorService instance for dependency injection."""
    from app.services.competitor_service import CompetitorService
    return CompetitorService(db)

# ========================================
# Main Competitors CRUD Endpoints
# ========================================

@router.get("/", response_model=PaginatedCompetitorResponseDTO)
async def get_competitors(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=1000, description="Number of items per page"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search in competitor names and page IDs"),
    sort_by: Optional[str] = Query("created_at", description="Sort by field"),
    sort_order: Optional[str] = Query("desc", description="Sort order (asc/desc)"),
    competitor_service: "CompetitorService" = Depends(get_competitor_service_dependency)
) -> PaginatedCompetitorResponseDTO:
    """
    Get paginated and filtered list of competitors.
    
    This endpoint provides comprehensive competitor listing with:
    - Pagination support
    - Search functionality
    - Active/inactive filtering
    - Sorting options
    - Ads count for each competitor
    """
    try:
        # Create filter parameters
        filters = CompetitorFilterParams(
            page=page,
            page_size=page_size,
            is_active=is_active,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        # Get competitors using service
        result = competitor_service.get_competitors(filters)
        
        logger.info(f"Retrieved {len(result.data)} competitors for page {page}")
        return result
        
    except Exception as e:
        logger.error(f"Error fetching competitors: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching competitors: {str(e)}")

@router.get("/{competitor_id}", response_model=CompetitorDetailResponseDTO)
async def get_competitor(
    competitor_id: int,
    competitor_service: "CompetitorService" = Depends(get_competitor_service_dependency)
) -> CompetitorDetailResponseDTO:
    """
    Get detailed information for a specific competitor.
    
    Returns comprehensive competitor data including:
    - Basic competitor information
    - Total ads count
    - Active ads count
    - Analyzed ads count
    """
    try:
        competitor = competitor_service.get_competitor_by_id(competitor_id)
        return competitor
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching competitor {competitor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching competitor: {str(e)}")

@router.post("/", response_model=CompetitorResponseDTO)
async def create_competitor(
    competitor_data: CompetitorCreateDTO,
    competitor_service: "CompetitorService" = Depends(get_competitor_service_dependency)
) -> CompetitorResponseDTO:
    """
    Create a new competitor.
    
    Required fields:
    - name: Competitor name
    - page_id: Facebook page ID (must be unique)
    - is_active: Whether the competitor is active (default: True)
    """
    try:
        competitor = competitor_service.create_competitor(competitor_data)
        logger.info(f"Created new competitor: {competitor.name} (ID: {competitor.id})")
        return competitor
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating competitor: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating competitor: {str(e)}")

@router.put("/{competitor_id}", response_model=CompetitorDetailResponseDTO)
async def update_competitor(
    competitor_id: int,
    competitor_data: CompetitorUpdateDTO,
    competitor_service: "CompetitorService" = Depends(get_competitor_service_dependency)
) -> CompetitorDetailResponseDTO:
    """
    Update an existing competitor.
    
    All fields are optional:
    - name: Competitor name
    - page_id: Facebook page ID (must be unique if changed)
    - is_active: Whether the competitor is active
    """
    try:
        competitor = competitor_service.update_competitor(competitor_id, competitor_data)
        logger.info(f"Updated competitor: {competitor.name} (ID: {competitor.id})")
        return competitor
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating competitor {competitor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating competitor: {str(e)}")

class BulkDeleteRequest(BaseModel):
    competitor_ids: List[int]

@router.delete("/")
async def bulk_delete_competitors(
    request: BulkDeleteRequest,
    competitor_service: "CompetitorService" = Depends(get_competitor_service_dependency)
) -> dict:
    """
    Bulk delete competitors.
    - Soft deletes competitors with ads.
    - Hard deletes competitors without ads.
    """
    try:
        result = competitor_service.bulk_delete_competitors(request.competitor_ids)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during bulk competitor deletion: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred during bulk deletion: {str(e)}")

@router.delete("/{competitor_id}")
async def delete_competitor(
    competitor_id: int,
    competitor_service: "CompetitorService" = Depends(get_competitor_service_dependency)
) -> dict:
    """
    Delete a competitor.
    
    Behavior:
    - If competitor has ads: Soft delete (sets is_active to False)
    - If competitor has no ads: Hard delete (permanent removal)
    """
    try:
        result = competitor_service.delete_competitor(competitor_id)
        logger.info(f"Deleted competitor ID {competitor_id}: {result['message']}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting competitor {competitor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting competitor: {str(e)}")

# ========================================
# Competitors Statistics & Search
# ========================================

@router.get("/stats/overview", response_model=CompetitorStatsResponseDTO)
async def get_competitor_stats(
    competitor_service: "CompetitorService" = Depends(get_competitor_service_dependency)
) -> CompetitorStatsResponseDTO:
    """
    Get comprehensive statistics about competitors.
    
    Returns:
    - Total competitors count
    - Active/inactive competitors count
    - Competitors with ads count
    - Total ads across all competitors
    - Average ads per competitor
    """
    try:
        stats = competitor_service.get_competitor_stats()
        return stats
        
    except Exception as e:
        logger.error(f"Error fetching competitor stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching competitor stats: {str(e)}")

@router.get("/search/query", response_model=List[CompetitorResponseDTO])
async def search_competitors(
    q: str = Query(..., description="Search query"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of results"),
    competitor_service: "CompetitorService" = Depends(get_competitor_service_dependency)
) -> List[CompetitorResponseDTO]:
    """
    Search competitors by name or page ID.
    
    Searches in:
    - Competitor names (case-insensitive)
    - Facebook page IDs
    """
    try:
        results = competitor_service.search_competitors(q, limit)
        return results
        
    except Exception as e:
        logger.error(f"Error searching competitors: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error searching competitors: {str(e)}")

# ========================================
# Competitor Ads Scraping
# ========================================

class CompetitorScrapeRequest(BaseModel):
    """Request model for competitor ads scraping"""
    countries: Optional[List[str]] = ["AE"]
    max_pages: Optional[int] = 5
    delay_between_requests: Optional[int] = 1
    active_status: Optional[str] = "active"

class TaskResponse(BaseModel):
    """Response model for task operations"""
    task_id: str
    status: str
    message: str

@router.post("/{competitor_id}/scrape", response_model=TaskResponse)
async def scrape_competitor_ads(
    competitor_id: int,
    scrape_request: CompetitorScrapeRequest,
    competitor_service: "CompetitorService" = Depends(get_competitor_service_dependency)
) -> TaskResponse:
    """
    Trigger ads scraping for a specific competitor.
    
    This will:
    1. Validate the competitor exists
    2. Start a background task to scrape ads from their Facebook page
    3. Return task ID for monitoring progress
    """
    try:
        # Validate competitor exists and is active
        competitor = competitor_service.get_competitor_by_id(competitor_id)
        
        if not competitor.is_active:
            raise HTTPException(
                status_code=400,
                detail=f"Competitor '{competitor.name}' is not active. Please activate it first."
            )
        
        # Start scraping task
        task = scrape_competitor_ads_task.delay(
            competitor_page_id=competitor.page_id,
            countries=scrape_request.countries,
            max_pages=scrape_request.max_pages,
            delay_between_requests=scrape_request.delay_between_requests,
            active_status=scrape_request.active_status
        )
        
        logger.info(f"Started scraping task for competitor {competitor.name} (ID: {competitor_id})")
        
        return TaskResponse(
            task_id=task.id,
            status="started",
            message=f"Ads scraping started for competitor '{competitor.name}'"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting scraping for competitor {competitor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting scraping: {str(e)}")

@router.get("/scrape/status/{task_id}")
async def get_scraping_status(task_id: str) -> dict:
    """
    Get the status of a competitor scraping task.
    
    Returns task status and progress information.
    """
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
        logger.error(f"Error fetching scraping status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching scraping status: {str(e)}")

# ========================================
# Competitor Ads Management
# ========================================

@router.get("/{competitor_id}/ads")
async def get_competitor_ads(
    competitor_id: int,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of items per page"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    has_analysis: Optional[bool] = Query(None, description="Filter by analysis availability"),
    competitor_service: "CompetitorService" = Depends(get_competitor_service_dependency)
):
    """
    Get ads for a specific competitor with filtering and pagination.
    
    This endpoint redirects to the main ads endpoint with competitor filter.
    """
    try:
        # Validate competitor exists
        competitor = competitor_service.get_competitor_by_id(competitor_id)
        
        # Import here to avoid circular imports
        from app.services.ad_service import AdService
        from app.models.dto.ad_dto import AdFilterParams
        
        # Create ad service
        db = next(get_db())
        ad_service = AdService(db)
        
        # Create filter parameters
        filters = AdFilterParams(
            page=page,
            page_size=page_size,
            competitor_id=competitor_id,
            is_active=is_active,
            has_analysis=has_analysis,
            sort_by="created_at",
            sort_order="desc"
        )
        
        # Get ads using ad service
        result = ad_service.get_ads(filters)
        
        return {
            "competitor": {
                "id": competitor.id,
                "name": competitor.name,
                "page_id": competitor.page_id
            },
            "ads": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching ads for competitor {competitor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching competitor ads: {str(e)}")

@router.delete("/{competitor_id}/ads")
async def clear_competitor_ads(
    competitor_id: int,
    competitor_service: "CompetitorService" = Depends(get_competitor_service_dependency)
):
    try:
        result = competitor_service.clear_competitor_ads(competitor_id)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing ads for competitor {competitor_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error clearing competitor ads: {str(e)}")

# Import required models 
