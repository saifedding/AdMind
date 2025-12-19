from typing import List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_
from fastapi import HTTPException
import logging
from datetime import datetime
import math

from app.models.competitor import Competitor
from app.models.category import Category
from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.models.dto.competitor_dto import (
    CompetitorCreateDTO,
    CompetitorUpdateDTO,
    CompetitorResponseDTO,
    CompetitorDetailResponseDTO,
    PaginatedCompetitorResponseDTO,
    CompetitorFilterParams,
    CompetitorStatsResponseDTO
)

logger = logging.getLogger(__name__)


class CompetitorService:
    """Service for managing competitor operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_competitor(self, competitor_data: CompetitorCreateDTO) -> CompetitorResponseDTO:
        """Create a new competitor"""
        try:
            # Check if competitor with same page_id already exists
            existing = self.db.query(Competitor).filter(
                Competitor.page_id == competitor_data.page_id
            ).first()
            
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail=f"Competitor with page_id '{competitor_data.page_id}' already exists"
                )
            
            # Create new competitor
            competitor = Competitor(
                name=competitor_data.name,
                page_id=competitor_data.page_id,
                is_active=competitor_data.is_active,
                category_id=competitor_data.category_id
            )
            
            self.db.add(competitor)
            self.db.commit()
            self.db.refresh(competitor)
            
            logger.info(f"Created new competitor: {competitor.name} (ID: {competitor.id})")
            
            # Create DTO and set values explicitly
            dto = CompetitorResponseDTO.model_validate(competitor)
            dto.ads_count = 0
            return dto
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating competitor: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error creating competitor: {str(e)}")
    
    def get_competitors(self, filters: CompetitorFilterParams) -> PaginatedCompetitorResponseDTO:
        """Get paginated list of competitors with filtering"""
        try:
            # Build base query with category relationship
            query = self.db.query(Competitor).options(joinedload(Competitor.category))
            
            # Apply filters
            if filters.is_active is not None:
                query = query.filter(Competitor.is_active == filters.is_active)
            
            if filters.category_id is not None:
                if filters.category_id == -1:
                    # Special value -1 means "uncategorized"
                    query = query.filter(Competitor.category_id.is_(None))
                else:
                    query = query.filter(Competitor.category_id == filters.category_id)
            
            if filters.search:
                search_term = f"%{filters.search}%"
                query = query.filter(
                    or_(
                        Competitor.name.ilike(search_term),
                        Competitor.page_id.ilike(search_term)
                    )
                )
            
            # Get total count before pagination
            total = query.count()
            
            # Apply sorting
            if filters.sort_by == "name":
                order_column = Competitor.name
            elif filters.sort_by == "page_id":
                order_column = Competitor.page_id
            elif filters.sort_by == "is_active":
                order_column = Competitor.is_active
            elif filters.sort_by == "updated_at":
                order_column = Competitor.updated_at
            else:
                order_column = Competitor.created_at
            
            if filters.sort_order == "asc":
                query = query.order_by(order_column.asc())
            else:
                query = query.order_by(order_column.desc())
            
            # Apply pagination
            offset = (filters.page - 1) * filters.page_size
            competitors = query.offset(offset).limit(filters.page_size).all()
            
            # Get ads count for each competitor
            competitor_ids = [comp.id for comp in competitors]
            ads_counts = {}
            
            if competitor_ids:
                ads_count_query = self.db.query(
                    Ad.competitor_id,
                    func.count(Ad.id).label('ads_count')
                ).filter(
                    Ad.competitor_id.in_(competitor_ids)
                ).group_by(Ad.competitor_id).all()
                
                ads_counts = {comp_id: count for comp_id, count in ads_count_query}
            
            # Build response
            competitor_data = []
            for competitor in competitors:
                # Create DTO from ORM and set ads_count and category_name explicitly
                dto = CompetitorResponseDTO.model_validate(competitor)
                dto.ads_count = ads_counts.get(competitor.id, 0)
                dto.category_name = competitor.category.name if competitor.category else None
                competitor_data.append(dto)
            
            # Calculate pagination info
            total_pages = math.ceil(total / filters.page_size)
            has_next = filters.page < total_pages
            has_previous = filters.page > 1
            
            return PaginatedCompetitorResponseDTO(
                data=competitor_data,
                total=total,
                page=filters.page,
                page_size=filters.page_size,
                total_pages=total_pages,
                has_next=has_next,
                has_previous=has_previous
            )
            
        except Exception as e:
            logger.error(f"Error fetching competitors: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error fetching competitors: {str(e)}")
    
    def get_competitor_by_id(self, competitor_id: int) -> CompetitorDetailResponseDTO:
        """Get detailed information about a specific competitor"""
        try:
            competitor = self.db.query(Competitor).options(
                joinedload(Competitor.category)
            ).filter(
                Competitor.id == competitor_id
            ).first()
            
            if not competitor:
                raise HTTPException(status_code=404, detail="Competitor not found")
            
            # Get ads statistics
            total_ads = self.db.query(Ad).filter(Ad.competitor_id == competitor_id).count()
            active_ads = self.db.query(Ad).filter(
                Ad.competitor_id == competitor_id,
                Ad.meta['is_active'].as_boolean() == True
            ).count()
            
            # Get analyzed ads count
            analyzed_ads = self.db.query(AdAnalysis).join(
                Ad, AdAnalysis.ad_id == Ad.id
            ).filter(
                Ad.competitor_id == competitor_id
            ).count()
            
            # Create DTO from ORM and set fields explicitly
            dto = CompetitorDetailResponseDTO.model_validate(competitor)
            dto.ads_count = total_ads
            dto.active_ads_count = active_ads
            dto.analyzed_ads_count = analyzed_ads
            dto.category_name = competitor.category.name if competitor.category else None
            return dto
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching competitor {competitor_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error fetching competitor: {str(e)}")
    
    def bulk_delete_competitors(self, competitor_ids: List[int]) -> dict:
        """
        Bulk delete competitors.
        - Soft delete competitors with ads.
        - Hard delete competitors without ads.
        """
        if not competitor_ids:
            raise HTTPException(status_code=400, detail="No competitor IDs provided")

        soft_deleted_count = 0
        hard_deleted_count = 0
        not_found_count = 0
        
        try:
            competitors_to_process = self.db.query(Competitor).filter(
                Competitor.id.in_(competitor_ids)
            ).all()
            
            found_ids = {c.id for c in competitors_to_process}
            not_found_count = len(competitor_ids) - len(found_ids)

            ids_to_check_ads = [comp.id for comp in competitors_to_process]
            
            ads_counts_query = self.db.query(
                Ad.competitor_id,
                func.count(Ad.id).label('ads_count')
            ).filter(
                Ad.competitor_id.in_(ids_to_check_ads)
            ).group_by(Ad.competitor_id).all()

            ads_counts = {comp_id: count for comp_id, count in ads_counts_query}
            
            ids_for_soft_delete = []
            ids_for_hard_delete = []

            for comp_id in ids_to_check_ads:
                if ads_counts.get(comp_id, 0) > 0:
                    ids_for_soft_delete.append(comp_id)
                else:
                    ids_for_hard_delete.append(comp_id)
            
            # Perform soft deletes
            if ids_for_soft_delete:
                self.db.query(Competitor).filter(
                    Competitor.id.in_(ids_for_soft_delete)
                ).update(
                    {'is_active': False, 'updated_at': datetime.utcnow()},
                    synchronize_session=False
                )
                soft_deleted_count = len(ids_for_soft_delete)
            
            # Perform hard deletes
            if ids_for_hard_delete:
                self.db.query(Competitor).filter(
                    Competitor.id.in_(ids_for_hard_delete)
                ).delete(synchronize_session=False)
                hard_deleted_count = len(ids_for_hard_delete)
            
            self.db.commit()
            
            logger.info(
                f"Bulk delete completed. Soft deleted: {soft_deleted_count}, "
                f"Hard deleted: {hard_deleted_count}, Not found: {not_found_count}"
            )
            
            return {
                "message": "Bulk delete operation completed.",
                "soft_deleted_count": soft_deleted_count,
                "hard_deleted_count": hard_deleted_count,
                "not_found_count": not_found_count
            }

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error during bulk competitor deletion: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"An error occurred during bulk deletion: {str(e)}"
            )
    
    def bulk_update_category(self, competitor_ids: List[int], category_id: Optional[int]) -> dict:
        """
        Bulk update category for multiple competitors.
        Set category_id to None to remove category assignment.
        """
        if not competitor_ids:
            raise HTTPException(status_code=400, detail="No competitor IDs provided")
        
        try:
            # Validate category exists if provided
            if category_id is not None:
                category = self.db.query(Category).filter(Category.id == category_id).first()
                if not category:
                    raise HTTPException(status_code=404, detail=f"Category with ID {category_id} not found")
            
            # Get competitors to update
            competitors = self.db.query(Competitor).filter(
                Competitor.id.in_(competitor_ids)
            ).all()
            
            if not competitors:
                raise HTTPException(status_code=404, detail="No competitors found with provided IDs")
            
            # Update category for all competitors
            updated_count = self.db.query(Competitor).filter(
                Competitor.id.in_(competitor_ids)
            ).update(
                {'category_id': category_id, 'updated_at': datetime.utcnow()},
                synchronize_session=False
            )
            
            self.db.commit()
            
            category_name = "None" if category_id is None else self.db.query(Category).filter(Category.id == category_id).first().name
            
            logger.info(f"Bulk category update completed. Updated {updated_count} competitors to category: {category_name}")
            
            return {
                "message": f"Successfully updated category for {updated_count} competitor(s)",
                "updated_count": updated_count,
                "category_id": category_id,
                "category_name": category_name
            }
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error during bulk category update: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"An error occurred during bulk category update: {str(e)}"
            )
    
    def update_competitor(
        self, 
        competitor_id: int, 
        competitor_data: CompetitorUpdateDTO
    ) -> CompetitorDetailResponseDTO:
        """Update an existing competitor"""
        try:
            competitor = self.db.query(Competitor).filter(
                Competitor.id == competitor_id
            ).first()
            
            if not competitor:
                raise HTTPException(status_code=404, detail="Competitor not found")
            
            # Check if page_id is being updated and if it conflicts with existing competitor
            if competitor_data.page_id and competitor_data.page_id != competitor.page_id:
                existing = self.db.query(Competitor).filter(
                    and_(
                        Competitor.page_id == competitor_data.page_id,
                        Competitor.id != competitor_id
                    )
                ).first()
                
                if existing:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Another competitor with page_id '{competitor_data.page_id}' already exists"
                    )
            
            # Update fields using SQLAlchemy's update method
            update_data = {}
            if competitor_data.name is not None:
                update_data['name'] = competitor_data.name
            if competitor_data.page_id is not None:
                update_data['page_id'] = competitor_data.page_id
            if competitor_data.is_active is not None:
                update_data['is_active'] = competitor_data.is_active
            if competitor_data.category_id is not None:
                update_data['category_id'] = competitor_data.category_id
            
            update_data['updated_at'] = datetime.utcnow()
            
            self.db.query(Competitor).filter(
                Competitor.id == competitor_id
            ).update(
                update_data,
                synchronize_session=False
            )
            
            self.db.commit()
            self.db.refresh(competitor)
            
            logger.info(f"Updated competitor: {competitor.name} (ID: {competitor.id})")
            
            # Return detailed response
            return self.get_competitor_by_id(competitor_id)
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating competitor {competitor_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error updating competitor: {str(e)}")
    
    def delete_competitor(self, competitor_id: int) -> dict:
        """Delete a competitor (soft delete by setting is_active to False)"""
        try:
            competitor = self.db.query(Competitor).filter(
                Competitor.id == competitor_id
            ).first()
            
            if not competitor:
                raise HTTPException(status_code=404, detail="Competitor not found")
            
            # Check if competitor has ads
            ads_count = self.db.query(Ad).filter(Ad.competitor_id == competitor_id).count()
            
            if ads_count > 0:
                # Soft delete - using update instead of direct assignment
                self.db.query(Competitor).filter(
                    Competitor.id == competitor_id
                ).update(
                    {'is_active': False, 'updated_at': datetime.utcnow()},
                    synchronize_session=False
                )
                self.db.commit()
                
                logger.info(f"Soft deleted competitor: {competitor.name} (ID: {competitor.id}) - {ads_count} ads retained")
                
                return {
                    "message": f"Competitor '{competitor.name}' has been deactivated. {ads_count} ads are retained.",
                    "competitor_id": competitor_id,
                    "ads_count": ads_count,
                    "soft_delete": True
                }
            else:
                # Hard delete - no ads associated
                competitor_name = competitor.name
                self.db.delete(competitor)
                self.db.commit()
                
                logger.info(f"Hard deleted competitor: {competitor_name} (ID: {competitor_id}) - no ads")
                
                return {
                    "message": f"Competitor '{competitor_name}' has been permanently deleted.",
                    "competitor_id": competitor_id,
                    "ads_count": 0,
                    "soft_delete": False
                }
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting competitor {competitor_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error deleting competitor: {str(e)}")
    
    def get_competitor_stats(self) -> CompetitorStatsResponseDTO:
        """Get comprehensive statistics about competitors"""
        try:
            # Basic counts
            total_competitors = self.db.query(Competitor).count()
            active_competitors = self.db.query(Competitor).filter(Competitor.is_active == True).count()
            inactive_competitors = total_competitors - active_competitors
            
            # Competitors with ads
            competitors_with_ads = self.db.query(Competitor.id).distinct().join(Ad).count()
            
            # Total ads across all competitors
            total_ads = self.db.query(Ad).count()
            
            # Average ads per competitor
            avg_ads_per_competitor = total_ads / total_competitors if total_competitors > 0 else 0
            
            return CompetitorStatsResponseDTO(
                total_competitors=total_competitors,
                active_competitors=active_competitors,
                inactive_competitors=inactive_competitors,
                competitors_with_ads=competitors_with_ads,
                total_ads_across_competitors=total_ads,
                avg_ads_per_competitor=round(avg_ads_per_competitor, 2)
            )
            
        except Exception as e:
            logger.error(f"Error fetching competitor stats: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error fetching competitor stats: {str(e)}")
    
    def search_competitors(self, search_term: str, limit: int = 50) -> List[CompetitorResponseDTO]:
        """Search competitors by name or page_id"""
        try:
            search_pattern = f"%{search_term}%"
            
            competitors = self.db.query(Competitor).options(
                joinedload(Competitor.category)
            ).filter(
                or_(
                    Competitor.name.ilike(search_pattern),
                    Competitor.page_id.ilike(search_pattern)
                )
            ).limit(limit).all()
            
            # Get ads count for each competitor
            competitor_ids = [comp.id for comp in competitors]
            ads_counts = {}
            
            if competitor_ids:
                ads_count_query = self.db.query(
                    Ad.competitor_id,
                    func.count(Ad.id).label('ads_count')
                ).filter(
                    Ad.competitor_id.in_(competitor_ids)
                ).group_by(Ad.competitor_id).all()
                
                ads_counts = {comp_id: count for comp_id, count in ads_count_query}
            
            # Create DTOs from ORM objects and set ads_count and category_name manually
            result = []
            for competitor in competitors:
                dto = CompetitorResponseDTO.model_validate(competitor)
                dto.ads_count = ads_counts.get(competitor.id, 0)
                dto.category_name = competitor.category.name if competitor.category else None
                result.append(dto)
            return result
            
        except Exception as e:
            logger.error(f"Error searching competitors: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error searching competitors: {str(e)}")

    def clear_competitor_ads(self, competitor_id: int) -> dict:
        try:
            competitor = self.db.query(Competitor).filter(Competitor.id == competitor_id).first()
            if not competitor:
                raise HTTPException(status_code=404, detail="Competitor not found")

            ad_ids = [row[0] for row in self.db.query(Ad.id).filter(Ad.competitor_id == competitor_id).all()]
            if not ad_ids:
                return {"message": "No ads found for competitor", "deleted_count": 0}

            from app.models.ad_set import AdSet
            from app.models.ad_analysis import AdAnalysis
            from app.models.veo_generation import VeoGeneration
            from app.models.merged_video import MergedVideo

            self.db.query(AdSet).filter(AdSet.best_ad_id.in_(ad_ids)).update({"best_ad_id": None}, synchronize_session=False)
            self.db.query(VeoGeneration).filter(VeoGeneration.ad_id.in_(ad_ids)).delete(synchronize_session=False)
            self.db.query(MergedVideo).filter(MergedVideo.ad_id.in_(ad_ids)).delete(synchronize_session=False)
            self.db.query(AdAnalysis).filter(AdAnalysis.ad_id.in_(ad_ids)).delete(synchronize_session=False)
            deleted_ads = self.db.query(Ad).filter(Ad.id.in_(ad_ids)).delete(synchronize_session=False)

            self.db.commit()

            return {"message": f"Deleted {deleted_ads} ads for competitor", "deleted_count": deleted_ads}
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error clearing ads for competitor {competitor_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error clearing competitor ads: {str(e)}")
