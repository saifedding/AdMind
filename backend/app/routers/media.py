from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os
import logging

from app.database import get_db
from app.services.media_storage_service import MediaStorageService

router = APIRouter()
logger = logging.getLogger(__name__)


class SaveMediaResponse(BaseModel):
    """Response model for saving media"""
    success: bool
    ad_id: int
    images_saved: int
    videos_saved: int
    images_failed: int
    videos_failed: int
    message: str


class SaveAdSetMediaResponse(BaseModel):
    """Response model for saving ad set media"""
    success: bool
    ad_set_id: int
    total_ads: int
    ads_processed: int
    images_saved: int
    videos_saved: int
    images_failed: int
    videos_failed: int
    message: str


@router.post("/ads/{ad_id}/save-media", response_model=SaveMediaResponse)
async def save_ad_media(
    ad_id: int,
    db: Session = Depends(get_db)
):
    """
    Download and save all media (images, videos) for an ad to local storage.
    
    This makes the media available even when Facebook URLs expire.
    """
    try:
        storage_service = MediaStorageService(db)
        result = storage_service.save_ad_media(ad_id)
        
        total_saved = result['images_saved'] + result['videos_saved']
        total_failed = result['images_failed'] + result['videos_failed']
        
        return SaveMediaResponse(
            success=True,
            ad_id=ad_id,
            images_saved=result['images_saved'],
            videos_saved=result['videos_saved'],
            images_failed=result['images_failed'],
            videos_failed=result['videos_failed'],
            message=f"Saved {total_saved} files ({result['images_saved']} images, {result['videos_saved']} videos)"
                   + (f", {total_failed} failed" if total_failed > 0 else "")
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error saving media for ad {ad_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save media: {str(e)}")


@router.post("/ad-sets/{ad_set_id}/save-media", response_model=SaveAdSetMediaResponse)
async def save_adset_media(
    ad_set_id: int,
    db: Session = Depends(get_db)
):
    """
    Download and save all media for all ads in an ad set to local storage.
    
    This makes all media available even when Facebook URLs expire.
    """
    try:
        storage_service = MediaStorageService(db)
        result = storage_service.save_adset_media(ad_set_id)
        
        total_saved = result['images_saved'] + result['videos_saved']
        total_failed = result['images_failed'] + result['videos_failed']
        
        return SaveAdSetMediaResponse(
            success=True,
            ad_set_id=ad_set_id,
            total_ads=result['total_ads'],
            ads_processed=result['ads_processed'],
            images_saved=result['images_saved'],
            videos_saved=result['videos_saved'],
            images_failed=result['images_failed'],
            videos_failed=result['videos_failed'],
            message=f"Processed {result['ads_processed']}/{result['total_ads']} ads. "
                   + f"Saved {total_saved} files ({result['images_saved']} images, {result['videos_saved']} videos)"
                   + (f", {total_failed} failed" if total_failed > 0 else "")
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error saving media for ad set {ad_set_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save media: {str(e)}")


@router.get("/media/{folder}/{filename}")
async def serve_media(
    folder: str,
    filename: str,
    db: Session = Depends(get_db)
):
    """
    Serve a saved media file.
    
    Args:
        folder: Either 'images' or 'videos'
        filename: The filename to serve
    
    Returns:
        The media file
    """
    # Validate folder
    if folder not in ['images', 'videos']:
        raise HTTPException(status_code=400, detail="Invalid folder. Must be 'images' or 'videos'")
    
    # Get storage path
    storage_service = MediaStorageService(db)
    file_path = os.path.join(storage_service.storage_path, folder, filename)
    
    # Check if file exists
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Media file not found")
    
    # Determine media type
    media_type = "image/jpeg" if folder == "images" else "video/mp4"
    
    # Serve the file
    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename
    )
