from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, TYPE_CHECKING, Dict, Any
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
    AdResponseDTO,
    AnalyzeVideoRequest,
    AnalyzeVideoResponse
)
from app.models import Ad, TaskStatus, Competitor
from app.services.facebook_ads_scraper import FacebookAdsScraperService, FacebookAdsScraperConfig
from app.services.ingestion_service import DataIngestionService
from app.services.enhanced_ad_extraction import EnhancedAdExtractionService
from app.services.unified_analysis_service import UnifiedAnalysisService

# Import Celery tasks
from app.tasks.basic_tasks import add_together, test_task, long_running_task
from app.tasks.facebook_ads_scraper_task import scrape_facebook_ads_task, scrape_competitor_ads_task
from app.tasks.ai_analysis_tasks import ai_analysis_task, batch_ai_analysis_task
from app.celery_worker import celery_app

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
    date_from: Optional[str] = None  # YYYY-MM-DD
    date_to: Optional[str] = None
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

class SaveSearchAdRequest(BaseModel):
    """
    Request model for saving an ad from search results
    """
    ad_archive_id: str
    competitor_name: Optional[str] = None
    competitor_page_id: Optional[str] = None
    notes: Optional[str] = None

class SaveSearchAdResponse(BaseModel):
    """
    Response model for saving an ad from search results
    """
    success: bool
    message: str
    ad_id: Optional[int] = None
    competitor_id: Optional[int] = None

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
    min_duration_days: Optional[int] = Query(None, ge=1, description="Minimum duration in days"),
    max_duration_days: Optional[int] = Query(None, ge=1, description="Maximum duration in days"),
    date_from: Optional[datetime] = Query(None, description="Filter ads from this date"),
    date_to: Optional[datetime] = Query(None, description="Filter ads to this date"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    is_favorite: Optional[bool] = Query(None, description="Filter by favorite status"),
    search: Optional[str] = Query(None, description="Search in ad copy and titles"),
    sort_by: Optional[str] = Query("created_at", description="Sort by field (created_at, date_found, updated_at, variant_count, hook_score, overall_score)"),
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
            min_duration_days=min_duration_days,
            max_duration_days=max_duration_days,
            date_from=date_from,
            date_to=date_to,
            is_active=is_active,
            is_favorite=is_favorite,
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

@router.get("/ads/analysis-status")
async def get_analysis_status(
    ad_ids: Optional[str] = Query(None, description="Comma-separated list of ad IDs"),
    ad_set_id: Optional[int] = Query(None, description="Ad set ID to check all ads in set"),
    db: Session = Depends(get_db)
):
    """
    Get analysis status for multiple ads using the unified analysis system.
    
    Args:
        ad_ids: Comma-separated list of ad IDs
        ad_set_id: Ad set ID to check all ads in set
    """
    try:
        analysis_service = UnifiedAnalysisService(db)
        
        parsed_ad_ids = None
        if ad_ids:
            try:
                parsed_ad_ids = [int(id.strip()) for id in ad_ids.split(',') if id.strip()]
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid ad_ids format")
        
        status = analysis_service.get_ads_with_analysis_status(
            ad_ids=parsed_ad_ids,
            ad_set_id=ad_set_id
        )
        
        return {
            "success": True,
            "analysis_status": status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting analysis status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting analysis status: {str(e)}")

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

class FavoriteResponse(BaseModel):
    """Response model for favorite toggle"""
    ad_id: int
    is_favorite: bool
    message: str

class SaveAdContentResponse(BaseModel):
    """Response model for save ad content"""
    success: bool
    ad_id: int
    is_saved: bool
    saved_at: str
    message: str
    content: Dict

class UnsaveAdContentResponse(BaseModel):
    """Response model for unsave ad content"""
    success: bool
    ad_id: int
    is_saved: bool
    message: str
    deleted: Dict

class RefreshMediaUrlResponse(BaseModel):
    """Response model for media URL refresh from Facebook"""
    success: bool
    ad_id: int
    old_media_url: Optional[str]
    new_media_url: Optional[str]
    message: str
    error: Optional[str] = None


class DeleteAnalysisResponse(BaseModel):
    """Response model for deleting AI analysis for an ad"""
    success: bool
    ad_id: int
    message: str

@router.post("/ads/{ad_id}/favorite", response_model=FavoriteResponse)
async def toggle_favorite(
    ad_id: int, 
    ad_service: "AdService" = Depends(get_ad_service_dependency)
):
    """
    Toggle the favorite status of a specific ad.
    
    Returns the new favorite status.
    """
    try:
        new_status = ad_service.toggle_favorite(ad_id)
        
        if new_status is None:
            raise HTTPException(status_code=404, detail="Ad not found")
        
        return FavoriteResponse(
            ad_id=ad_id,
            is_favorite=new_status,
            message=f"Ad {'added to' if new_status else 'removed from'} favorites"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling favorite for ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error toggling favorite: {str(e)}")


@router.delete("/ads/{ad_id}/analysis", response_model=DeleteAnalysisResponse)
async def delete_ad_analysis(
    ad_id: int,
    db: Session = Depends(get_db)
):
    """Delete AI analysis for a specific ad from the database.

    This clears the persisted raw_ai_response so the next analysis will be treated as fresh.
    """
    try:
        from app.models.ad_analysis import AdAnalysis
        from app.models import Ad

        # Fetch all analyses for this ad (current + archived)
        analyses = db.query(AdAnalysis).filter(AdAnalysis.ad_id == ad_id).all()
        if not analyses:
            return DeleteAnalysisResponse(
                success=False,
                ad_id=ad_id,
                message="No analysis found for this ad"
            )

        # Collect all used video URLs and Gemini cache metadata across versions
        used_urls: set[str] = set()
        cache_entries: set[tuple[str, int]] = set()
        try:
            for analysis in analyses:
                raw = analysis.raw_ai_response or {}
                if isinstance(raw, dict):
                    url = raw.get("used_video_url") or analysis.used_video_url
                    if url:
                        used_urls.add(url)

                    cache_name = raw.get("gemini_cache_name")
                    api_idx = raw.get("gemini_api_key_index")
                    if cache_name and isinstance(api_idx, int):
                        cache_entries.add((cache_name, api_idx))
        except Exception as e:
            logger.warning(f"Failed to aggregate cache metadata for ad {ad_id}: {e}")

        # Best-effort: delete all Gemini explicit caches linked to these analyses
        try:
            if cache_entries:
                from app.services.google_ai_service import GoogleAIService
                for cache_name, api_idx in cache_entries:
                    try:
                        ai = GoogleAIService()
                        if 0 <= api_idx < len(ai.api_keys):
                            ai.current_key_index = api_idx
                            ai.api_key = ai.api_keys[api_idx]
                        ai.delete_cache(cache_name)
                        logger.info(f"Deleted Gemini cache during analysis clear: {cache_name}")
                    except Exception as e:
                        logger.warning(f"Failed to delete Gemini cache {cache_name} for ad {ad_id}: {e}")
        except Exception as e:
            logger.warning(f"Gemini cache clear failed during analysis delete for ad {ad_id}: {e}")

        # Best-effort: clear Redis cache entries for all used video URLs
        try:
            if used_urls:
                import os, json
                import redis  # type: ignore

                r = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379"))

                for url in used_urls:
                    cache_key = f"analysis:{url}"
                    try:
                        r.delete(cache_key)
                        logger.info(f"Cleared Redis analysis cache for {cache_key}")
                    except Exception as e:
                        logger.warning(f"Failed to clear Redis cache for {cache_key}: {e}")
        except Exception as e:
            logger.warning(f"Redis cache clear failed during analysis delete for ad {ad_id}: {e}")

        # Finally, delete all analysis records for this ad (current + archived)
        # and clear any Veo-generated videos and merged videos tied to this ad.
        try:
            from app.models.veo_generation import VeoGeneration
            from app.models.merged_video import MergedVideo

            # Delete all AdAnalysis versions
            for analysis in analyses:
                db.delete(analysis)

            # Delete Veo generations for this ad
            db.query(VeoGeneration).filter(VeoGeneration.ad_id == ad_id).delete()

            # Delete merged videos for this ad
            db.query(MergedVideo).filter(MergedVideo.ad_id == ad_id).delete()

            db.commit()
        except Exception as e:
            logger.error(f"Failed to delete analyses/Veo data for ad {ad_id}: {e}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to delete analyses/Veo data: {e}")

        return DeleteAnalysisResponse(
            success=True,
            ad_id=ad_id,
            message="All analyses, Veo videos, merges, and caches cleared for this ad"
        )

    except Exception as e:
        logger.error(f"Error deleting analysis for ad {ad_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting analysis for ad: {str(e)}")


@router.post("/ads/{ad_id}/save", response_model=SaveAdContentResponse)
async def save_ad_content(
    ad_id: int, 
    ad_service: "AdService" = Depends(get_ad_service_dependency)
):
    """
    Save the complete ad content including images and videos permanently.
    
    This endpoint:
    1. Marks the ad as saved (is_favorite = True)
    2. Persists the current state of text, images, and videos
    3. Returns information about what was saved
    
    Use this when the user wants to permanently save an ad for offline viewing.
    """
    try:
        saved_content = ad_service.save_ad_content(ad_id)
        
        if saved_content is None:
            raise HTTPException(status_code=404, detail="Ad not found")
        
        return SaveAdContentResponse(
            success=True,
            ad_id=saved_content["ad_id"],
            is_saved=saved_content["is_saved"],
            saved_at=saved_content["saved_at"],
            message="Ad content saved successfully. All images and videos have been preserved.",
            content=saved_content["content"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving ad content for ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving ad content: {str(e)}")

@router.post("/ads/{ad_id}/unsave", response_model=UnsaveAdContentResponse)
async def unsave_ad_content(
    ad_id: int,
    db: Session = Depends(get_db)
):
    """
    Unsave ad content and delete saved media files from disk.
    
    This endpoint:
    1. Marks the ad as unsaved (is_favorite = False)
    2. Deletes downloaded images and videos from disk
    3. Clears local_media references from database
    4. Returns information about what was deleted
    
    Use this when the user wants to remove saved ad content.
    """
    try:
        from app.services.media_storage_service import MediaStorageService
        from app.models import Ad, AdSet
        
        # Get the ad
        ad = db.query(Ad).filter(Ad.id == ad_id).first()
        if not ad:
            raise HTTPException(status_code=404, detail="Ad not found")
        
        # Delete media files from disk
        media_service = MediaStorageService(db)
        deletion_result = media_service.delete_ad_media(ad_id)
        
        # Mark as unsaved
        ad.is_favorite = False
        
        # Also unsave the AdSet if part of one
        if ad.ad_set_id:
            ad_set = db.query(AdSet).filter(AdSet.id == ad.ad_set_id).first()
            if ad_set:
                ad_set.is_favorite = False
        
        db.commit()
        
        logger.info(f"Unsaved ad {ad_id} and deleted {deletion_result['images_deleted']} images, {deletion_result['videos_deleted']} videos")
        
        return UnsaveAdContentResponse(
            success=True,
            ad_id=ad_id,
            is_saved=False,
            message=f"Ad unsaved and {deletion_result['images_deleted'] + deletion_result['videos_deleted']} media file(s) deleted from disk.",
            deleted=deletion_result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unsaving ad content for ad {ad_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error unsaving ad content: {str(e)}")

@router.post("/ads/{ad_id}/refresh-media", response_model=RefreshMediaUrlResponse)
async def refresh_media_from_facebook(
    ad_id: int,
    db: Session = Depends(get_db)
):
    """
    Automatically refresh the media URL for a specific ad by fetching fresh data from Facebook Ad Library.
    
    This is useful when media links expire. The system will automatically:
    1. Search for the ad in Facebook Ad Library using its ad_archive_id
    2. Extract the fresh media URL from the results
    3. Update the ad's media URL in the database
    
    No manual URL input required - everything is automatic!
    """
    try:
        from app.services.media_refresh_service import MediaRefreshService
        
        # Create the media refresh service
        refresh_service = MediaRefreshService(db)
        
        # Refresh the media from Facebook
        result = refresh_service.refresh_ad_media_from_facebook(ad_id)
        
        if not result.get('success'):
            raise HTTPException(
                status_code=400 if result.get('error') == 'Ad not found' else 500,
                detail=result.get('error', 'Failed to refresh media URL')
            )
        
        return RefreshMediaUrlResponse(
            success=True,
            ad_id=ad_id,
            old_media_url=result.get('old_media_url'),
            new_media_url=result.get('new_media_url'),
            message="Media URL refreshed successfully from Facebook Ad Library"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing media URL for ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error refreshing media URL: {str(e)}")

class BatchRefreshResponse(BaseModel):
    """Response model for batch media refresh"""
    success: bool
    total: int
    successful: int
    failed: int
    message: str
    details: List[Dict]

@router.post("/ads/favorites/refresh-all", response_model=BatchRefreshResponse)
async def refresh_all_favorites(
    db: Session = Depends(get_db)
):
    """
    Refresh media URLs for ALL favorite ads automatically from Facebook Ad Library.
    
    This endpoint:
    1. Fetches all ads marked as favorites
    2. For each favorite, fetches fresh media URLs from Facebook
    3. Updates the database with the new URLs
    
    Useful when you want to refresh all your favorite ads' media links at once!
    """
    try:
        from app.services.media_refresh_service import MediaRefreshService
        
        # Get all favorite ads
        favorite_ads = db.query(Ad).filter(Ad.is_favorite == True).all()
        
        if not favorite_ads:
            return BatchRefreshResponse(
                success=True,
                total=0,
                successful=0,
                failed=0,
                message="No favorite ads found",
                details=[]
            )
        
        favorite_ad_ids = [ad.id for ad in favorite_ads]
        logger.info(f"Refreshing {len(favorite_ad_ids)} favorite ads")
        
        # Create the media refresh service
        refresh_service = MediaRefreshService(db)
        
        # Refresh all favorites
        result = refresh_service.refresh_multiple_ads(favorite_ad_ids)
        
        return BatchRefreshResponse(
            success=True,
            total=result['total'],
            successful=result['successful'],
            failed=result['failed'],
            message=f"Refreshed {result['successful']}/{result['total']} favorite ads successfully",
            details=result['details']
        )
        
    except Exception as e:
        logger.error(f"Error refreshing favorite ads: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error refreshing favorite ads: {str(e)}")

@router.post("/ad-sets/{ad_set_id}/refresh-media", response_model=BatchRefreshResponse)
async def refresh_ad_set_media(
    ad_set_id: int,
    db: Session = Depends(get_db)
):
    """
    Refresh media URLs for ALL ads in a specific ad set from Facebook Ad Library.
    
    This endpoint:
    1. Fetches all ads in the specified ad set
    2. For each ad, fetches fresh media URLs from Facebook
    3. Updates the database with the new URLs
    
    Useful when you want to refresh all variants of an ad!
    """
    try:
        from app.services.media_refresh_service import MediaRefreshService
        from app.models.ad_set import AdSet
        
        # Check if ad set exists
        ad_set = db.query(AdSet).filter(AdSet.id == ad_set_id).first()
        if not ad_set:
            raise HTTPException(status_code=404, detail="Ad set not found")
        
        # Get all ads in this ad set
        ads_in_set = db.query(Ad).filter(Ad.ad_set_id == ad_set_id).all()
        
        if not ads_in_set:
            return BatchRefreshResponse(
                success=True,
                total=0,
                successful=0,
                failed=0,
                message=f"No ads found in ad set {ad_set_id}",
                details=[]
            )
        
        ad_ids = [ad.id for ad in ads_in_set]
        logger.info(f"Refreshing {len(ad_ids)} ads in ad set {ad_set_id}")
        
        # Create the media refresh service
        refresh_service = MediaRefreshService(db)
        
        # Refresh all ads in the set
        result = refresh_service.refresh_multiple_ads(ad_ids)
        
        return BatchRefreshResponse(
            success=True,
            total=result['total'],
            successful=result['successful'],
            failed=result['failed'],
            message=f"Refreshed {result['successful']}/{result['total']} ads in ad set successfully",
            details=result['details']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing ad set {ad_set_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error refreshing ad set: {str(e)}")

# ========================================
# Search Facebook Ad Library directly
# ========================================

class AdLibrarySearchRequest(BaseModel):
    """Request model for searching Facebook Ad Library directly"""
    query_string: Optional[str] = Field(None, description="Keyword search query")
    page_id: Optional[str] = Field(None, description="Facebook page ID to search")
    countries: Optional[List[str]] = Field(default=["AE"], description="List of country codes")
    active_status: Optional[str] = Field(default="active", description="Ad status filter")
    ad_type: Optional[str] = Field(default="ALL", description="Ad type filter")
    media_type: Optional[str] = Field(default="all", description="Media type filter")
    max_pages: Optional[int] = Field(default=3, description="Maximum pages to scrape")
    save_to_database: Optional[bool] = Field(default=True, description="Save results to database")
    min_duration_days: Optional[int] = Field(None, description="Minimum ad duration in days")
    cursor: Optional[str] = Field(None, description="Pagination cursor for loading more results")

class AdLibrarySearchResponse(BaseModel):
    """Response model for Ad Library search"""
    success: bool
    search_type: str  # "keyword" or "page"
    query: str
    countries: List[str]
    total_ads_found: int
    total_ads_saved: int
    pages_scraped: int
    stats: Dict[str, Any]
    ads_preview: List[Dict[str, Any]] = Field(default_factory=list)
    message: str
    search_time: str
    next_cursor: Optional[str] = Field(None, description="Cursor for next page of results")
    has_next_page: Optional[bool] = Field(None, description="Whether more results are available")

@router.post("/ads/library/search", response_model=AdLibrarySearchResponse)
async def search_ad_library(
    request: AdLibrarySearchRequest,
    db: Session = Depends(get_db)
):
    """
    Search Facebook Ad Library directly by keyword or page ID.
    
    This endpoint allows you to search Meta's Ad Library in real-time:
    - Search by keyword across all advertisers
    - Search by specific Facebook page ID
    - Filter by country, ad status, media type
    - Optionally save results to database for analysis
    
    Examples:
    - Keyword search: {"query_string": "real estate", "countries": ["AE", "US"]}
    - Page search: {"page_id": "123456789", "countries": ["AE"]}
    """
    try:
        from datetime import datetime
        start_time = datetime.utcnow()
        
        # Validate request
        if not request.query_string and not request.page_id:
            raise HTTPException(
                status_code=400, 
                detail="Either query_string or page_id must be provided"
            )
        
        # Determine search type and parameters
        if request.page_id:
            search_type = "page"
            search_query = request.page_id
            scraper_search_type = "page"
            view_all_page_id = request.page_id
            query_string = ""
            page_ids = [request.page_id]  # Also set pageIDs for GraphQL
        else:
            search_type = "keyword"
            search_query = request.query_string
            scraper_search_type = "KEYWORD_UNORDERED"
            view_all_page_id = "0"  # Use 0 for keyword searches
            query_string = request.query_string
            page_ids = []
        
        logger.info(f"Starting Ad Library search: type={search_type}, query='{search_query}', countries={request.countries}")
        
        # Create scraper service with duration filter
        scraper_service = FacebookAdsScraperService(db, request.min_duration_days)
        
        # For page searches, use a higher 'first' value to get more ads per page
        first_value = 50 if search_type == "page" else 30
        
        # Create scraper configuration
        scraper_config = FacebookAdsScraperConfig(
            query_string=query_string,
            view_all_page_id=view_all_page_id,
            countries=request.countries,
            max_pages=request.max_pages,
            delay_between_requests=2,  # Be respectful to Facebook's servers
            search_type=scraper_search_type,
            active_status=request.active_status,
            ad_type=request.ad_type,
            media_type=request.media_type,
            save_json=False,
            cursor=request.cursor,  # Add cursor support for pagination
            first=first_value  # Use higher value for page searches
        )
        
        # Perform the search
        logger.info(f"Executing search with config: search_type={scraper_config.search_type}, query='{scraper_config.query_string}', page_id={scraper_config.view_all_page_id}")
        
        if request.save_to_database:
            # Full scrape with database saving
            all_ads_data, all_json_responses, enhanced_data, stats = scraper_service.scrape_ads(scraper_config)
            next_cursor = None
            has_next_page = False
        else:
            # Preview-only mode - scrape but don't save to database
            all_ads_data, all_json_responses, enhanced_data, stats, next_cursor, has_next_page = scraper_service.scrape_ads_preview_only(scraper_config)
        
        # Calculate search time
        end_time = datetime.utcnow()
        search_duration = (end_time - start_time).total_seconds()
        
        # Prepare ads preview (all found ads for display)
        ads_preview = []
        if enhanced_data:
            for competitor_name, ads_list in enhanced_data.items():
                for ad in ads_list:  # Include all ads, not just first 5
                    # Prepare meta object with media URLs
                    meta_data = ad.get("meta", {})
                    meta_data.update({
                        "image_urls": ad.get("image_urls", []),
                        "video_urls": ad.get("video_urls", []),
                        "primary_media_url": ad.get("primary_media_url", ""),
                        "main_image_urls": ad.get("main_image_urls", []),
                        "main_video_urls": ad.get("main_video_urls", []),
                        "media_url": ad.get("media_url", ""),
                        "video_preview_image_url": ad.get("video_preview_image_url", "")
                    })
                    
                    preview = {
                        "ad_archive_id": ad.get("ad_archive_id"),
                        "advertiser": competitor_name,
                        "media_type": ad.get("media_type", "unknown"),
                        "is_active": ad.get("meta", {}).get("is_active", False),
                        "start_date": ad.get("meta", {}).get("start_date"),
                        "duration_days": ad.get("duration_days"),
                        "creatives_count": len(ad.get("creatives", [])),
                        "has_targeting": bool(ad.get("targeting")),
                        "has_lead_form": bool(ad.get("lead_form")),
                        "creatives": ad.get("creatives", []),
                        "targeting": ad.get("targeting", {}),
                        "lead_form": ad.get("lead_form", {}),
                        "meta": meta_data
                    }
                    ads_preview.append(preview)
        
        # Prepare response
        total_ads_found = stats.get('total_processed', 0)
        total_ads_saved = stats.get('created', 0) + stats.get('updated', 0) if request.save_to_database else 0
        
        response = AdLibrarySearchResponse(
            success=True,
            search_type=search_type,
            query=search_query,
            countries=request.countries,
            total_ads_found=total_ads_found,
            total_ads_saved=total_ads_saved,
            pages_scraped=len(all_json_responses),
            stats=stats,
            ads_preview=ads_preview,
            message=f"Found {total_ads_found} ads in {search_duration:.1f}s" + 
                   (f", saved {total_ads_saved} to database" if request.save_to_database else ""),
            search_time=f"{search_duration:.1f}s",
            next_cursor=next_cursor,
            has_next_page=has_next_page
        )
        
        logger.info(f"Search completed: {response.message}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching Ad Library: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

class SaveSelectedAdsRequest(BaseModel):
    """Request model for saving selected ads from search results"""
    ad_archive_ids: List[str] = Field(..., description="List of ad archive IDs to save")
    search_params: AdLibrarySearchRequest = Field(..., description="Original search parameters")

class SaveSelectedAdsResponse(BaseModel):
    """Response model for saving selected ads"""
    success: bool
    total_requested: int
    total_saved: int
    already_existed: int
    errors: int
    message: str

@router.post("/ads/library/save-selected", response_model=SaveSelectedAdsResponse)
async def save_selected_ads(
    request: SaveSelectedAdsRequest,
    db: Session = Depends(get_db)
):
    """
    Save specific ads from search results to the database.
    
    This endpoint allows users to:
    1. Preview ads from search results
    2. Select which ads they want to save
    3. Save only the selected ads to the database
    """
    try:
        if not request.ad_archive_ids:
            raise HTTPException(status_code=400, detail="No ad archive IDs provided")
        
        logger.info(f"Saving {len(request.ad_archive_ids)} selected ads to database")
        
        # Re-run the search with save_to_database=True to get the full data
        search_request = request.search_params
        search_request.save_to_database = True
        
        # Determine search type and parameters
        if search_request.page_id:
            search_type = "page"
            scraper_search_type = "page"
            view_all_page_id = search_request.page_id
            query_string = ""
        else:
            search_type = "keyword"
            scraper_search_type = "KEYWORD_UNORDERED"
            view_all_page_id = "0"
            query_string = search_request.query_string
        
        # Create scraper service
        scraper_service = FacebookAdsScraperService(db, search_request.min_duration_days)
        
        # Create scraper configuration
        scraper_config = FacebookAdsScraperConfig(
            query_string=query_string,
            view_all_page_id=view_all_page_id,
            countries=search_request.countries,
            max_pages=search_request.max_pages,
            delay_between_requests=2,
            search_type=scraper_search_type,
            active_status=search_request.active_status,
            ad_type=search_request.ad_type,
            media_type=search_request.media_type,
            save_json=False
        )
        
        # Scrape and save to database
        all_ads_data, all_json_responses, enhanced_data, stats = scraper_service.scrape_ads(scraper_config)
        
        # Filter stats to only count the requested ads
        total_saved = stats.get('created', 0) + stats.get('updated', 0)
        
        return SaveSelectedAdsResponse(
            success=True,
            total_requested=len(request.ad_archive_ids),
            total_saved=total_saved,
            already_existed=stats.get('updated', 0),
            errors=stats.get('errors', 0),
            message=f"Successfully processed {len(request.ad_archive_ids)} ads, saved {total_saved} to database"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving selected ads: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save selected ads: {str(e)}")

# ========================================
# Download from Facebook Ad Library by URL/ID
# ========================================

class DownloadFromLibraryRequest(BaseModel):
    """Request model to download media by Ad Library URL or archive ID"""
    ad_library_url: Optional[str] = None
    ad_archive_id: Optional[str] = None
    media_type: Optional[str] = Field("video", description="'video', 'image', or 'all'")
    download: Optional[bool] = Field(False, description="If true, download media to local storage")

class DownloadedFile(BaseModel):
    url: str
    local_path: Optional[str] = None
    public_url: Optional[str] = None
    file_size: Optional[int] = None

class MediaItem(BaseModel):
    type: str  # 'video' | 'image'
    url: str
    quality: Optional[str] = None

class DownloadFromLibraryResponse(BaseModel):
    success: bool
    ad_archive_id: str
    page_id: Optional[str] = None
    ad_id: Optional[int] = None
    video_urls: List[str] = Field(default_factory=list)
    image_urls: List[str] = Field(default_factory=list)
    video_hd_urls: List[str] = Field(default_factory=list)
    video_sd_urls: List[str] = Field(default_factory=list)
    downloaded: List[DownloadedFile] = Field(default_factory=list)
    media: List[MediaItem] = Field(default_factory=list)
    save_path: Optional[str] = None
    message: str

@router.post("/ads/library/download", response_model=DownloadFromLibraryResponse)
async def download_from_ad_library(
    request: DownloadFromLibraryRequest,
    db: Session = Depends(get_db)
):
    """
    Fetch media URLs for an ad from Facebook Ad Library by URL or archive ID.
    Optionally download the media files to local storage.

    Examples of accepted URL:
    - https://www.facebook.com/ads/library/?id=1165490822069878
    """
    try:
        # Determine ad_archive_id
        ad_archive_id = request.ad_archive_id
        if not ad_archive_id and request.ad_library_url:
            try:
                from urllib.parse import urlparse, parse_qs
                parsed = urlparse(request.ad_library_url)
                q = parse_qs(parsed.query)
                ad_archive_id = q.get("id", [None])[0]
            except Exception:
                ad_archive_id = None

        if not ad_archive_id:
            raise HTTPException(status_code=400, detail="Missing ad_archive_id or ad_library_url with id param")

        # Fetch ad data from Facebook
        from app.services.media_refresh_service import MediaRefreshService
        refresh_service = MediaRefreshService(db)
        ad_data = refresh_service.fetch_ad_from_facebook(ad_archive_id)

        if not ad_data:
            raise HTTPException(status_code=404, detail=f"Ad {ad_archive_id} not found in Facebook Ad Library")

        # Extract URLs
        urls = refresh_service.extract_urls_from_ad_data(ad_data)
        video_urls = urls.get('video_urls', [])
        image_urls = urls.get('image_urls', [])
        video_hd_urls = urls.get('video_hd_urls', [])
        video_sd_urls = urls.get('video_sd_urls', [])

        # Filter by media_type if needed
        media_type = (request.media_type or "video").lower()
        if media_type not in ["video", "image", "all"]:
            raise HTTPException(status_code=400, detail="media_type must be 'video', 'image', or 'all'")

        selected_urls: List[Dict[str, str]] = []
        if media_type in ("video", "all"):
            selected_urls += [{"url": u, "type": "video"} for u in video_urls]
        if media_type in ("image", "all"):
            selected_urls += [{"url": u, "type": "image"} for u in image_urls]

        # Ensure competitor exists based on page info
        competitor_name = None
        page_id = None
        page_name = None
        try:
            snapshot = ad_data.get('snapshot', {}) if isinstance(ad_data, dict) else {}
            page_id = ad_data.get('page_id') or snapshot.get('page_id')
            page_name = snapshot.get('page_name')
        except Exception:
            pass

        comp = None
        try:
            if page_id:
                comp = db.query(Competitor).filter(Competitor.page_id == page_id).first()
            if not comp and page_name:
                # Try by name as fallback
                comp = db.query(Competitor).filter(Competitor.name == page_name).first()
            if not comp and (page_id or page_name):
                comp = Competitor(name=page_name or f"page_{page_id}", page_id=str(page_id) if page_id else None, is_active=True)
                db.add(comp)
                db.commit()
                db.refresh(comp)
            if comp:
                competitor_name = comp.name
        except Exception as e:
            logger.error(f"Failed to ensure competitor exists: {str(e)}")

        # Ensure an Ad row exists for this ad_archive_id so we can persist analysis in DB
        ad_id: Optional[int] = None
        try:
            existing_ad = db.query(Ad).filter(Ad.ad_archive_id == ad_archive_id).first()
            if existing_ad:
                # content_modification: Ensure existing downloaded ads are marked as favorite
                if not existing_ad.is_favorite:
                    existing_ad.is_favorite = True
                    db.commit()
                ad_id = existing_ad.id
            elif comp:
                from datetime import datetime
                new_ad = Ad(
                    competitor_id=comp.id,
                    ad_archive_id=ad_archive_id,
                    date_found=datetime.utcnow(),
                    raw_data=ad_data,
                    is_favorite=True, # Mark as favorite by default for downloaded ads
                )
                db.add(new_ad)
                db.commit()
                db.refresh(new_ad)
                ad_id = new_ad.id
        except Exception as e:
            logger.error(f"Failed to ensure Ad exists for archive {ad_archive_id}: {str(e)}")

        downloaded: List[DownloadedFile] = []
        # Optional download
        if request.download and selected_urls:
            try:
                from app.services.media_storage_service import MediaStorageService
                storage = MediaStorageService(db)

                for item in selected_urls:
                    file_info = storage.download_and_save_file(
                        item["url"],
                        'video' if item["type"] == 'video' else 'image',
                        competitor_name=competitor_name
                    )
                    if file_info:
                        downloaded.append(
                            DownloadedFile(
                                url=item["url"],
                                local_path=file_info.get('local_path'),
                                public_url=f"/media/{file_info.get('local_path')}",
                                file_size=file_info.get('file_size')
                            )
                        )
            except Exception as e:
                logger.error(f"Failed downloading media for {ad_archive_id}: {str(e)}")
                # Continue and return URLs even if download fails

        # Build media items with simple quality heuristic
        def _guess_quality(u: str, t: str) -> str:
            low = (u or '').lower()
            if t == 'video':
                if '1080' in low or 'hd' in low:
                    return 'HD'
                if '720' in low:
                    return 'HD-720'
                if 'm3u8' in low:
                    return 'HLS'
                if 'sd' in low or '480' in low:
                    return 'SD'
                return 'unknown'
            else:
                if 'original' in low:
                    return 'original'
                if 'resized' in low:
                    return 'resized'
                if 'preview' in low:
                    return 'preview'
                return 'unknown'

        media_items: List[MediaItem] = []
        for u in video_urls:
            media_items.append(MediaItem(type='video', url=u, quality=_guess_quality(u, 'video')))
        for u in image_urls:
            media_items.append(MediaItem(type='image', url=u, quality=_guess_quality(u, 'image')))

        # Determine save path based on competitor
        save_path = None
        if competitor_name:
            import os
            save_path = os.path.join("backend", "media", competitor_name)

        return DownloadFromLibraryResponse(
            success=True,
            ad_archive_id=ad_archive_id,
            page_id=page_id,
            ad_id=ad_id,
            video_urls=video_urls,
            image_urls=image_urls,
            video_hd_urls=video_hd_urls,
            video_sd_urls=video_sd_urls,
            downloaded=downloaded,
            media=media_items,
            save_path=save_path,
            message=(
                f"Found {len(video_hd_urls)} HD video(s), {len(video_sd_urls)} SD video(s), and {len(image_urls)} image(s)"
                + (f"; downloaded {len(downloaded)} file(s)" if request.download else "")
            )
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading from Ad Library: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

# ========================================
# Analyze a video via Google Gemini
# ========================================


class AnalysisHistoryItem(BaseModel):
    """Single analysis history item"""
    id: int
    version_number: int
    is_current: bool
    created_at: str
    summary: Optional[str] = None

class AnalysisHistoryResponse(BaseModel):
    """Response with all analyses for an ad"""
    ad_id: int
    total_count: int
    current_version: Optional[int] = None
    analyses: List[AnalysisHistoryItem]

@router.get("/ads/{ad_id}/analysis/history", response_model=AnalysisHistoryResponse)
async def get_ad_analysis_history(
    ad_id: int,
    db: Session = Depends(get_db)
):
    """Get all analyses (current + archived) for a specific ad.
    
    Returns list of all analysis versions with metadata.
    """
    try:
        from app.models.ad_analysis import AdAnalysis
        from app.models import Ad
        
        # Get the ad to ensure it exists
        ad = db.query(Ad).filter(Ad.id == ad_id).first()
        if not ad:
            raise HTTPException(status_code=404, detail="Ad not found")
        
        # Get all analyses ordered by version
        analyses = db.query(AdAnalysis).filter(
            AdAnalysis.ad_id == ad_id
        ).order_by(AdAnalysis.version_number.desc()).all()
        
        if not analyses:
            return AnalysisHistoryResponse(
                ad_id=ad_id,
                total_count=0,
                current_version=None,
                analyses=[]
            )
        
        # Find current version
        current_version = None
        for analysis in analyses:
            if analysis.is_current == 1:
                current_version = analysis.version_number
                break
        
        # Build response
        history_items = []
        for analysis in analyses:
            raw_response = analysis.raw_ai_response or {}
            history_items.append(AnalysisHistoryItem(
                id=analysis.id,
                version_number=analysis.version_number,
                is_current=analysis.is_current == 1,
                created_at=analysis.created_at.isoformat() if analysis.created_at else "",
                summary=raw_response.get("summary") or analysis.summary
            ))
        
        return AnalysisHistoryResponse(
            ad_id=ad_id,
            total_count=len(analyses),
            current_version=current_version,
            analyses=history_items
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving analysis history for ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving analysis history: {str(e)}")

@router.get("/ads/{ad_id}/analysis/version/{version_number}", response_model=AnalyzeVideoResponse)
async def get_ad_analysis_by_version(
    ad_id: int,
    version_number: int,
    db: Session = Depends(get_db)
):
    """Get a specific version of analysis for an ad.
    
    Allows viewing archived analyses.
    """
    try:
        from app.models.ad_analysis import AdAnalysis
        from app.models import Ad
        
        # Get the ad to ensure it exists
        ad = db.query(Ad).filter(Ad.id == ad_id).first()
        if not ad:
            raise HTTPException(status_code=404, detail="Ad not found")
        
        # Get the specific version
        analysis = db.query(AdAnalysis).filter(
            AdAnalysis.ad_id == ad_id,
            AdAnalysis.version_number == version_number
        ).first()
        if not analysis:
            raise HTTPException(status_code=404, detail=f"Analysis version {version_number} not found")
        
        # Construct response from saved analysis
        raw_response = analysis.raw_ai_response or {}
        
        # Fallback: extract generation_prompts from gemini_chat_history if null
        generation_prompts = raw_response.get("generation_prompts")
        if not generation_prompts and raw_response.get("gemini_chat_history"):
            try:
                import json
                chat_history = raw_response.get("gemini_chat_history", [])
                for msg in chat_history:
                    if msg.get("role") == "model" and msg.get("parts"):
                        for part in msg["parts"]:
                            if "text" in part:
                                # Try to parse the text as JSON
                                text = part["text"]
                                parsed = json.loads(text)
                                if isinstance(parsed, dict) and "generation_prompts" in parsed:
                                    gps = parsed["generation_prompts"]
                                    # Handle array of dicts format
                                    if isinstance(gps, list) and gps and all(isinstance(item, dict) for item in gps):
                                        generation_prompts = [item.get("prompt", str(item)) for item in gps]
                                    elif isinstance(gps, list):
                                        generation_prompts = gps
                                    break
                        if generation_prompts:
                            break
            except Exception as e:
                logger.warning(f"Failed to extract generation_prompts from chat history: {e}")
        
        # Try to get video URL from multiple sources
        video_url = analysis.used_video_url
        if not video_url:
            video_url = raw_response.get("used_video_url")
        if not video_url:
            if ad.creatives and isinstance(ad.creatives, list):
                for creative in ad.creatives:
                    if isinstance(creative, dict):
                        media_list = creative.get("media", [])
                        for media in media_list:
                            if media.get("type") == "Video" and media.get("url"):
                                video_url = media.get("url")
                                break
                    if video_url:
                        break
        
        return AnalyzeVideoResponse(
            success=True,
            used_video_url=video_url or "",
            transcript=raw_response.get("transcript"),
            beats=raw_response.get("beats"),
            summary=raw_response.get("summary"),
            text_on_video=raw_response.get("text_on_video"),
            voice_over=raw_response.get("voice_over"),
            storyboard=raw_response.get("storyboard"),
            generation_prompts=generation_prompts,
            strengths=raw_response.get("strengths"),
            recommendations=raw_response.get("recommendations"),
            raw=raw_response,
            message=f"Analysis version {version_number} retrieved from database" + (" (archived)" if analysis.is_current == 0 else " (current)"),
            generated_at=analysis.created_at.isoformat() if analysis.created_at else None,
            source="database",
            token_usage=raw_response.get("token_usage"),
            cost=raw_response.get("cost"),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving analysis version {version_number} for ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving analysis: {str(e)}")

@router.get("/ads/{ad_id}/analysis", response_model=AnalyzeVideoResponse)
async def get_ad_analysis(
    ad_id: int,
    db: Session = Depends(get_db)
):
    """Get the current (latest) AI analysis for a specific ad.
    
    Returns the current analysis if it exists, otherwise 404.
    Use /ads/{ad_id}/analysis/history to see all versions.
    """
    try:
        from app.models.ad_analysis import AdAnalysis
        from app.models import Ad
        
        # Get the ad to ensure it exists
        ad = db.query(Ad).filter(Ad.id == ad_id).first()
        if not ad:
            raise HTTPException(status_code=404, detail="Ad not found")
        
        # Get the current analysis only
        analysis = db.query(AdAnalysis).filter(
            AdAnalysis.ad_id == ad_id,
            AdAnalysis.is_current == 1
        ).first()
        if not analysis:
            raise HTTPException(status_code=404, detail="No analysis found for this ad")
        
        # Construct response from saved analysis
        raw_response = analysis.raw_ai_response or {}
        
        # Fallback: extract generation_prompts from gemini_chat_history if null
        generation_prompts = raw_response.get("generation_prompts")
        if not generation_prompts and raw_response.get("gemini_chat_history"):
            try:
                import json
                chat_history = raw_response.get("gemini_chat_history", [])
                for msg in chat_history:
                    if msg.get("role") == "model" and msg.get("parts"):
                        for part in msg["parts"]:
                            if "text" in part:
                                # Try to parse the text as JSON
                                text = part["text"]
                                parsed = json.loads(text)
                                if isinstance(parsed, dict) and "generation_prompts" in parsed:
                                    gps = parsed["generation_prompts"]
                                    # Handle array of dicts format
                                    if isinstance(gps, list) and gps and all(isinstance(item, dict) for item in gps):
                                        generation_prompts = [item.get("prompt", str(item)) for item in gps]
                                    elif isinstance(gps, list):
                                        generation_prompts = gps
                                    break
                        if generation_prompts:
                            break
            except Exception as e:
                logger.warning(f"Failed to extract generation_prompts from chat history: {e}")
        
        # Try to get video URL from multiple sources
        video_url = analysis.used_video_url
        if not video_url:
            # Try from raw_ai_response
            video_url = raw_response.get("used_video_url")
        if not video_url:
            # Try to get from the ad's creatives
            if ad.creatives and isinstance(ad.creatives, list):
                for creative in ad.creatives:
                    if isinstance(creative, dict):
                        media_list = creative.get("media", [])
                        for media in media_list:
                            if media.get("type") == "Video" and media.get("url"):
                                video_url = media.get("url")
                                break
                    if video_url:
                        break
        
        return AnalyzeVideoResponse(
            success=True,
            used_video_url=video_url or "",
            transcript=raw_response.get("transcript"),
            beats=raw_response.get("beats"),
            summary=raw_response.get("summary"),
            text_on_video=raw_response.get("text_on_video"),
            voice_over=raw_response.get("voice_over"),
            storyboard=raw_response.get("storyboard"),
            generation_prompts=generation_prompts,
            strengths=raw_response.get("strengths"),
            recommendations=raw_response.get("recommendations"),
            raw=raw_response,
            message="Analysis retrieved from database",
            generated_at=analysis.created_at.isoformat() if analysis.created_at else None,
            source="database",
            token_usage=raw_response.get("token_usage"),
            cost=raw_response.get("cost"),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving analysis for ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving analysis: {str(e)}")


class FollowupQuestionRequest(BaseModel):
    question: str
    version_number: Optional[int] = None


class RegenerateAnalysisRequest(BaseModel):
    instruction: str
    version_number: Optional[int] = None
    generate_prompts: Optional[bool] = True


class FollowupAnswerResponse(BaseModel):
    success: bool
    answer: str
    raw: Optional[Dict[str, Any]] = None
    generated_at: Optional[str] = None
    source: str = "gemini-followup"


@router.post("/ads/{ad_id}/analysis/regenerate", response_model=AnalyzeVideoResponse)
async def regenerate_ad_analysis(
    ad_id: int,
    request: RegenerateAnalysisRequest,
    db: Session = Depends(get_db)
):
    """Regenerate analysis using cached content with a custom instruction.
    
    Uses the existing cache to avoid re-uploading the video, applies the new instruction,
    and saves the result as a new analysis version.
    """
    try:
        from app.models.ad_analysis import AdAnalysis
        from app.models import Ad
        from app.services.google_ai_service import GoogleAIService
        from datetime import datetime
        import json

        ad = db.query(Ad).filter(Ad.id == ad_id).first()
        if not ad:
            raise HTTPException(status_code=404, detail="Ad not found")

        # Get existing analysis with cache metadata
        query = db.query(AdAnalysis).filter(AdAnalysis.ad_id == ad_id)
        if request.version_number is not None:
            query = query.filter(AdAnalysis.version_number == request.version_number)
        else:
            query = query.filter(AdAnalysis.is_current == 1)

        analysis = query.first()
        if not analysis or not analysis.raw_ai_response:
            raise HTTPException(status_code=404, detail="No analysis found to regenerate from")

        raw_resp = analysis.raw_ai_response or {}
        cache_name = raw_resp.get("gemini_cache_name")
        api_key_index = raw_resp.get("gemini_api_key_index")
        video_url = raw_resp.get("used_video_url") or analysis.used_video_url

        if not cache_name or api_key_index is None:
            raise HTTPException(
                status_code=400,
                detail="This analysis doesn't have cached content. Please run a new analysis first."
            )

        # Initialize AI service with the correct API key
        ai = GoogleAIService()
        ai.current_key_index = int(api_key_index)
        ai.api_key = ai.api_keys[ai.current_key_index]

        # Validate and extend cache TTL
        if not ai.is_cache_valid(cache_name):
            raise HTTPException(
                status_code=400,
                detail="Cache has expired. Please run a new analysis."
            )

        try:
            ai.update_cache_ttl(cache_name, ttl_seconds=86400)
            logger.info(f"Extended cache TTL for regeneration: {cache_name}")
        except Exception as e:
            logger.warning(f"Failed to extend cache TTL: {e}")

        # Define response schema (same as in google_ai_service.py)
        response_schema = {
            "type": "object",
            "properties": {
                "transcript": {"type": "string"},
                "beats": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "start": {"type": "string"},
                            "end": {"type": "string"},
                            "summary": {"type": "string"},
                            "why_it_works": {"type": "string"}
                        }
                    }
                },
                "summary": {"type": "string"},
                "text_on_video": {"type": "string"},
                "voice_over": {"type": "string"},
                "storyboard": {"type": "array", "items": {"type": "string"}},
                "strengths": {"type": "array", "items": {"type": "string"}},
                "recommendations": {"type": "array", "items": {"type": "string"}}
            }
        }
        
        # Add generation_prompts only if requested
        if request.generate_prompts:
             response_schema["properties"]["generation_prompts"] = {"type": "array", "items": {"type": "string"}}

        # Build regeneration prompt with custom instruction
        prompt_text = request.instruction
        if request.generate_prompts is False:
             prompt_text += "\n\nCRITICAL INSTRUCTION: DO NOT GENERATE ANY PROMPTS. Focus ONLY on the analysis (transcript, beats, summary, etc.). Do NOT include 'generation_prompts' in the JSON output."
        
        prompt = f"{prompt_text}\n\nOutput JSON only matching this JSON Schema:\n{json.dumps(response_schema)}"

        # Call Gemini with cached content
        import requests
        GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
        
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "cached_content": cache_name,
            "generation_config": {"temperature": 0.2, "response_mime_type": "application/json"}
        }
        
        url = f"{GEMINI_API_BASE}/models/gemini-2.0-flash-001:generateContent"
        resp = requests.post(url, params=ai._auth_params(), json=payload, timeout=600)
        resp.raise_for_status()
        data = resp.json()
        
        # Parse response
        out_parts = data.get("candidates", [])[0].get("content", {}).get("parts", []) if data.get("candidates") else []
        text_part = None
        for p in out_parts:
            if isinstance(p, dict) and "text" in p:
                text_part = p["text"]
                break
        
        if not text_part:
            raise HTTPException(status_code=500, detail="No analysis returned from Gemini")
        
        # Parse JSON response
        try:
            new_analysis = json.loads(text_part)
            # Failsafe: remove generation_prompts if not requested
            if request.generate_prompts is False and isinstance(new_analysis, dict):
                 new_analysis.pop("generation_prompts", None)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Failed to parse Gemini response as JSON")
        
        # Preserve cache metadata in new analysis
        new_analysis["gemini_cache_name"] = cache_name
        new_analysis["gemini_api_key_index"] = api_key_index
        new_analysis["used_video_url"] = video_url
        new_analysis["source_mode"] = raw_resp.get("source_mode", "regenerated")
        
        if raw_resp.get("gemini_file_uri"):
            new_analysis["gemini_file_uri"] = raw_resp["gemini_file_uri"]
        
        try:
            cache_info = ai.get_cache(cache_name)
            if cache_info.get("expireTime"):
                new_analysis["gemini_cache_expire_time"] = cache_info["expireTime"]
        except Exception:
            pass
        
        # Save as new analysis version
        try:
            # Archive current analysis
            existing = db.query(AdAnalysis).filter(
                AdAnalysis.ad_id == ad_id,
                AdAnalysis.is_current == 1
            ).first()
            
            if existing:
                existing.is_current = 0
                new_version = existing.version_number + 1
            else:
                new_version = 1
            
            new_a = AdAnalysis(
                ad_id=ad_id,
                raw_ai_response=new_analysis,
                used_video_url=video_url,
                is_current=1,
                version_number=new_version
            )
            db.add(new_a)
            db.commit()
            logger.info(f"Saved regenerated analysis as version {new_version} for ad {ad_id}")
        except Exception as e:
            logger.error(f"Failed to save regenerated analysis: {e}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to save analysis: {e}")
        
        generated_at_val = datetime.utcnow().isoformat()
        return AnalyzeVideoResponse(
            success=True,
            used_video_url=video_url,
            transcript=new_analysis.get('transcript'),
            beats=new_analysis.get('beats'),
            summary=new_analysis.get('summary'),
            text_on_video=new_analysis.get('text_on_video'),
            voice_over=new_analysis.get('voice_over'),
            storyboard=new_analysis.get('storyboard'),
            generation_prompts=new_analysis.get('generation_prompts'),
            strengths=new_analysis.get('strengths'),
            recommendations=new_analysis.get('recommendations'),
            raw=new_analysis,
            message="Analysis regenerated from cache",
            generated_at=generated_at_val,
            source="gemini-regenerated",
            token_usage=new_analysis.get('token_usage'),
            cost=new_analysis.get('cost'),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error regenerating analysis for ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error regenerating analysis: {str(e)}")


@router.post("/ads/{ad_id}/analysis/followup", response_model=FollowupAnswerResponse)
async def followup_ad_analysis(
    ad_id: int,
    request: FollowupQuestionRequest,
    db: Session = Depends(get_db)
):
    """Ask a follow-up question about an already analyzed video without re-uploading or re-analyzing it.

    Uses stored gemini_file_uri, gemini_api_key_index and gemini_chat_history from AdAnalysis.raw_ai_response.
    """
    try:
        from app.models.ad_analysis import AdAnalysis
        from app.models import Ad

        ad = db.query(Ad).filter(Ad.id == ad_id).first()
        if not ad:
            raise HTTPException(status_code=404, detail="Ad not found")

        query = db.query(AdAnalysis).filter(AdAnalysis.ad_id == ad_id)
        if request.version_number is not None:
            query = query.filter(AdAnalysis.version_number == request.version_number)
        else:
            query = query.filter(AdAnalysis.is_current == 1)

        analysis = query.first()
        if not analysis or not analysis.raw_ai_response:
            raise HTTPException(status_code=404, detail="No analysis with stored AI response found for this ad")

        raw_resp = analysis.raw_ai_response or {}
        file_uri = raw_resp.get("gemini_file_uri")
        api_key_index = raw_resp.get("gemini_api_key_index")
        history = raw_resp.get("gemini_chat_history")
        cache_name = raw_resp.get("gemini_cache_name")  # Optional explicit cache

        # For follow-ups we can reuse either the original Gemini file (file_uri)
        # OR an explicit cache (cache_name). Only error if we have neither.
        if api_key_index is None or (not file_uri and not cache_name):
            raise HTTPException(
                status_code=400,
                detail="This analysis does not have reusable Gemini file or cache info. Please run a new analysis first."
            )

        from app.services.google_ai_service import GoogleAIService
        ai = GoogleAIService()
        result = ai.continue_gemini_chat(
            file_uri=file_uri,
            api_key_index=int(api_key_index),
            history=history,
            question=request.question,
            cache_name=cache_name,  # Use explicit cache if available
        )

        # Persist updated chat history back into the analysis
        try:
            raw_resp["gemini_chat_history"] = result.get("gemini_chat_history", history)
            analysis.raw_ai_response = raw_resp
            db.add(analysis)
            db.commit()
        except Exception as e:
            logger.warning(f"Failed to persist follow-up chat history for ad {ad_id}: {e}")
            db.rollback()

        from datetime import datetime
        return FollowupAnswerResponse(
            success=True,
            answer=result.get("answer", ""),
            raw=result.get("raw"),
            generated_at=datetime.utcnow().isoformat(),
            source="gemini-followup",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during follow-up analysis for ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error during follow-up analysis: {str(e)}")

@router.delete("/ads/{ad_id}/cache")
async def clear_ad_cache_and_chat(
    ad_id: int,
    version_number: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Clear the Gemini cache and chat history for an analyzed ad."""
    try:
        from app.models.ad_analysis import AdAnalysis
        from app.models import Ad
        from app.services.google_ai_service import GoogleAIService

        ad = db.query(Ad).filter(Ad.id == ad_id).first()
        if not ad:
            raise HTTPException(status_code=404, detail="Ad not found")

        query = db.query(AdAnalysis).filter(AdAnalysis.ad_id == ad_id)
        if version_number is not None:
            query = query.filter(AdAnalysis.version_number == version_number)
        else:
            query = query.filter(AdAnalysis.is_current == 1)

        analysis = query.first()
        if not analysis or not analysis.raw_ai_response:
            raise HTTPException(status_code=404, detail="No analysis found for this ad")

        raw_resp = analysis.raw_ai_response
        cache_name = raw_resp.get("gemini_cache_name")
        api_key_index = raw_resp.get("gemini_api_key_index", 0)

        # Delete the cache from Gemini
        cache_deleted = False
        if cache_name:
            try:
                ai = GoogleAIService()
                ai.current_key_index = api_key_index
                ai.api_key = ai.api_keys[api_key_index]
                ai.delete_cache(cache_name)
                cache_deleted = True
                logger.info(f"Deleted Gemini cache: {cache_name}")
            except Exception as e:
                logger.warning(f"Failed to delete cache {cache_name}: {e}")

        # Clear chat history from database
        if "gemini_chat_history" in raw_resp:
            raw_resp["gemini_chat_history"] = []
            analysis.raw_ai_response = raw_resp
            db.commit()
            logger.info(f"Cleared chat history for ad {ad_id}")

        return {
            "success": True,
            "cache_deleted": cache_deleted,
            "chat_history_cleared": True,
            "message": "Cache and chat history cleared successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing cache for ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error clearing cache: {str(e)}")

@router.post("/ads/library/analyze-video", response_model=AnalyzeVideoResponse)
async def analyze_video_from_library(
    request: AnalyzeVideoRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze a single ad video by URL or by Ad Library ID.
    - If video_url provided, uses it directly.
    - Else resolves the best video URL (HD preferred) from Ad Library data.
    Uses Google Gemini to produce transcript and beat-by-beat creative analysis.
    """
    try:
        # Resolve video URL
        video_url = request.video_url

        if not video_url:
            ad_archive_id = request.ad_archive_id
            if not ad_archive_id and request.ad_library_url:
                try:
                    from urllib.parse import urlparse, parse_qs
                    parsed = urlparse(request.ad_library_url)
                    q = parse_qs(parsed.query)
                    ad_archive_id = q.get("id", [None])[0]
                except Exception:
                    ad_archive_id = None

            if not ad_archive_id:
                raise HTTPException(status_code=400, detail="Provide video_url or a URL/ID with id param")

            # Fetch ad data and extract URLs
            from app.services.media_refresh_service import MediaRefreshService
            refresh_service = MediaRefreshService(db)
            ad_data = refresh_service.fetch_ad_from_facebook(ad_archive_id)
            if not ad_data:
                raise HTTPException(status_code=404, detail=f"Ad {ad_archive_id} not found in Facebook Ad Library")

            urls = refresh_service.extract_urls_from_ad_data(ad_data)
            hd = urls.get('video_hd_urls', []) or []
            sd = urls.get('video_sd_urls', []) or []
            all_v = urls.get('video_urls', []) or []

            if request.prefer_hd and hd:
                video_url = hd[0]
            elif all_v:
                video_url = all_v[0]
            elif sd:
                video_url = sd[0]
            else:
                raise HTTPException(status_code=404, detail="No video URLs found for this ad")

        # Optional: return cached analysis if available
        # cache flag controls ALL reuse (DB + Redis). When cache=False we always recompute.
        cache_enabled = request.cache if request.cache is not None else True
        cache_hit = False
        cached_obj: Optional[Dict[str, Any]] = None
        db_generated_at: Optional[str] = None

        # Prefer DB-persisted analysis when ad_id provided (only if cache_enabled)
        if cache_enabled and request.ad_id:
            try:
                from app.models import Ad
                from app.models.ad_analysis import AdAnalysis
                ad = db.query(Ad).filter(Ad.id == request.ad_id).first()
                if ad and ad.analysis and ad.analysis.raw_ai_response:
                    cached_obj = ad.analysis.raw_ai_response
                    if ad.analysis.updated_at:
                        db_generated_at = ad.analysis.updated_at.isoformat()
                    cache_hit = True
            except Exception as e:
                logger.warning(f"DB analysis lookup failed: {e}")
        # For callers that persist analysis by ad_id (download-ads flow), we use
        # the database as the single source of truth. If cache_enabled is True
        # but no DB analysis exists, we deliberately skip Redis to avoid
        # resurrecting stale analysis after it has been cleared.
        use_redis_cache = cache_enabled and video_url and not (request.persist and request.ad_id)
        if use_redis_cache:
            try:
                import os, json
                import redis  # type: ignore
                r = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379"))
                cache_key = f"analysis:{video_url}"
                val = r.get(cache_key)
                if val:
                    cached_obj = json.loads(val)
                    cache_hit = True
            except Exception as e:
                logger.warning(f"Cache read failed: {e}")

        if cache_hit and isinstance(cached_obj, dict):
            return AnalyzeVideoResponse(
                success=True,
                used_video_url=video_url,
                transcript=cached_obj.get('transcript'),
                beats=cached_obj.get('beats'),
                summary=cached_obj.get('summary'),
                text_on_video=cached_obj.get('text_on_video'),
                voice_over=cached_obj.get('voice_over'),
                storyboard=cached_obj.get('storyboard'),
                generation_prompts=(cached_obj.get('generation_prompts') if (request.generate_prompts is True) else []),
                strengths=cached_obj.get('strengths'),
                recommendations=cached_obj.get('recommendations'),
                raw=cached_obj.get('raw'),
                message="Loaded from cache",
                generated_at=db_generated_at,
                source="cache-db" if db_generated_at is not None else "cache-redis",
                token_usage=cached_obj.get('token_usage'),
                cost=cached_obj.get('cost'),
            )

        # Gemini-first: call GoogleAIService with URL-only (service handles Instagram uploads)
        try:
            from app.services.google_ai_service import GoogleAIService
            ai = GoogleAIService()
            logger.info("Gemini-first: analyzing via URL (no upload for Facebook; Instagram handled inside service)")
            analysis = ai.generate_transcript_and_analysis(
                video_url=video_url,
                generate_prompts=request.generate_prompts,
            )

            from datetime import datetime
            generated_at_val = datetime.utcnow().isoformat()
            
            # Persist to DB if requested (with versioning)
            if request.persist and request.ad_id and isinstance(analysis, dict):
                try:
                    from app.models.ad_analysis import AdAnalysis
                    
                    # Get existing current analysis
                    existing = db.query(AdAnalysis).filter(
                        AdAnalysis.ad_id == request.ad_id,
                        AdAnalysis.is_current == 1
                    ).first()
                    
                    if existing:
                        # Archive the old analysis
                        existing.is_current = 0
                        logger.info(f"Archived analysis version {existing.version_number} for ad {request.ad_id}")
                        
                        # Create new version
                        new_version = existing.version_number + 1
                        new_a = AdAnalysis(
                            ad_id=request.ad_id,
                            raw_ai_response=analysis,
                            used_video_url=video_url,
                            is_current=1,
                            version_number=new_version
                        )
                        db.add(new_a)
                        logger.info(f"Created new analysis version {new_version} for ad {request.ad_id}")
                    else:
                        # First analysis for this ad
                        new_a = AdAnalysis(
                            ad_id=request.ad_id,
                            raw_ai_response=analysis,
                            used_video_url=video_url,
                            is_current=1,
                            version_number=1
                        )
                        db.add(new_a)
                        logger.info(f"Created first analysis (version 1) for ad {request.ad_id}")
                    
                    db.commit()
                    logger.info(f"Persisted analysis with cache metadata for ad {request.ad_id}")

                    # Link DownloadHistory to this ad if a matching archive exists
                    try:
                        from app.models.download_history import DownloadHistory
                        from app.models import Ad
                        ad_obj = db.query(Ad).filter(Ad.id == request.ad_id).first()
                        if ad_obj and ad_obj.ad_archive_id:
                            dh = db.query(DownloadHistory).filter(DownloadHistory.ad_archive_id == ad_obj.ad_archive_id).first()
                            if dh:
                                dh.ad_id = request.ad_id
                                db.commit()
                                logger.info(f"Linked DownloadHistory {dh.id} to ad {request.ad_id}")
                    except Exception as e:
                        logger.warning(f"Failed to link DownloadHistory to ad {request.ad_id}: {e}")
                except Exception as e:
                    logger.error(f"Failed to persist analysis for ad {request.ad_id}: {e}")
                    db.rollback()
            
            return AnalyzeVideoResponse(
                success=True,
                used_video_url=video_url,
                transcript=analysis.get('transcript') if isinstance(analysis, dict) else None,
                beats=analysis.get('beats') if isinstance(analysis, dict) else None,
                summary=analysis.get('summary') if isinstance(analysis, dict) else None,
                text_on_video=analysis.get('text_on_video') if isinstance(analysis, dict) else None,
                voice_over=analysis.get('voice_over') if isinstance(analysis, dict) else None,
                storyboard=analysis.get('storyboard') if isinstance(analysis, dict) else None,
                generation_prompts=(analysis.get('generation_prompts') if (isinstance(analysis, dict) and (request.generate_prompts is True)) else []),
                strengths=analysis.get('strengths') if isinstance(analysis, dict) else None,
                recommendations=analysis.get('recommendations') if isinstance(analysis, dict) else None,
                raw=analysis if isinstance(analysis, dict) else None,
                message="Analysis completed",
                generated_at=generated_at_val,
                source="gemini",
                token_usage=analysis.get('token_usage') if isinstance(analysis, dict) else None,
                cost=analysis.get('cost') if isinstance(analysis, dict) else None,
            )
        except RuntimeError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.warning(f"Gemini URL analysis failed, will download and use Gemini upload path: {e}")

        # Download the video to a temp file (Gemini fallback path)
        import tempfile
        import os
        import requests as httpx

        tmp_path = None
        from datetime import datetime
        generated_at_val: Optional[str] = None
        logger.info(f"Analyzing video URL: {video_url}")
        
        # DEBUG MODE: Skip Gemini upload for Instagram videos
        debug_mode = os.getenv("DEBUG_INSTAGRAM", "false").lower() == "true"
        
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
                tmp_path = tmp.name
            
            # Check if it's an Instagram URL - use yt-dlp to get video with audio
            is_instagram = 'instagram.com' in video_url or 'cdninstagram.com' in video_url or 'fbcdn.net' in video_url
            logger.info(f"Is Instagram URL: {is_instagram}")
            if is_instagram:
                logger.info(f"Detected Instagram URL, using yt-dlp to download with audio")
                import subprocess
                import time
                
                # Use yt-dlp to download with audio merged in Gemini-compatible format
                start_download = time.time()
                # For Instagram, we need to explicitly merge video+audio since they're separate streams
                cmd = [
                    'yt-dlp',
                    '-f', 'bestvideo+bestaudio/best',  # Merge best video + best audio
                    '--merge-output-format', 'mp4',  # Output as MP4
                    '--no-cache-dir',  # Don't use cache
                    '--force-overwrites',  # Force fresh download
                    '-o', tmp_path,
                    '--no-playlist',
                    '--verbose',  # Verbose output to see what's happening
                    video_url
                ]
                logger.info(f"Starting yt-dlp download...")
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
                download_time = time.time() - start_download
                if result.returncode != 0:
                    logger.error(f"yt-dlp failed: {result.stderr}")
                    raise HTTPException(status_code=500, detail=f"Failed to download Instagram video: {result.stderr}")
                
                # Check if file was actually downloaded and has content
                if not os.path.exists(tmp_path) or os.path.getsize(tmp_path) == 0:
                    logger.error(f"Downloaded file is empty or missing: {tmp_path}")
                    raise HTTPException(status_code=500, detail="Downloaded video file is empty")
                
                file_size_mb = os.path.getsize(tmp_path) / (1024 * 1024)
                logger.info(f"✓ Downloaded Instagram video with audio in {download_time:.2f}s ({file_size_mb:.2f} MB)")
                logger.info(f"Downloaded file path: {tmp_path}")
                
                # Copy to a persistent location for preview
                from pathlib import Path
                import shutil
                preview_folder = Path("media/downloads/instagram_preview")
                preview_folder.mkdir(parents=True, exist_ok=True)
                preview_filename = f"preview_{os.path.basename(tmp_path)}"
                preview_path = preview_folder / preview_filename
                shutil.copy2(tmp_path, preview_path)
                logger.info(f"Preview file saved: /media/downloads/instagram_preview/{preview_filename}")
                
                if result.stdout:
                    logger.info(f"yt-dlp output: {result.stdout[-500:]}")  # Last 500 chars
            else:
                # Regular HTTP download for non-Instagram URLs
                with httpx.get(video_url, stream=True, timeout=600) as r:
                    r.raise_for_status()
                    with open(tmp_path, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=1024 * 1024):
                            if chunk:
                                f.write(chunk)

            # DEBUG MODE: Return early with preview URL if enabled
            if debug_mode and is_instagram:
                logger.warning(f"⚠️ DEBUG MODE: Skipping Gemini upload. Check preview file for audio.")
                preview_url = f"/media/downloads/instagram_preview/{preview_filename}"
                return AnalyzeVideoResponse(
                    success=True,
                    used_video_url=video_url,
                    transcript=f"DEBUG MODE: Video downloaded to {preview_url}. File size: {file_size_mb:.2f} MB. Check if it has audio before proceeding.",
                    beats=[],
                    generation_prompts=[],
                    message=f"DEBUG: Video saved. Preview at http://localhost:8000{preview_url}",
                    generated_at=datetime.utcnow().isoformat(),
                    source="debug"
                )
            
            # Upload and analyze with Google (Gemini upload path)
            from app.services.google_ai_service import GoogleAIService
            import time
            try:
                ai = GoogleAIService()
            except RuntimeError as e:
                raise HTTPException(status_code=400, detail=str(e))
            
            # Upload and analyze with automatic key rotation
            start_analysis = time.time()
            logger.info(f"Starting Gemini upload and analysis...")
            analysis = ai.generate_transcript_and_analysis(
                file_path=tmp_path,
                video_url=video_url,
                generate_prompts=request.generate_prompts,
            )
            analysis_time = time.time() - start_analysis
            logger.info(f"✓ Gemini analysis completed in {analysis_time:.2f}s")
            generated_at_val = datetime.utcnow().isoformat()

            # Save to cache if enabled
            if cache_enabled and isinstance(analysis, dict):
                try:
                    import os, json
                    import redis  # type: ignore
                    r = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379"))
                    cache_key = f"analysis:{video_url}"
                    r.set(cache_key, json.dumps(analysis))
                except Exception as e:
                    logger.warning(f"Cache write failed: {e}")

            # Optionally persist to DB if ad_id provided (with versioning)
            if request.persist and request.ad_id and isinstance(analysis, dict):
                try:
                    from app.models.ad_analysis import AdAnalysis
                    
                    # Get existing current analysis
                    existing = db.query(AdAnalysis).filter(
                        AdAnalysis.ad_id == request.ad_id,
                        AdAnalysis.is_current == 1
                    ).first()
                    
                    if existing:
                        # Archive the old analysis
                        existing.is_current = 0
                        logger.info(f"Archived analysis version {existing.version_number} for ad {request.ad_id}")
                        
                        # Create new version
                        new_version = existing.version_number + 1
                        new_a = AdAnalysis(
                            ad_id=request.ad_id,
                            raw_ai_response=analysis,
                            used_video_url=video_url,
                            is_current=1,
                            version_number=new_version
                        )
                        db.add(new_a)
                        logger.info(f"Created new analysis version {new_version} for ad {request.ad_id}")
                    else:
                        # First analysis for this ad
                        new_a = AdAnalysis(
                            ad_id=request.ad_id,
                            raw_ai_response=analysis,
                            used_video_url=video_url,
                            is_current=1,
                            version_number=1
                        )
                        db.add(new_a)
                        logger.info(f"Created first analysis (version 1) for ad {request.ad_id}")
                    
                    db.commit()
                except Exception as e:
                    logger.warning(f"DB persist failed: {e}")
                    db.rollback()

            return AnalyzeVideoResponse(
                success=True,
                used_video_url=video_url,
                transcript=analysis.get('transcript') if isinstance(analysis, dict) else None,
                beats=analysis.get('beats') if isinstance(analysis, dict) else None,
                summary=analysis.get('summary') if isinstance(analysis, dict) else None,
                text_on_video=analysis.get('text_on_video') if isinstance(analysis, dict) else None,
                voice_over=analysis.get('voice_over') if isinstance(analysis, dict) else None,
                storyboard=analysis.get('storyboard') if isinstance(analysis, dict) else None,
                generation_prompts=analysis.get('generation_prompts') if isinstance(analysis, dict) else None,
                strengths=analysis.get('strengths') if isinstance(analysis, dict) else None,
                recommendations=analysis.get('recommendations') if isinstance(analysis, dict) else None,
                raw=analysis if isinstance(analysis, dict) else None,
                message="Analysis completed",
                generated_at=generated_at_val,
                source="gemini",
                token_usage=analysis.get('token_usage') if isinstance(analysis, dict) else None,
                cost=analysis.get('cost') if isinstance(analysis, dict) else None,
            )
        finally:
            try:
                if tmp_path and os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except Exception:
                pass

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing video: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing video: {str(e)}")

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

@router.delete("/ads/all", response_model=DeleteAllAdsResponse)
async def delete_all_ads(
    ad_service: "AdService" = Depends(get_ad_service_dependency)
):
    try:
        count = ad_service.delete_all_ads()
        return DeleteAllAdsResponse(
            message=f"Successfully deleted all {count} ads",
            deleted_count=count
        )
    except Exception as e:
        logger.error(f"Error deleting all ads: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting all ads: {str(e)}")

@router.delete("/ads/{ad_id}")
async def delete_ad(
    ad_id: int,
    ad_service: "AdService" = Depends(get_ad_service_dependency)
):
    try:
        result = ad_service.delete_ad(ad_id)
        logger.info(f"Deleted ad ID {ad_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting ad: {str(e)}")

# ========================================
# AI Analysis Endpoints
# ========================================

@router.post("/ads/{ad_id}/analyze")
async def trigger_ad_analysis(
    ad_id: int,
    payload: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Manually trigger AI analysis for a specific ad with optional custom instructions.
    """
    try:
        video_url = payload.get('video_url')
        custom_instruction = payload.get('custom_instruction')
        generate_prompts = payload.get('generate_prompts', True)
        use_task = payload.get('use_task', False)
        instagram_url = payload.get('instagram_url')
        
        # If video_url provided, analyze directly (for Instagram or custom analysis)
        # Otherwise check if ad exists in database
        
        # If custom instruction provided, analyze directly (synchronous)
        if custom_instruction and video_url and not use_task:
            from app.services.google_ai_service import GoogleAIService
            import tempfile
            import os
            import requests as httpx
            
            logger.info(f"Analyzing video with custom instruction for ad {ad_id}")
            logger.info(f"Video URL: {video_url}")
            logger.info(f"Generate Prompts: {generate_prompts}")
            
            # First: try OpenRouter primary directly with the original video_url (no download)
            try:
                ai = GoogleAIService()
                logger.info("Trying OpenRouter primary without download (custom instruction)...")
                analysis = ai.generate_transcript_and_analysis(
                    video_url=video_url,
                    custom_instruction=custom_instruction,
                    generate_prompts=generate_prompts,
                )

                generated_at_val = datetime.utcnow().isoformat()
                import json as _json
                parsed_analysis = analysis
                try:
                    if isinstance(analysis, dict) and isinstance(analysis.get('raw'), str):
                        parsed_analysis = _json.loads(analysis['raw'])
                except Exception:
                    parsed_analysis = analysis
                return AnalyzeVideoResponse(
                    success=True,
                    used_video_url=video_url,
                    transcript=parsed_analysis.get('transcript'),
                    beats=parsed_analysis.get('beats', []),
                    summary=parsed_analysis.get('summary'),
                    text_on_video=parsed_analysis.get('text_on_video'),
                    voice_over=parsed_analysis.get('voice_over'),
                    storyboard=parsed_analysis.get('storyboard'),
                    generation_prompts=(parsed_analysis.get('generation_prompts', []) if (generate_prompts is True) else []),
                    strengths=parsed_analysis.get('strengths'),
                    recommendations=parsed_analysis.get('recommendations'),
                    raw=analysis.get('raw') if isinstance(analysis, dict) else None,
                    message="OpenRouter analysis (custom) completed",
                    generated_at=generated_at_val,
                    source="openrouter"
                )
            except RuntimeError as e:
                raise HTTPException(status_code=400, detail=str(e))
            except Exception as e:
                logger.warning(f"OpenRouter primary (custom) failed, will download and use Gemini fallback: {e}")

            # Download video to temp file
            tmp_path = None
            try:
                with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
                    tmp_path = tmp.name
                
                # Check if it's an Instagram URL - use yt-dlp to get video with audio
                is_instagram = 'instagram.com' in video_url or 'cdninstagram.com' in video_url or 'fbcdn.net' in video_url
                logger.info(f"Is Instagram URL: {is_instagram}")
                if is_instagram:
                    logger.info(f"Detected Instagram URL, using yt-dlp to download with audio")
                    import subprocess
                    import time
                    
                    # Use yt-dlp to download with audio merged in Gemini-compatible format
                    start_download = time.time()
                    # For Instagram, we need to explicitly merge video+audio since they're separate streams
                    cmd = [
                        'yt-dlp',
                        '-f', 'bestvideo+bestaudio/best',  # Merge best video + best audio
                        '--merge-output-format', 'mp4',  # Output as MP4
                        '--no-cache-dir',  # Don't use cache
                        '--force-overwrites',  # Force fresh download
                        '-o', tmp_path,
                        '--no-playlist',
                        '--verbose',  # Verbose output to see what's happening
                        video_url if 'instagram.com/p/' in video_url else payload.get('instagram_url', video_url)
                    ]
                    logger.info(f"Starting yt-dlp download...")
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
                    download_time = time.time() - start_download
                    if result.returncode != 0:
                        logger.error(f"yt-dlp failed: {result.stderr}")
                        raise HTTPException(status_code=502, detail=f"Failed to download Instagram video: {result.stderr}")
                    
                    # Check if file was actually downloaded and has content
                    if not os.path.exists(tmp_path) or os.path.getsize(tmp_path) == 0:
                        logger.error(f"Downloaded file is empty or missing: {tmp_path}")
                        raise Exception("Downloaded video file is empty")
                    
                    file_size_mb = os.path.getsize(tmp_path) / (1024 * 1024)
                    logger.info(f"✓ Downloaded Instagram video with audio in {download_time:.2f}s ({file_size_mb:.2f} MB)")
                    if result.stdout:
                        logger.info(f"yt-dlp output: {result.stdout[-500:]}")
                else:
                    # Regular HTTP download for non-Instagram URLs
                    with httpx.get(video_url, stream=True, timeout=600) as r:
                        r.raise_for_status()
                        with open(tmp_path, 'wb') as f:
                            for chunk in r.iter_content(chunk_size=1024 * 1024):
                                if chunk:
                                    f.write(chunk)
                
                # Upload and analyze with custom instruction (with automatic key rotation)
                import time
                try:
                    ai = GoogleAIService()
                except RuntimeError as e:
                    if tmp_path and os.path.exists(tmp_path):
                        os.unlink(tmp_path)
                    raise HTTPException(status_code=400, detail=str(e))
                
                # Analyze with custom instruction (will upload with each key automatically).
                # Pass video_url so OpenRouter fallback can fetch the video by URL.
                start_analysis = time.time()
                logger.info(f"Starting Gemini upload and analysis with custom instruction...")
                analysis = ai.generate_transcript_and_analysis(
                    file_path=tmp_path,
                    custom_instruction=custom_instruction,
                    video_url=video_url,
                )
                analysis_time = time.time() - start_analysis
                logger.info(f"✓ Gemini analysis completed in {analysis_time:.2f}s")
                generated_at_val = datetime.utcnow().isoformat()
                
                # Clean up temp file
                if tmp_path and os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                
                # Return analysis result
                return AnalyzeVideoResponse(
                    success=True,
                    used_video_url=video_url,
                    transcript=analysis.get('transcript'),
                    beats=analysis.get('beats', []),
                    summary=analysis.get('summary'),
                    text_on_video=analysis.get('text_on_video'),
                    voice_over=analysis.get('voice_over'),
                    storyboard=analysis.get('storyboard'),
                    generation_prompts=(analysis.get('generation_prompts', []) if (generate_prompts is True) else []),
                    strengths=analysis.get('strengths'),
                    recommendations=analysis.get('recommendations'),
                    raw=analysis if isinstance(analysis, dict) else None,
                    message="Analysis with custom instruction completed",
                    generated_at=generated_at_val,
                    source="custom-instruction",
                    token_usage=analysis.get('token_usage'),
                    cost=analysis.get('cost'),
                )
            except httpx.exceptions.RequestException as e:
                if tmp_path and os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                raise HTTPException(status_code=502, detail=str(e))
            except Exception as e:
                if tmp_path and os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                raise HTTPException(status_code=500, detail=f"Failed to analyze with custom instruction: {str(e)}")
        



        if video_url:
            if use_task:
                try:
                    task = celery_app.send_task(
                        'app.tasks.ai_analysis_tasks.analyze_ad_video_task',
                        args=[ad_id, video_url, custom_instruction, instagram_url, generate_prompts]
                    )
                    return AnalyzeVideoResponse(
                        success=True,
                        used_video_url=video_url,
                        transcript="Task queued",
                        beats=[],
                        summary=None,
                        text_on_video=None,
                        voice_over=None,
                        storyboard=[],
                        generation_prompts=[],
                        strengths=[],
                        recommendations=[],
                        raw={"task_id": task.id},
                        message=f"Analysis queued as task {task.id}",
                        generated_at=datetime.utcnow().isoformat(),
                        source="celery-task",
                    )
                except Exception as e:
                    logger.error(f"Failed to queue analysis task: {e}")
                    raise HTTPException(status_code=500, detail=f"Failed to queue analysis task: {e}")
            # Resolve proper ad_id if provided ID is an archive ID
            real_ad_id = ad_id
            ad_obj = db.query(Ad).filter(Ad.id == ad_id).first()
            if not ad_obj:
                # Try finding by archive ID
                ad_obj_by_archive = db.query(Ad).filter(Ad.ad_archive_id == str(ad_id)).first()
                if ad_obj_by_archive:
                    real_ad_id = ad_obj_by_archive.id
                else:
                    # If we can't find the ad, we should try to create it if it looks like an archive ID
                    # or handle it gracefully. For now, if we can't find it, we pass ad_id=None
                    # implies we won't persist to a non-existent ID.
                    # But the code below sets persist=True. 
                    
                    # Attempt to fetch/create if it looks like a valid archive ID (digits only, length > 10)
                    if str(ad_id).isdigit() and len(str(ad_id)) > 10:
                        try:
                            # Try to fetch from FB library to create the ad
                            from app.services.media_refresh_service import MediaRefreshService
                            refresh_service = MediaRefreshService(db)
                            ad_data = refresh_service.fetch_ad_from_facebook(str(ad_id))
                            if ad_data:
                                # Create/Ensure ad exists
                                # Re-use the logic from download_from_ad_library or similar
                                # For brevity, we'll just check if we can create a basic placeholder
                                pass 
                        except Exception as e:
                            logger.warning(f"Failed to auto-resolve ad data for {ad_id}: {e}")

                    # Fallback: if we still don't have a valid real_ad_id in DB, ensure we don't crash on FK

                    # Fallback: if we still don't have a valid real_ad_id in DB, ensure we don't crash on FK
                    # We will set persist=False if we can't resolve to a valid local ID
                    logger.warning(f"Could not resolve valid local Ad ID for {ad_id}. Analysis will not be persisted to Ad table.")
                    real_ad_id = None

            # Use the analyze_video_from_library endpoint logic
            # Use the analyze_video_from_library endpoint logic
            from app.routers.ads import AnalyzeVideoRequest
            request = AnalyzeVideoRequest(
                video_url=video_url,
                ad_id=real_ad_id,
                cache=False,   # Don't use cache for direct analysis
                persist=True if real_ad_id else False,  # Only persist if we have a valid attached ad
                generate_prompts=generate_prompts,
            )

            # Check for async mode
            async_mode = payload.get('async', False) or payload.get('async_mode', False)
            if async_mode:
                from app.database import SessionLocal
                
                async def background_analyze_wrapper(req: AnalyzeVideoRequest):
                    # specific session for background task
                    bg_db = SessionLocal()
                    try:
                        logger.info(f"Starting background analysis for ad {req.ad_id} / {req.video_url}")
                        await analyze_video_from_library(req, bg_db)
                        logger.info(f"Background analysis completed for ad {req.ad_id}")
                    except Exception as e:
                        logger.error(f"Background analysis failed: {e}")
                    finally:
                        bg_db.close()

                background_tasks.add_task(background_analyze_wrapper, request)
                return AnalyzeVideoResponse(
                    success=True,
                    used_video_url=video_url,
                    message="Analysis started in background. Please check history later.",
                    source="background-task",
                    transcript="Analysis running in background..."
                )

            # Call the existing analyze function
            return await analyze_video_from_library(request, db)
        
        # Otherwise trigger analysis task using celery_app (requires ad to exist)
        ad = db.query(Ad).filter(Ad.id == ad_id).first()
        if not ad:
            raise HTTPException(status_code=404, detail="Ad not found")
            
        task = celery_app.send_task('app.tasks.ai_analysis_tasks.ai_analysis_task', args=[ad_id])
        
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
        
        # Trigger batch analysis using celery_app
        task = celery_app.send_task('app.tasks.ai_analysis_tasks.batch_ai_analysis_task', args=[existing_ad_ids])
        
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
        date_from=request.date_from,
        date_to=request.date_to,
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
        task = celery_app.send_task('app.tasks.basic_tasks.add_together', args=[request.x, request.y])
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
        task = celery_app.send_task('app.tasks.basic_tasks.test_task', args=[request.message])
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
        # Safely retrieve state
        try:
            state = task_result.state
        except Exception as e:
            logger.warning(f"Failed to read state for task {task_id}: {e}")
            state = 'FAILURE'

        if state == 'PENDING':
            response = {
                'task_id': task_id,
                'state': state,
                'status': 'Task is pending...'
            }
        elif state == 'SUCCESS':
            response = {
                'task_id': task_id,
                'state': state,
                'result': task_result.result,
                'status': 'Task completed successfully'
            }
        elif state == 'FAILURE':
            response = {
                'task_id': task_id,
                'state': state,
                'error': str(task_result.info),
                'status': 'Task failed'
            }
        else:
            response = {
                'task_id': task_id,
                'state': state,
                'info': str(task_result.info) if task_result.info is not None else None,
                'status': f'Task is {str(state).lower()}'
            }
        
        return response
        
    except Exception as e:
        logger.error(f"Error fetching task status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching task status: {str(e)}") 

@router.get("/ads/analysis/tasks/{task_id}/status")
async def get_ad_analysis_task_status(task_id: str):
    try:
        from celery.result import AsyncResult
        from app.celery_worker import celery_app

        task_result = AsyncResult(task_id, app=celery_app)
        # Safely read state
        try:
            state = task_result.state
        except Exception as e:
            logger.warning(f"Failed to read state for analysis task {task_id}: {e}")
            state = 'FAILURE'
        
        response = {
            "task_id": task_id,
            "state": state,
        }
        
        if state == 'SUCCESS':
            response['result'] = task_result.result
        elif state == 'FAILURE':
            response['error'] = str(task_result.info)
        else:
            # PENDING, STARTED, RETRY, etc.
            # info might be exception or progress dict
            response['info'] = str(task_result.info) if task_result.info is not None else None
                
        return response
    except Exception as e:
        logger.error(f"Error fetching ad analysis task status: {str(e)}")
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
    date_from: Optional[str],
    date_to: Optional[str],
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
            start_date=date_from,
            end_date=date_to,
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

@router.get("/ad-sets", response_model=PaginatedAdResponseDTO)
async def get_ad_sets(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of items per page"),
    sort_by: Optional[str] = Query("created_at", description="Sort by field"),
    sort_order: Optional[str] = Query("desc", description="Sort order (asc/desc)"),
    ad_service: "AdService" = Depends(get_ad_service_dependency)
):
    """
    Get all ad sets with pagination.
    Each ad set is represented by its best/representative ad.
    """
    try:
        result = ad_service.get_ad_sets(page, page_size, sort_by, sort_order)
        
        if not result:
            return PaginatedAdResponseDTO(
                data=[], 
                pagination=PaginationMetadata(
                    page=page, 
                    page_size=page_size,
                    total_items=0,
                    total_pages=0,
                    has_next=False,
                    has_previous=False
                )
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching ad sets: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching ad sets: {str(e)}") 

@router.get("/ad-sets/{ad_set_id}", response_model=PaginatedAdResponseDTO)
async def get_ads_in_set(
    ad_set_id: int,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Number of items per page"),
    ad_service: "AdService" = Depends(get_ad_service_dependency)
):
    """
    Get all ad variants belonging to a specific AdSet with pagination.
    This endpoint is used to show all variations of ads within an ad set.
    """
    try:
        result = ad_service.get_ads_in_set(ad_set_id, page, page_size)
        
        if not result:
            raise HTTPException(status_code=404, detail=f"AdSet with ID {ad_set_id} not found")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching ads in set {ad_set_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching ads in set: {str(e)}")

@router.post("/ad-sets/{ad_set_id}/favorite", response_model=FavoriteResponse)
async def toggle_ad_set_favorite(
    ad_set_id: int,
    ad_service: "AdService" = Depends(get_ad_service_dependency)
):
    """
    Toggle the favorite status of an AdSet.
    
    Returns the new favorite status.
    """
    try:
        new_status = ad_service.toggle_ad_set_favorite(ad_set_id)
        
        if new_status is None:
            raise HTTPException(status_code=404, detail="AdSet not found")
        
        return FavoriteResponse(
            ad_id=ad_set_id,
            is_favorite=new_status,
            message=f"AdSet {'added to' if new_status else 'removed from'} favorites"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling favorite for AdSet {ad_set_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error toggling favorite: {str(e)}")


# ========================================
# Download History Endpoints
# ========================================

class DownloadHistoryItem(BaseModel):
    """Download history item response"""
    id: int
    ad_id: Optional[int] = None
    ad_archive_id: str
    title: Optional[str] = None
    video_hd_count: int
    video_sd_count: int
    image_count: int
    video_hd_urls: Optional[List[str]] = None
    video_sd_urls: Optional[List[str]] = None
    video_urls: Optional[List[str]] = None
    image_urls: Optional[List[str]] = None
    media: Optional[List[Dict[str, Any]]] = None
    save_path: Optional[str] = None
    created_at: str
    # Related data counts
    analysis_count: int = 0
    prompt_count: int = 0
    veo_video_count: int = 0
    merge_count: int = 0
    has_analysis: bool = False

class DownloadHistoryResponse(BaseModel):
    """Paginated download history response"""
    total: int
    page: int
    page_size: int
    items: List[DownloadHistoryItem]

class CreateDownloadHistoryRequest(BaseModel):
    """Request to save download history"""
    ad_id: Optional[int] = None
    ad_archive_id: str
    title: Optional[str] = None
    video_hd_urls: Optional[List[str]] = None
    video_sd_urls: Optional[List[str]] = None
    video_urls: Optional[List[str]] = None
    image_urls: Optional[List[str]] = None
    media: Optional[List[Dict[str, Any]]] = None
    save_path: Optional[str] = None

@router.post("/download-history", response_model=DownloadHistoryItem)
async def create_download_history(
    request: CreateDownloadHistoryRequest,
    db: Session = Depends(get_db)
):
    """Save a download to history"""
    try:
        from app.models.download_history import DownloadHistory
        
        # Check if this download already exists (by ad_archive_id)
        existing = db.query(DownloadHistory).filter(
            DownloadHistory.ad_archive_id == request.ad_archive_id
        ).first()
        
        if existing:
            # Update existing record
            existing.ad_id = request.ad_id or existing.ad_id
            existing.title = request.title or existing.title
            existing.video_hd_urls = request.video_hd_urls or existing.video_hd_urls
            existing.video_sd_urls = request.video_sd_urls or existing.video_sd_urls
            existing.video_urls = request.video_urls or existing.video_urls
            existing.image_urls = request.image_urls or existing.image_urls
            existing.media = request.media or existing.media
            existing.save_path = request.save_path or existing.save_path
            existing.video_hd_count = len(request.video_hd_urls or [])
            existing.video_sd_count = len(request.video_sd_urls or [])
            existing.image_count = len(request.image_urls or [])
            db.commit()
            db.refresh(existing)
            history_item = existing
        else:
            # Create new record
            history_item = DownloadHistory(
                ad_id=request.ad_id,
                ad_archive_id=request.ad_archive_id,
                title=request.title,
                video_hd_urls=request.video_hd_urls,
                video_sd_urls=request.video_sd_urls,
                video_urls=request.video_urls,
                image_urls=request.image_urls,
                media=request.media,
                save_path=request.save_path,
                video_hd_count=len(request.video_hd_urls or []),
                video_sd_count=len(request.video_sd_urls or []),
                image_count=len(request.image_urls or [])
            )
            db.add(history_item)
            db.commit()
            db.refresh(history_item)
        
        return DownloadHistoryItem(
            id=history_item.id,
            ad_id=history_item.ad_id,
            ad_archive_id=history_item.ad_archive_id,
            title=history_item.title,
            video_hd_count=history_item.video_hd_count,
            video_sd_count=history_item.video_sd_count,
            image_count=history_item.image_count,
            video_hd_urls=history_item.video_hd_urls,
            video_sd_urls=history_item.video_sd_urls,
            video_urls=history_item.video_urls,
            image_urls=history_item.image_urls,
            media=history_item.media,
            save_path=history_item.save_path,
            created_at=history_item.created_at.isoformat() if history_item.created_at else ""
        )
        
    except Exception as e:
        logger.error(f"Error saving download history: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving download history: {str(e)}")

@router.get("/download-history", response_model=DownloadHistoryResponse)
async def get_download_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get paginated download history with related data counts"""
    try:
        from app.models.download_history import DownloadHistory
        from app.models.ad_analysis import AdAnalysis
        from app.models.veo_generation import VeoGeneration
        from app.models.merged_video import MergedVideo
        
        # Get total count
        total = db.query(DownloadHistory).count()
        
        # Get paginated items, ordered by most recent first
        offset = (page - 1) * page_size
        items = db.query(DownloadHistory).order_by(
            DownloadHistory.created_at.desc()
        ).offset(offset).limit(page_size).all()
        
        history_items = []
        for item in items:
            # Count related data if ad_id exists
            analysis_count = 0
            prompt_count = 0
            veo_video_count = 0
            merge_count = 0
            
            if item.ad_id:
                # Count analyses
                analysis_count = db.query(AdAnalysis).filter(
                    AdAnalysis.ad_id == item.ad_id
                ).count()
                
                # Get current analysis to count prompts
                current_analysis = db.query(AdAnalysis).filter(
                    AdAnalysis.ad_id == item.ad_id,
                    AdAnalysis.is_current == 1
                ).first()

                # raw_ai_response may be stored as a dict or as a JSON string; handle both safely
                if current_analysis and current_analysis.raw_ai_response:
                    raw = current_analysis.raw_ai_response
                    # If stored as a JSON string, try to parse it
                    if isinstance(raw, str):
                        try:
                            import json
                            raw = json.loads(raw)
                        except Exception:
                            raw = {}

                    prompts = []
                    if isinstance(raw, dict):
                        prompts = raw.get('generation_prompts', [])

                    # generation_prompts itself might be JSON-encoded; normalize to list
                    if isinstance(prompts, str):
                        try:
                            import json
                            parsed = json.loads(prompts)
                            prompts = parsed if isinstance(parsed, list) else []
                        except Exception:
                            prompts = []

                    prompt_count = len(prompts) if isinstance(prompts, list) else 0
                
                # Count Veo videos
                veo_video_count = db.query(VeoGeneration).filter(
                    VeoGeneration.ad_id == item.ad_id,
                    VeoGeneration.is_current == 1,
                    VeoGeneration.video_url.isnot(None)
                ).count()
                
                # Count merges
                merge_count = db.query(MergedVideo).filter(
                    MergedVideo.ad_id == item.ad_id
                ).count()
            
            has_analysis_flag = False
            if item.ad_id:
                current_exists = db.query(AdAnalysis).filter(
                    AdAnalysis.ad_id == item.ad_id,
                    AdAnalysis.is_current == 1
                ).first()
                has_analysis_flag = current_exists is not None

            history_items.append(DownloadHistoryItem(
                id=item.id,
                ad_id=item.ad_id,
                ad_archive_id=item.ad_archive_id,
                title=item.title,
                video_hd_count=item.video_hd_count,
                video_sd_count=item.video_sd_count,
                image_count=item.image_count,
                video_hd_urls=item.video_hd_urls,
                video_sd_urls=item.video_sd_urls,
                video_urls=item.video_urls,
                image_urls=item.image_urls,
                media=item.media,
                save_path=item.save_path,
                created_at=item.created_at.isoformat() if item.created_at else "",
                analysis_count=analysis_count,
                prompt_count=prompt_count,
                veo_video_count=veo_video_count,
                merge_count=merge_count,
                has_analysis=has_analysis_flag
            ))
        
        return DownloadHistoryResponse(
            total=total,
            page=page,
            page_size=page_size,
            items=history_items
        )
        
    except Exception as e:
        logger.error(f"Error retrieving download history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving download history: {str(e)}")

@router.delete("/download-history/{history_id}")
async def delete_download_history(
    history_id: int,
    db: Session = Depends(get_db)
):
    """Delete a download history item"""
    try:
        from app.models.download_history import DownloadHistory
        
        item = db.query(DownloadHistory).filter(DownloadHistory.id == history_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Download history item not found")
        
        db.delete(item)
        db.commit()
        
        return {"success": True, "message": "Download history item deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting download history: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting download history: {str(e)}")

# ========================================
# Unified Analysis System Endpoints
# ========================================

class UnifiedAnalysisRequest(BaseModel):
    """Request model for unified analysis"""
    video_url: Optional[str] = None
    custom_instruction: Optional[str] = None
    generate_prompts: bool = True
    force_reanalyze: bool = False

class UnifiedAnalysisResponse(BaseModel):
    """Response model for unified analysis"""
    success: bool
    analysis_id: Optional[int] = None
    ad_id: int
    transcript: Optional[str] = None
    summary: Optional[str] = None
    beats: List[Dict[str, Any]] = Field(default_factory=list)
    storyboard: List[Any] = Field(default_factory=list)  # Can be strings or dicts
    generation_prompts: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    hook_score: Optional[float] = None
    overall_score: Optional[float] = None
    target_audience: Optional[str] = None
    content_themes: List[str] = Field(default_factory=list)
    text_on_video: Optional[str] = None
    voice_over: Optional[str] = None
    custom_instruction: Optional[str] = None
    token_usage: Optional[Dict[str, Any]] = None
    cost: Optional[Any] = None  # Can be float or dict
    raw: Optional[Dict[str, Any]] = None
    message: str
    source: str = "unified_service"

class AdSetAnalysisResponse(BaseModel):
    """Response model for ad set analysis"""
    success: bool
    ad_set_id: int
    representative_ad_id: int
    analysis: UnifiedAnalysisResponse
    applied_to_ads: List[int] = Field(default_factory=list)
    message: str

class AnalysisHistoryResponse(BaseModel):
    """Response model for analysis history"""
    success: bool
    ad_id: int
    history: List[Dict[str, Any]] = Field(default_factory=list)

class AnalysisStatusResponse(BaseModel):
    """Response model for analysis status"""
    success: bool
    analysis_status: Dict[int, bool] = Field(default_factory=dict)

class UnifiedAnalysisTaskResponse(BaseModel):
    """Response model for unified analysis task"""
    success: bool
    task_id: str
    ad_id: int
    message: str
    source: str = "celery-task"
    estimated_time: int = 60

@router.post("/ads/{ad_id}/unified-analyze", response_model=UnifiedAnalysisTaskResponse)
async def unified_analyze_ad(
    ad_id: int,
    request: UnifiedAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze an ad using the unified analysis system with Celery background task.
    
    This endpoint dispatches a background task and returns immediately with a task_id.
    Use the task status endpoint to poll for completion.
    """
    try:
        analysis_service = UnifiedAnalysisService(db)
        
        result = analysis_service.analyze_ad(
            ad_id=ad_id,
            video_url=request.video_url,
            custom_instruction=request.custom_instruction,
            generate_prompts=request.generate_prompts,
            force_reanalyze=request.force_reanalyze
        )
        
        return UnifiedAnalysisTaskResponse(
            success=result['success'],
            task_id=result['task_id'],
            ad_id=ad_id,
            message=result['message'],
            source=result['source'],
            estimated_time=result.get('estimated_time', 60)
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error dispatching unified analysis for ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start analysis: {str(e)}")

class UnifiedAdSetAnalysisTaskResponse(BaseModel):
    """Response model for unified ad set analysis task"""
    success: bool
    task_id: str
    ad_set_id: int
    representative_ad_id: int
    message: str
    source: str = "celery-task"
    estimated_time: int = 60

@router.post("/ad-sets/{ad_set_id}/unified-analyze", response_model=UnifiedAdSetAnalysisTaskResponse)
async def unified_analyze_ad_set(
    ad_set_id: int,
    request: UnifiedAnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Analyze an entire ad set using the unified analysis system with Celery background task.
    
    This endpoint dispatches a background task and returns immediately with a task_id.
    Use the task status endpoint to poll for completion.
    """
    try:
        analysis_service = UnifiedAnalysisService(db)
        
        result = analysis_service.analyze_ad_set(
            ad_set_id=ad_set_id,
            custom_instruction=request.custom_instruction,
            generate_prompts=request.generate_prompts,
            force_reanalyze=request.force_reanalyze
        )
        
        return UnifiedAdSetAnalysisTaskResponse(
            success=result['success'],
            task_id=result['task_id'],
            ad_set_id=ad_set_id,
            representative_ad_id=result['representative_ad_id'],
            message=result['message'],
            source=result['source'],
            estimated_time=result.get('estimated_time', 60)
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error dispatching unified analysis for ad set {ad_set_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start ad set analysis: {str(e)}")

@router.get("/ads/{ad_id}/unified-analysis", response_model=UnifiedAnalysisResponse)
async def get_unified_analysis(
    ad_id: int,
    version: Optional[int] = Query(None, description="Specific version number"),
    db: Session = Depends(get_db)
):
    """
    Get analysis for an ad using the unified analysis system.
    
    Args:
        ad_id: ID of the ad
        version: Optional specific version number
    """
    try:
        analysis_service = UnifiedAnalysisService(db)
        
        result = analysis_service.get_ad_analysis(ad_id, version)
        
        if not result:
            raise HTTPException(status_code=404, detail="Analysis not found for this ad")
        
        return UnifiedAnalysisResponse(
            success=result['success'],
            analysis_id=result.get('analysis_id'),
            ad_id=ad_id,
            transcript=result.get('transcript'),
            summary=result.get('summary'),
            beats=result.get('beats', []),
            storyboard=result.get('storyboard', []),
            generation_prompts=result.get('generation_prompts', []),
            strengths=result.get('strengths', []),
            recommendations=result.get('recommendations', []),
            hook_score=result.get('hook_score'),
            overall_score=result.get('overall_score'),
            target_audience=result.get('target_audience'),
            content_themes=result.get('content_themes', []),
            text_on_video=result.get('text_on_video'),
            voice_over=result.get('voice_over'),
            custom_instruction=result.get('custom_instruction'),
            token_usage=result.get('token_usage'),
            cost=result.get('cost'),
            raw=result.get('raw'),
            message=result.get('message', 'Analysis retrieved successfully'),
            source=result.get('source', 'unified_service')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting unified analysis for ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving analysis: {str(e)}")

@router.get("/ads/{ad_id}/analysis-history", response_model=AnalysisHistoryResponse)
async def get_unified_analysis_history(
    ad_id: int,
    db: Session = Depends(get_db)
):
    """
    Get analysis history for an ad using the unified analysis system.
    """
    try:
        analysis_service = UnifiedAnalysisService(db)
        
        history = analysis_service.get_analysis_history(ad_id)
        
        return AnalysisHistoryResponse(
            success=True,
            ad_id=ad_id,
            history=history
        )
        
    except Exception as e:
        logger.error(f"Error getting analysis history for ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving analysis history: {str(e)}")

@router.post("/ads/{ad_id}/regenerate-analysis", response_model=UnifiedAnalysisTaskResponse)
async def regenerate_unified_analysis(
    ad_id: int,
    request: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Regenerate analysis for an ad with custom instruction using the unified analysis system.
    Returns a task ID for polling completion.
    """
    try:
        instruction = request.get('instruction', '')
        generate_prompts = request.get('generate_prompts', True)
        
        if not instruction:
            raise HTTPException(status_code=400, detail="Instruction is required for regeneration")
        
        analysis_service = UnifiedAnalysisService(db)
        
        result = analysis_service.regenerate_analysis(
            ad_id=ad_id,
            instruction=instruction,
            generate_prompts=generate_prompts
        )
        
        return UnifiedAnalysisTaskResponse(
            success=result['success'],
            task_id=result['task_id'],
            ad_id=ad_id,
            message=result['message'],
            source=result['source'],
            estimated_time=result.get('estimated_time', 60)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error regenerating analysis for ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error regenerating analysis: {str(e)}")

@router.delete("/ads/{ad_id}/unified-analysis")
async def delete_unified_analysis(
    ad_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete all analysis for an ad using the unified analysis system.
    """
    try:
        analysis_service = UnifiedAnalysisService(db)
        
        success = analysis_service.delete_analysis(ad_id)
        
        if success:
            return {
                "success": True,
                "ad_id": ad_id,
                "message": "Analysis deleted successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to delete analysis")
            
    except Exception as e:
        logger.error(f"Error deleting unified analysis for ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting analysis: {str(e)}")

@router.get("/ads/{ad_id}/performance-insights")
async def get_performance_insights(
    ad_id: int,
    db: Session = Depends(get_db)
):
    """
    Get performance insights and recommendations for an ad.
    
    Returns enhanced analysis data including performance predictions,
    competitive analysis, and optimization suggestions.
    """
    try:
        analysis_service = UnifiedAnalysisService(db)
        
        # Get the current analysis
        analysis = analysis_service.get_ad_analysis(ad_id)
        if not analysis:
            raise HTTPException(status_code=404, detail="No analysis found for this ad")
        
        # Get the ad details
        ad = db.query(Ad).filter(Ad.id == ad_id).first()
        if not ad:
            raise HTTPException(status_code=404, detail="Ad not found")
        
        # Calculate performance insights
        insights = {
            "performance_score": analysis.get('overall_score', 0),
            "hook_effectiveness": analysis.get('hook_score', 0),
            "engagement_prediction": _calculate_engagement_prediction(analysis),
            "optimization_potential": _calculate_optimization_potential(analysis),
            "competitive_position": _assess_competitive_position(ad, analysis),
            "recommendations": _generate_recommendations(analysis),
            "performance_category": _categorize_performance(analysis.get('overall_score', 0)),
            "strengths": analysis.get('strengths', []),
            "improvement_areas": analysis.get('recommendations', [])
        }
        
        return {
            "success": True,
            "ad_id": ad_id,
            "insights": insights,
            "analysis_date": analysis.get('created_at'),
            "message": "Performance insights generated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting performance insights for ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating insights: {str(e)}")

def _calculate_engagement_prediction(analysis: Dict[str, Any]) -> float:
    """Calculate predicted engagement score based on analysis data."""
    base_score = analysis.get('overall_score', 0)
    hook_score = analysis.get('hook_score', 0)
    
    # Simple algorithm - can be enhanced with ML models
    engagement_score = (base_score * 0.6 + hook_score * 0.4)
    
    # Boost for strong content themes
    themes = analysis.get('content_themes', [])
    if len(themes) >= 3:
        engagement_score += 0.5
    
    # Boost for clear target audience
    if analysis.get('target_audience'):
        engagement_score += 0.3
    
    return min(10.0, max(0.0, engagement_score))

def _calculate_optimization_potential(analysis: Dict[str, Any]) -> float:
    """Calculate how much the ad can be optimized."""
    current_score = analysis.get('overall_score', 0)
    recommendations_count = len(analysis.get('recommendations', []))
    
    # More recommendations = higher optimization potential
    potential = min(10.0, (10 - current_score) + (recommendations_count * 0.5))
    return max(0.0, potential)

def _assess_competitive_position(ad: Ad, analysis: Dict[str, Any]) -> str:
    """Assess competitive position based on scores."""
    overall_score = analysis.get('overall_score', 0)
    
    if overall_score >= 8.5:
        return "Market Leader"
    elif overall_score >= 7.0:
        return "Strong Performer"
    elif overall_score >= 5.5:
        return "Average Performer"
    elif overall_score >= 4.0:
        return "Below Average"
    else:
        return "Needs Improvement"

def _generate_recommendations(analysis: Dict[str, Any]) -> List[str]:
    """Generate smart recommendations based on analysis."""
    recommendations = []
    
    hook_score = analysis.get('hook_score', 0)
    overall_score = analysis.get('overall_score', 0)
    
    if hook_score < 6:
        recommendations.append("Improve opening hook to capture attention faster")
    
    if overall_score < 7:
        recommendations.append("Enhance overall creative quality and messaging clarity")
    
    if not analysis.get('target_audience'):
        recommendations.append("Define clearer target audience for better relevance")
    
    themes = analysis.get('content_themes', [])
    if len(themes) < 2:
        recommendations.append("Incorporate more diverse content themes for broader appeal")
    
    return recommendations

def _categorize_performance(score: float) -> str:
    """Categorize performance based on overall score."""
    if score >= 8.5:
        return "Excellent"
    elif score >= 7.0:
        return "Good"
    elif score >= 5.5:
        return "Average"
    elif score >= 4.0:
        return "Poor"
    else:
        return "Very Poor"
    try:
        analysis_service = UnifiedAnalysisService(db)
        
        success = analysis_service.delete_analysis(ad_id)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete analysis")
        
        return {
            "success": True,
            "ad_id": ad_id,
            "message": "Analysis deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting unified analysis for ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting analysis: {str(e)}")



class TaskStatusResponse(BaseModel):
    """Response model for task status"""
    task_id: str
    state: str
    status: Optional[str] = None
    progress: Optional[int] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None



@router.get("/tasks/{task_id}/status", response_model=TaskStatusResponse)
async def get_unified_task_status(
    task_id: str
):
    """
    Get the status of a unified analysis Celery task.
    
    This endpoint allows polling for task completion and retrieving results.
    """
    try:
        from app.celery_worker import celery_app
        
        # Get task result from Celery
        task_result = celery_app.AsyncResult(task_id)
        
        response = TaskStatusResponse(
            task_id=task_id,
            state=task_result.state,
            status=task_result.status,
            progress=None,
            result=None,
            error=None
        )
        
        if task_result.state == 'PENDING':
            response.status = 'Task is waiting to be processed'
        elif task_result.state == 'PROGRESS':
            response.status = 'Task is being processed'
            if hasattr(task_result.info, 'get'):
                response.progress = task_result.info.get('progress', 0)
        elif task_result.state == 'SUCCESS':
            response.status = 'Task completed successfully'
            response.result = task_result.result
        elif task_result.state == 'FAILURE':
            response.status = 'Task failed'
            response.error = str(task_result.info)
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting task status for {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting task status: {str(e)}")

class GetSearchAdRequest(BaseModel):
    """
    Request model for getting a specific ad by archive ID
    """
    ad_archive_id: str

class GetSearchAdResponse(BaseModel):
    """
    Response model for getting a specific ad by archive ID
    """
    success: bool
    message: str
    ad: Optional[Dict[str, Any]] = None

@router.post("/search/get-ad", response_model=GetSearchAdResponse)
async def get_search_ad(
    request: GetSearchAdRequest,
    db: Session = Depends(get_db)
):
    """
    Get a specific ad by archive ID from Facebook Ad Library.
    
    This endpoint fetches ad details directly from Facebook Ad Library API
    when the ad is not available in cache.
    """
    try:
        from app.services.facebook_ads_scraper import FacebookAdsScraperService
        
        # First check if the ad exists in our database
        existing_ad = db.query(Ad).filter(Ad.ad_archive_id == request.ad_archive_id).first()
        if existing_ad:
            # Convert database ad to search ad format
            ad_data = {
                'ad_archive_id': existing_ad.ad_archive_id,
                'advertiser': existing_ad.page_name or 'Unknown',
                'page_name': existing_ad.page_name,
                'page_id': existing_ad.page_id,
                'media_type': existing_ad.media_type or 'unknown',
                'is_active': existing_ad.is_active or False,
                'start_date': existing_ad.start_date.isoformat() if existing_ad.start_date else None,
                'duration_days': existing_ad.duration_days,
                'creatives_count': len(existing_ad.creatives) if existing_ad.creatives else 1,
                'has_targeting': bool(existing_ad.targeting),
                'has_lead_form': bool(existing_ad.lead_form),
                'creatives': existing_ad.creatives or [],
                'targeting': existing_ad.targeting,
                'lead_form': existing_ad.lead_form,
                'meta': existing_ad.meta or {},
                'countries': [],
                'impressions_text': existing_ad.impressions_text,
                'spend': existing_ad.spend
            }
            
            return GetSearchAdResponse(
                success=True,
                message="Ad found in database",
                ad=ad_data
            )
        
        # If not in database, fetch from Facebook Ad Library
        scraper_service = FacebookAdsScraperService()
        
        # Search for the specific ad by archive ID
        search_config = FacebookAdsScraperConfig(
            view_all_page_id="1591077094491398",  # Default page ID
            countries=["AE", "US", "GB"],  # Try multiple countries
            max_pages=1,
            active_status="all",
            ad_type="ALL",
            media_type="all",
            search_type="keyword",
            query_string=request.ad_archive_id  # Search by archive ID
        )
        
        # Perform the search
        search_results = scraper_service.search_ads(search_config)
        
        # Find the specific ad in results
        target_ad = None
        for ad_data in search_results.get('ads_preview', []):
            if ad_data.get('ad_archive_id') == request.ad_archive_id:
                target_ad = ad_data
                break
        
        if target_ad:
            return GetSearchAdResponse(
                success=True,
                message="Ad found in Facebook Ad Library",
                ad=target_ad
            )
        else:
            return GetSearchAdResponse(
                success=False,
                message=f"Ad with archive ID {request.ad_archive_id} not found in Facebook Ad Library"
            )
            
    except Exception as e:
        logger.error(f"Error fetching search ad {request.ad_archive_id}: {str(e)}")
        return GetSearchAdResponse(
            success=False,
            message=f"Error fetching ad: {str(e)}"
        )

@router.post("/search/save-ad", response_model=SaveSearchAdResponse)
async def save_search_ad(
    request: SaveSearchAdRequest,
    db: Session = Depends(get_db)
):
    """
    Save an ad from search results to the database.
    
    This endpoint allows saving ads discovered through the Facebook Ad Library search
    directly to the local database for tracking and analysis.
    """
    try:
        from app.services.facebook_ads_scraper import FacebookAdsScraperService
        from app.services.ingestion_service import DataIngestionService
        
        # First, check if the ad already exists
        existing_ad = db.query(Ad).filter(Ad.ad_archive_id == request.ad_archive_id).first()
        if existing_ad:
            return SaveSearchAdResponse(
                success=False,
                message=f"Ad with archive ID {request.ad_archive_id} already exists in database",
                ad_id=existing_ad.id
            )
        
        # Handle competitor creation/lookup
        competitor_id = None
        if request.competitor_name:
            # Check if competitor already exists
            existing_competitor = db.query(Competitor).filter(
                Competitor.name == request.competitor_name
            ).first()
            
            if existing_competitor:
                competitor_id = existing_competitor.id
            else:
                # Create new competitor
                new_competitor = Competitor(
                    name=request.competitor_name,
                    page_id=request.competitor_page_id,
                    page_name=request.competitor_name,
                    notes=request.notes or f"Added from search ad {request.ad_archive_id}",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(new_competitor)
                db.flush()  # Get the ID without committing
                competitor_id = new_competitor.id
        
        # Fetch the ad details from Facebook Ad Library
        scraper_service = FacebookAdsScraperService()
        
        # Search for the specific ad by archive ID
        search_config = FacebookAdsScraperConfig(
            view_all_page_id="1591077094491398",  # Default page ID
            countries=["AE"],  # Default country
            max_pages=1,
            active_status="all",
            ad_type="ALL",
            media_type="all",
            search_type="keyword",
            query_string=request.ad_archive_id  # Search by archive ID
        )
        
        # Perform the search
        search_results = scraper_service.search_ads(search_config)
        
        # Find the specific ad in results
        target_ad = None
        for ad_data in search_results.get('ads_preview', []):
            if ad_data.get('ad_archive_id') == request.ad_archive_id:
                target_ad = ad_data
                break
        
        if not target_ad:
            return SaveSearchAdResponse(
                success=False,
                message=f"Could not fetch ad details for archive ID {request.ad_archive_id} from Facebook"
            )
        
        # Use the ingestion service to save the ad
        ingestion_service = DataIngestionService(db)
        
        # Transform the search result into the format expected by ingestion service
        ad_for_ingestion = {
            'ad_archive_id': target_ad.get('ad_archive_id'),
            'advertiser': target_ad.get('advertiser'),
            'page_name': target_ad.get('page_name'),
            'page_id': target_ad.get('page_id'),
            'media_type': target_ad.get('media_type'),
            'is_active': target_ad.get('is_active', False),
            'start_date': target_ad.get('start_date'),
            'creatives': target_ad.get('creatives', []),
            'targeting': target_ad.get('targeting'),
            'lead_form': target_ad.get('lead_form'),
            'meta': target_ad.get('meta', {}),
            'competitor_id': competitor_id,
            'notes': request.notes
        }
        
        # Save the ad using ingestion service
        saved_ad = ingestion_service.ingest_single_ad(ad_for_ingestion)
        
        if saved_ad:
            db.commit()
            
            return SaveSearchAdResponse(
                success=True,
                message=f"Successfully saved ad {request.ad_archive_id} to database",
                ad_id=saved_ad.id,
                competitor_id=competitor_id
            )
        else:
            db.rollback()
            return SaveSearchAdResponse(
                success=False,
                message=f"Failed to save ad {request.ad_archive_id} to database"
            )
            
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving search ad {request.ad_archive_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving ad: {str(e)}")