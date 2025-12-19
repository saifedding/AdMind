from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import logging

from app.database import get_db
from app.models.dto.category_dto import (
    CategoryCreateDTO,
    CategoryUpdateDTO,
    CategoryResponseDTO,
    CategoryWithStatsDTO
)
from app.services.category_service import CategoryService

router = APIRouter()
logger = logging.getLogger(__name__)


def get_category_service(db: Session = Depends(get_db)) -> CategoryService:
    """Dependency to get CategoryService instance"""
    return CategoryService(db)


@router.get("/", response_model=List[CategoryResponseDTO])
async def get_categories(
    category_service: CategoryService = Depends(get_category_service)
):
    """
    Get all categories with competitor counts.
    
    Returns a list of all categories ordered by name.
    """
    try:
        return category_service.get_categories()
    except Exception as e:
        logger.error(f"Error in get_categories endpoint: {str(e)}")
        raise


@router.post("/", response_model=CategoryResponseDTO)
async def create_category(
    category_data: CategoryCreateDTO,
    category_service: CategoryService = Depends(get_category_service)
):
    """
    Create a new category.
    
    Category names must be unique (case-insensitive).
    """
    try:
        return category_service.create_category(category_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in create_category endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{category_id}", response_model=CategoryWithStatsDTO)
async def get_category(
    category_id: int,
    category_service: CategoryService = Depends(get_category_service)
):
    """
    Get detailed information about a specific category.
    
    Includes competitor count, total ads, and active ads statistics.
    """
    try:
        return category_service.get_category_by_id(category_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_category endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{category_id}", response_model=CategoryResponseDTO)
async def update_category(
    category_id: int,
    category_data: CategoryUpdateDTO,
    category_service: CategoryService = Depends(get_category_service)
):
    """
    Update an existing category.
    
    Category names must be unique (case-insensitive).
    All competitor associations are preserved.
    """
    try:
        return category_service.update_category(category_id, category_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in update_category endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{category_id}")
async def delete_category(
    category_id: int,
    category_service: CategoryService = Depends(get_category_service)
):
    """
    Delete a category.
    
    All competitors in this category will have their category_id set to null.
    """
    try:
        return category_service.delete_category(category_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in delete_category endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/overview", response_model=List[CategoryWithStatsDTO])
async def get_category_stats(
    category_service: CategoryService = Depends(get_category_service)
):
    """
    Get statistics for all categories.
    
    Returns detailed stats including competitor count, total ads, and active ads for each category.
    """
    try:
        return category_service.get_category_stats()
    except Exception as e:
        logger.error(f"Error in get_category_stats endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
