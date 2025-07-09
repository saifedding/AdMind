from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.database import get_db
from app.core.config import settings
from app.services.ingestion_service import DataIngestionService
from app.models.dto import AdCreate, AdIngestionResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/internal", tags=["internal"])

# Security
security = HTTPBearer(auto_error=False)

# API Key for internal services (can be set via environment variable)
INTERNAL_API_KEY = settings.INTERNAL_API_KEY


async def verify_api_key(
    authorization: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_api_key: Optional[str] = Header(None)
) -> bool:
    """
    Verify API key for internal endpoints.
    Supports both Bearer token and X-API-Key header methods.
    """
    provided_key = None
    
    # Check Bearer token first
    if authorization:
        provided_key = authorization.credentials
    
    # Check X-API-Key header as fallback
    elif x_api_key:
        provided_key = x_api_key
    
    if not provided_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required. Provide via Authorization header (Bearer token) or X-API-Key header"
        )
    
    if provided_key != INTERNAL_API_KEY:
        logger.warning(f"Invalid API key attempt: {provided_key[:10]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    return True


@router.post("/ingest", response_model=AdIngestionResponse)
async def ingest_ad(
    ad_data: AdCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key)
) -> AdIngestionResponse:
    """
    Ingest a single ad from external scraper.
    
    This is the main endpoint that external scraping scripts should use
    to submit raw ad data to the system.
    
    **Security**: Requires API key authentication.
    
    **Process**:
    1. Validates incoming ad data
    2. Creates/updates competitor record
    3. Creates/updates ad record
    4. Triggers AI analysis task
    
    **Example Usage**:
    ```bash
    curl -X POST "http://localhost:8000/api/v1/internal/ingest" \
         -H "X-API-Key: your-api-key" \
         -H "Content-Type: application/json" \
         -d '{
           "ad_archive_id": "1234567890",
           "competitor": {
             "name": "Example Company",
             "page_id": "example123"
           },
           "ad_copy": "Amazing product!",
           "media_type": "image"
         }'
    ```
    """
    logger.info(f"Received ingestion request for ad: {ad_data.ad_archive_id}")
    
    try:
        # Create ingestion service instance
        ingestion_service = DataIngestionService(db)
        
        # Process the ad ingestion
        result = await ingestion_service.ingest_ad(ad_data)
        
        if result.success:
            logger.info(f"Successfully ingested ad: {ad_data.ad_archive_id} (ID: {result.ad_id})")
        else:
            logger.warning(f"Failed to ingest ad: {ad_data.ad_archive_id} - {result.message}")
        
        return result
        
    except Exception as e:
        logger.error(f"Unexpected error in ingest endpoint: {e}")
        return AdIngestionResponse(
            success=False,
            ad_id=None,
            competitor_id=None,
            analysis_task_id=None,
            message=f"Internal server error: {str(e)}"
        )


@router.post("/ingest/batch")
async def batch_ingest_ads(
    ads_data: List[AdCreate],
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key)
) -> dict:
    """
    Batch ingest multiple ads from external scraper.
    
    This endpoint allows efficient ingestion of multiple ads at once,
    useful for bulk scraping operations.
    
    **Security**: Requires API key authentication.
    
    **Limits**: Maximum 100 ads per batch request.
    
    **Example Usage**:
    ```bash
    curl -X POST "http://localhost:8000/api/v1/internal/ingest/batch" \
         -H "X-API-Key: your-api-key" \
         -H "Content-Type: application/json" \
         -d '[
           {
             "ad_archive_id": "1234567890",
             "competitor": {"name": "Company A", "page_id": "compA123"},
             "ad_copy": "Product A"
           },
           {
             "ad_archive_id": "1234567891", 
             "competitor": {"name": "Company B", "page_id": "compB123"},
             "ad_copy": "Product B"
           }
         ]'
    ```
    """
    # Validate batch size
    if len(ads_data) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch size too large. Maximum 100 ads per request."
        )
    
    if len(ads_data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty batch. At least one ad required."
        )
    
    logger.info(f"Received batch ingestion request for {len(ads_data)} ads")
    
    try:
        # Create ingestion service instance
        ingestion_service = DataIngestionService(db)
        
        # Process the batch ingestion
        result = await ingestion_service.batch_ingest_ads(ads_data)
        
        logger.info(f"Batch ingestion completed: {result['successful']}/{result['total_ads']} successful")
        
        return result
        
    except Exception as e:
        logger.error(f"Unexpected error in batch ingest endpoint: {e}")
        return {
            "success": False,
            "error": f"Internal server error: {str(e)}",
            "total_ads": len(ads_data),
            "successful": 0,
            "failed": len(ads_data)
        }


@router.get("/stats")
async def get_ingestion_stats(
    db: Session = Depends(get_db),
    _: bool = Depends(verify_api_key)
) -> dict:
    """
    Get ingestion statistics.
    
    **Security**: Requires API key authentication.
    
    Returns statistics about ingested ads, competitors, and recent activity.
    """
    logger.info("Fetching ingestion statistics")
    
    try:
        ingestion_service = DataIngestionService(db)
        stats = await ingestion_service.get_ingestion_stats()
        
        return stats
        
    except Exception as e:
        logger.error(f"Error fetching ingestion stats: {e}")
        return {
            "error": f"Failed to fetch statistics: {str(e)}"
        }


@router.get("/health")
async def internal_health_check(_: bool = Depends(verify_api_key)) -> dict:
    """
    Internal health check endpoint.
    
    **Security**: Requires API key authentication.
    
    Used by internal services to verify the ingestion API is available.
    """
    return {
        "status": "ok",
        "service": "internal-ingestion-api",
        "endpoints": [
            "POST /internal/ingest - Single ad ingestion",
            "POST /internal/ingest/batch - Batch ad ingestion", 
            "GET /internal/stats - Ingestion statistics",
            "GET /internal/health - This health check"
        ]
    }


@router.get("/api-key/test")
async def test_api_key(_: bool = Depends(verify_api_key)) -> dict:
    """
    Test API key authentication.
    
    **Security**: Requires API key authentication.
    
    Useful for testing if your API key is working correctly.
    """
    return {
        "status": "authenticated",
        "message": "API key is valid",
        "note": "You can now use the ingestion endpoints"
    }

# Debug endpoint removed for security 