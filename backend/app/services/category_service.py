from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
import logging
from datetime import datetime

from app.models.category import Category
from app.models.competitor import Competitor
from app.models.ad import Ad
from app.models.dto.category_dto import (
    CategoryCreateDTO,
    CategoryUpdateDTO,
    CategoryResponseDTO,
    CategoryWithStatsDTO
)

logger = logging.getLogger(__name__)


class CategoryService:
    """Service for managing category operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_category(self, category_data: CategoryCreateDTO) -> CategoryResponseDTO:
        """Create a new category"""
        try:
            # Check if category with same name already exists (case-insensitive)
            existing = self.db.query(Category).filter(
                func.lower(Category.name) == func.lower(category_data.name)
            ).first()
            
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail=f"Category with name '{category_data.name}' already exists"
                )
            
            # Create new category
            category = Category(name=category_data.name)
            
            self.db.add(category)
            self.db.commit()
            self.db.refresh(category)
            
            logger.info(f"Created new category: {category.name} (ID: {category.id})")
            
            # Create DTO
            dto = CategoryResponseDTO.model_validate(category)
            dto.competitor_count = 0
            return dto
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating category: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error creating category: {str(e)}")
    
    def get_categories(self) -> List[CategoryResponseDTO]:
        """Get all categories with competitor counts"""
        try:
            categories = self.db.query(Category).order_by(Category.name).all()
            
            # Get competitor counts for each category
            category_ids = [cat.id for cat in categories]
            competitor_counts = {}
            
            if category_ids:
                counts_query = self.db.query(
                    Competitor.category_id,
                    func.count(Competitor.id).label('count')
                ).filter(
                    Competitor.category_id.in_(category_ids)
                ).group_by(Competitor.category_id).all()
                
                competitor_counts = {cat_id: count for cat_id, count in counts_query}
            
            # Build response
            result = []
            for category in categories:
                dto = CategoryResponseDTO.model_validate(category)
                dto.competitor_count = competitor_counts.get(category.id, 0)
                result.append(dto)
            
            return result
            
        except Exception as e:
            logger.error(f"Error fetching categories: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error fetching categories: {str(e)}")
    
    def get_category_by_id(self, category_id: int) -> CategoryWithStatsDTO:
        """Get detailed information about a specific category"""
        try:
            category = self.db.query(Category).filter(Category.id == category_id).first()
            
            if not category:
                raise HTTPException(status_code=404, detail="Category not found")
            
            # Get competitor count
            competitor_count = self.db.query(Competitor).filter(
                Competitor.category_id == category_id
            ).count()
            
            # Get total ads count from competitors in this category
            total_ads = self.db.query(Ad).join(Competitor).filter(
                Competitor.category_id == category_id
            ).count()
            
            # Get active ads count
            active_ads = self.db.query(Ad).join(Competitor).filter(
                Competitor.category_id == category_id,
                Ad.meta['is_active'].as_boolean() == True
            ).count()
            
            # Create DTO
            dto = CategoryWithStatsDTO.model_validate(category)
            dto.competitor_count = competitor_count
            dto.total_ads = total_ads
            dto.active_ads = active_ads
            
            return dto
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching category {category_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error fetching category: {str(e)}")
    
    def update_category(self, category_id: int, category_data: CategoryUpdateDTO) -> CategoryResponseDTO:
        """Update an existing category"""
        try:
            category = self.db.query(Category).filter(Category.id == category_id).first()
            
            if not category:
                raise HTTPException(status_code=404, detail="Category not found")
            
            # Check if new name conflicts with existing category (case-insensitive)
            if category_data.name and category_data.name.lower() != category.name.lower():
                existing = self.db.query(Category).filter(
                    func.lower(Category.name) == func.lower(category_data.name),
                    Category.id != category_id
                ).first()
                
                if existing:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Another category with name '{category_data.name}' already exists"
                    )
            
            # Update category
            category.name = category_data.name
            category.updated_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(category)
            
            logger.info(f"Updated category: {category.name} (ID: {category.id})")
            
            # Get competitor count
            competitor_count = self.db.query(Competitor).filter(
                Competitor.category_id == category_id
            ).count()
            
            # Create DTO
            dto = CategoryResponseDTO.model_validate(category)
            dto.competitor_count = competitor_count
            return dto
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating category {category_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error updating category: {str(e)}")
    
    def delete_category(self, category_id: int) -> dict:
        """Delete a category and set all associated competitors' category_id to null"""
        try:
            category = self.db.query(Category).filter(Category.id == category_id).first()
            
            if not category:
                raise HTTPException(status_code=404, detail="Category not found")
            
            # Count competitors in this category
            competitor_count = self.db.query(Competitor).filter(
                Competitor.category_id == category_id
            ).count()
            
            category_name = category.name
            
            # Delete the category (ON DELETE SET NULL will handle competitors)
            self.db.delete(category)
            self.db.commit()
            
            logger.info(f"Deleted category: {category_name} (ID: {category_id}). {competitor_count} competitors set to uncategorized.")
            
            return {
                "message": f"Category '{category_name}' deleted successfully. {competitor_count} competitor(s) set to uncategorized.",
                "category_id": category_id,
                "competitors_affected": competitor_count
            }
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting category {category_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error deleting category: {str(e)}")
    
    def get_category_stats(self) -> List[CategoryWithStatsDTO]:
        """Get statistics for all categories"""
        try:
            categories = self.db.query(Category).order_by(Category.name).all()
            
            result = []
            for category in categories:
                # Get competitor count
                competitor_count = self.db.query(Competitor).filter(
                    Competitor.category_id == category.id
                ).count()
                
                # Get total ads count
                total_ads = self.db.query(Ad).join(Competitor).filter(
                    Competitor.category_id == category.id
                ).count()
                
                # Get active ads count
                active_ads = self.db.query(Ad).join(Competitor).filter(
                    Competitor.category_id == category.id,
                    Ad.meta['is_active'].as_boolean() == True
                ).count()
                
                # Create DTO
                dto = CategoryWithStatsDTO.model_validate(category)
                dto.competitor_count = competitor_count
                dto.total_ads = total_ads
                dto.active_ads = active_ads
                
                result.append(dto)
            
            return result
            
        except Exception as e:
            logger.error(f"Error fetching category stats: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error fetching category stats: {str(e)}")
