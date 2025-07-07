from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from fastapi import HTTPException
import logging
from datetime import datetime
import math

from app.models.competitor import Competitor
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
                is_active=competitor_data.is_active
            )
            
            self.db.add(competitor)
            self.db.commit()
            self.db.refresh(competitor)
            
            logger.info(f"Created new competitor: {competitor.name} (ID: {competitor.id})")
            
            return CompetitorResponseDTO(
                id=competitor.id,
                name=competitor.name,
                page_id=competitor.page_id,
                is_active=competitor.is_active,
                ads_count=0,
                created_at=competitor.created_at,
                updated_at=competitor.updated_at
            )
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating competitor: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error creating competitor: {str(e)}")
    
    def get_competitors(self, filters: CompetitorFilterParams) -> PaginatedCompetitorResponseDTO:
        """Get paginated list of competitors with filtering"""
        try:
            # Build base query
            query = self.db.query(Competitor)
            
            # Apply filters
            if filters.is_active is not None:
                query = query.filter(Competitor.is_active == filters.is_active)
            
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
                competitor_data.append(CompetitorResponseDTO(
                    id=competitor.id,
                    name=competitor.name,
                    page_id=competitor.page_id,
                    is_active=competitor.is_active,
                    ads_count=ads_counts.get(competitor.id, 0),
                    created_at=competitor.created_at,
                    updated_at=competitor.updated_at
                ))
            
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
            competitor = self.db.query(Competitor).filter(
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
            
            # Variables already set above
            
            return CompetitorDetailResponseDTO(
                id=competitor.id,
                name=competitor.name,
                page_id=competitor.page_id,
                is_active=competitor.is_active,
                ads_count=total_ads,
                active_ads_count=active_ads,
                analyzed_ads_count=analyzed_ads,
                created_at=competitor.created_at,
                updated_at=competitor.updated_at
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching competitor {competitor_id}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error fetching competitor: {str(e)}")
    
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
            
            # Update fields
            if competitor_data.name is not None:
                competitor.name = competitor_data.name
            if competitor_data.page_id is not None:
                competitor.page_id = competitor_data.page_id
            if competitor_data.is_active is not None:
                competitor.is_active = competitor_data.is_active
            
            competitor.updated_at = datetime.utcnow()
            
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
                # Soft delete - just deactivate
                competitor.is_active = False
                competitor.updated_at = datetime.utcnow()
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
            
            competitors = self.db.query(Competitor).filter(
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
            
            return [
                CompetitorResponseDTO(
                    id=competitor.id,
                    name=competitor.name,
                    page_id=competitor.page_id,
                    is_active=competitor.is_active,
                    ads_count=ads_counts.get(competitor.id, 0),
                    created_at=competitor.created_at,
                    updated_at=competitor.updated_at
                )
                for competitor in competitors
            ]
            
        except Exception as e:
            logger.error(f"Error searching competitors: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error searching competitors: {str(e)}") 