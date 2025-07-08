from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, desc, asc, cast, String
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
import logging

from app.models import Ad, Competitor, AdAnalysis
from app.models.dto.ad_dto import (
    AdFilterParams, 
    AdResponseDTO, 
    AdDetailResponseDTO, 
    PaginatedAdResponseDTO, 
    PaginationMetadata,
    AdStatsResponseDTO,
    AdAnalysisResponseDTO,
    AdStats,
    Campaign,
    AdvertiserInfo,
    PaginatedAdResponse
)
from app.models.dto.competitor_dto import CompetitorResponseDTO

logger = logging.getLogger(__name__)


class AdService:
    """
    Service class for handling all ad-related database operations.
    Provides methods for querying, filtering, and paginating ad data.
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_ads(self, filters: AdFilterParams) -> PaginatedAdResponseDTO:
        """
        Get paginated and filtered ads with AI analysis data.
        
        Args:
            filters: AdFilterParams containing pagination and filter parameters
            
        Returns:
            PaginatedAdResponseDTO with ads and pagination metadata
        """
        try:
            # Build base query with relationships
            query = self.db.query(Ad).options(
                joinedload(Ad.competitor),
                joinedload(Ad.analysis)
            )
            
            # Apply filters
            query = self._apply_filters(query, filters)
            
            # Apply sorting
            query = self._apply_sorting(query, filters.sort_by, filters.sort_order)
            
            # Get total count before pagination
            total_items = query.count()
            
            # Apply pagination
            offset = (filters.page - 1) * filters.page_size
            ads = query.offset(offset).limit(filters.page_size).all()
            
            # Convert to DTOs
            ad_dtos = [self._convert_to_dto(ad) for ad in ads]
            
            # Calculate pagination metadata
            total_pages = (total_items + filters.page_size - 1) // filters.page_size
            pagination = PaginationMetadata(
                page=filters.page,
                page_size=filters.page_size,
                total_items=total_items,
                total_pages=total_pages,
                has_next=filters.page < total_pages,
                has_previous=filters.page > 1
            )
            
            return PaginatedAdResponseDTO(
                data=ad_dtos,
                pagination=pagination
            )
            
        except Exception as e:
            logger.error(f"Error fetching ads: {str(e)}")
            raise
    
    def get_ad_by_id(self, ad_id: int) -> Optional[AdDetailResponseDTO]:
        """Get a single ad by ID."""
        ad = self.db.query(Ad).options(
            joinedload(Ad.competitor),
            joinedload(Ad.analysis)
        ).filter(Ad.id == ad_id).first()
        
        return self._convert_to_detail_dto(ad) if ad else None
    
    def get_ad_by_archive_id(self, ad_archive_id: str) -> Optional[Ad]:
        """Get ad by Facebook archive ID"""
        return self.db.query(Ad).filter(Ad.ad_archive_id == ad_archive_id).first()
    
    def get_ads_paginated(self, filters: AdFilterParams) -> PaginatedAdResponse:
        """Get paginated ads with filtering"""
        query = self.db.query(Ad)
        
        # Apply filters
        if filters.campaign_id:
            query = query.filter(Ad.campaign_id == filters.campaign_id)
        
        if filters.is_active is not None:
            query = query.filter(Ad.meta_is_active == filters.is_active)
            
        if filters.has_lead_form is not None:
            if filters.has_lead_form:
                # Has non-empty lead form fields
                query = query.filter(
                    or_(
                        Ad.lead_form_standalone_fields.cast(str) != '[]',
                        Ad.lead_form_questions.cast(str) != '{}'
                    )
                )
            else:
                # Empty lead form fields
                query = query.filter(
                    and_(
                        Ad.lead_form_standalone_fields.cast(str) == '[]',
                        Ad.lead_form_questions.cast(str) == '{}'
                    )
                )
        
        if filters.platform:
            query = query.filter(Ad.platforms.contains([filters.platform]))
        
        if filters.media_type:
            # Check in creatives array for media type
            query = query.filter(
                Ad.creatives.cast(str).like(f'%"type": "{filters.media_type}"%')
            )
        
        if filters.query:
            # Search in various text fields
            search_term = f"%{filters.query}%"
            query = query.filter(
                or_(
                    Ad.creatives.cast(str).ilike(search_term),
                    # Check for page name within the meta JSON
                    Ad.meta.op('->>')('page_name').ilike(search_term)
                )
            )
        
        # Count total results for pagination
        total = query.count()
        
        # Apply pagination
        query = query.order_by(desc(Ad.date_found))
        query = query.offset((filters.page - 1) * filters.limit).limit(filters.limit)
        
        # Get results
        items = query.all()
        
        # Calculate total pages
        total_pages = (total + filters.limit - 1) // filters.limit
        
        return PaginatedAdResponse(
            items=items,
            total=total,
            page=filters.page,
            limit=filters.limit,
            total_pages=total_pages
        )
    
    def get_campaigns(self) -> List[Campaign]:
        """Get all campaigns with their ads"""
        # Get unique campaign IDs
        campaign_ids = self.db.query(Ad.campaign_id).distinct().all()
        campaign_ids = [c[0] for c in campaign_ids if c[0]]
        
        campaigns = []
        for campaign_id in campaign_ids:
            # Get ads for this campaign
            ads = self.db.query(Ad).filter(Ad.campaign_id == campaign_id).all()
            if ads:
                # Extract platforms from the first ad
                platforms = ads[0].platforms or []
                
                campaigns.append(Campaign(
                    campaign_id=campaign_id,
                    platforms=platforms,
                    ads=ads
                ))
        
        return campaigns
    
    def get_ad_stats(self) -> AdStats:
        """Get ad statistics"""
        total_ads = self.db.query(func.count(Ad.id)).scalar() or 0
        active_ads = self.db.query(func.count(Ad.id)).filter(Ad.meta_is_active == True).scalar() or 0
        
        # Count ads with lead forms
        with_lead_form = self.db.query(func.count(Ad.id)).filter(
            or_(
                Ad.lead_form_standalone_fields.cast(str) != '[]',
                Ad.lead_form_questions.cast(str) != '{}'
            )
        ).scalar() or 0
        
        # Get platform stats
        platforms_stats = {}
        for ad in self.db.query(Ad.platforms).all():
            if ad.platforms:
                for platform in ad.platforms:
                    platforms_stats[platform] = platforms_stats.get(platform, 0) + 1
        
        # Get media type stats
        # This is more complex with JSON array, using a simplified approach
        media_types = {
            "Image": self.db.query(func.count(Ad.id)).filter(Ad.creatives.cast(str).like('%"type": "Image"%')).scalar() or 0,
            "Video": self.db.query(func.count(Ad.id)).filter(Ad.creatives.cast(str).like('%"type": "Video"%')).scalar() or 0,
            "Carousel": self.db.query(func.count(Ad.id)).filter(Ad.creatives.cast(str).like('%"type": "Carousel"%')).scalar() or 0,
            "Other": self.db.query(func.count(Ad.id)).filter(
                and_(
                    ~Ad.creatives.cast(str).like('%"type": "Image"%'),
                    ~Ad.creatives.cast(str).like('%"type": "Video"%'),
                    ~Ad.creatives.cast(str).like('%"type": "Carousel"%')
                )
            ).scalar() or 0
        }
        
        return AdStats(
            total_ads=total_ads,
            active_ads=active_ads,
            with_lead_form=with_lead_form,
            platforms=platforms_stats,
            media_types=media_types
        )
    
    def search_ads(self, query: str, limit: int = 50) -> List[AdResponseDTO]:
        """Search ads by text content."""
        try:
            search_filter = or_(
                Ad.creatives.cast(String).ilike(f'%{query}%'),
                Ad.meta.cast(String).ilike(f'%{query}%')
            )
            
            ads = self.db.query(Ad).options(
                joinedload(Ad.competitor),
                joinedload(Ad.analysis)
            ).join(Ad.competitor).filter(search_filter).limit(limit).all()
            
            return [self._convert_to_dto(ad) for ad in ads]
            
        except Exception as e:
            logger.error(f"Error searching ads: {str(e)}")
            raise
    
    def get_top_performing_ads(self, limit: int = 10) -> List[AdResponseDTO]:
        """
        Get top performing ads based on AI analysis scores.
        
        Args:
            limit: Number of top ads to return
            
        Returns:
            List of top performing ads
        """
        try:
            ads = self.db.query(Ad).options(
                joinedload(Ad.competitor),
                joinedload(Ad.analysis)
            ).join(AdAnalysis).order_by(
                desc(AdAnalysis.overall_score)
            ).limit(limit).all()
            
            return [self._convert_to_dto(ad) for ad in ads]
            
        except Exception as e:
            logger.error(f"Error fetching top performing ads: {str(e)}")
            raise
    
    def get_competitor_ads(self, competitor_id: int, limit: int = 50) -> List[AdResponseDTO]:
        """
        Get ads for a specific competitor.
        
        Args:
            competitor_id: ID of the competitor
            limit: Maximum number of ads to return
            
        Returns:
            List of competitor ads
        """
        try:
            ads = self.db.query(Ad).options(
                joinedload(Ad.competitor),
                joinedload(Ad.analysis)
            ).filter(Ad.competitor_id == competitor_id).limit(limit).all()
            
            return [self._convert_to_dto(ad) for ad in ads]
            
        except Exception as e:
            logger.error(f"Error fetching competitor ads: {str(e)}")
            raise
    
    def delete_ad(self, ad_id: int) -> bool:
        """
        Delete a specific ad by ID.
        
        Args:
            ad_id: ID of the ad to delete
            
        Returns:
            True if the ad was deleted, False if not found
        """
        try:
            ad = self.db.query(Ad).filter(Ad.id == ad_id).first()
            
            if not ad:
                return False
            
            # Delete associated analysis first (if any)
            if ad.analysis:
                self.db.delete(ad.analysis)
            
            # Delete the ad
            self.db.delete(ad)
            self.db.commit()
            
            logger.info(f"Successfully deleted ad {ad_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting ad {ad_id}: {str(e)}")
            self.db.rollback()
            raise
    
    def bulk_delete_ads(self, ad_ids: List[int]) -> int:
        """
        Delete multiple ads by IDs.
        
        Args:
            ad_ids: List of ad IDs to delete
            
        Returns:
            Number of ads successfully deleted
        """
        try:
            # Delete associated analyses first
            analyses_deleted = self.db.query(AdAnalysis).filter(
                AdAnalysis.ad_id.in_(ad_ids)
            ).delete(synchronize_session=False)
            
            # Delete the ads
            ads_deleted = self.db.query(Ad).filter(
                Ad.id.in_(ad_ids)
            ).delete(synchronize_session=False)
            
            self.db.commit()
            
            logger.info(f"Successfully deleted {ads_deleted} ads and {analyses_deleted} analyses")
            return ads_deleted
            
        except Exception as e:
            logger.error(f"Error bulk deleting ads: {str(e)}")
            self.db.rollback()
            raise
    
    def _apply_filters(self, query, filters: AdFilterParams):
        """Apply filters to the ad query."""
        
        if filters.competitor_id:
            query = query.filter(Ad.competitor_id == filters.competitor_id)
        
        if filters.competitor_name:
            query = query.join(Ad.competitor).filter(Competitor.name.ilike(f"%{filters.competitor_name}%"))
        
        if filters.media_type and filters.media_type != 'all':
            query = query.filter(Ad.creatives.cast(String).ilike(f'%"type": "{filters.media_type}"%'))
        
        if filters.is_active is not None:
            query = query.filter(cast(Ad.meta['is_active'], String) == str(filters.is_active).lower())

        if filters.has_analysis is not None:
            if filters.has_analysis:
                query = query.join(Ad.analysis).filter(AdAnalysis.id.isnot(None))
        
        if filters.min_overall_score is not None:
            query = query.join(Ad.analysis).filter(AdAnalysis.overall_score >= filters.min_overall_score)
            
        # Duration filters
        if filters.min_duration_days is not None:
            query = query.filter(Ad.duration_days >= filters.min_duration_days)
        if filters.max_duration_days is not None:
            query = query.filter(Ad.duration_days <= filters.max_duration_days)
            
        if filters.date_from:
            query = query.filter(Ad.date_found >= filters.date_from)
        if filters.date_to:
            query = query.filter(Ad.date_found <= filters.date_to)
        
        if filters.search:
            search_query = f"%{filters.search}%"
            query = query.join(Ad.competitor).filter(
                or_(
                    Ad.creatives.cast(String).ilike(search_query),
                    Competitor.name.ilike(search_query)
                )
            )
        
        return query
    
    def _apply_sorting(self, query, sort_by: str, sort_order: str):
        """Apply sorting to the query."""
        sort_mapping = {
            'created_at': Ad.created_at,
            'date_found': Ad.date_found,
            'duration_days': Ad.duration_days,
            'overall_score': AdAnalysis.overall_score,
            'hook_score': AdAnalysis.hook_score
        }
        
        column = sort_mapping.get(sort_by, Ad.created_at)
        
        if sort_by in ['overall_score', 'hook_score']:
            query = query.outerjoin(Ad.analysis)
        
        order_func = asc if sort_order.lower() == 'asc' else desc
        query = query.order_by(order_func(column))
        
        return query
    
    def _convert_to_dto(self, ad: Ad) -> AdResponseDTO:
        """Helper to convert Ad model to AdResponseDTO"""
        if not ad:
            return None
        
        analysis_dto = AdAnalysisResponseDTO.from_orm(ad.analysis) if ad.analysis else None
        
        competitor_dto = CompetitorResponseDTO(
            id=ad.competitor.id,
            name=ad.competitor.name,
            page_id=ad.competitor.page_id,
            page_url=ad.competitor.page_url,
            is_active=ad.competitor.is_active,
            ads_count=len(ad.competitor.ads)
        ) if ad.competitor else None

        # Extract data from nested fields to populate top-level DTO fields
        first_creative = ad.creatives[0] if ad.creatives else {}
        main_media = first_creative.get('media', [])[0] if first_creative.get('media') else {}

        return AdResponseDTO(
            id=ad.id,
            ad_archive_id=ad.ad_archive_id,
            competitor=competitor_dto,
            analysis=analysis_dto,
            meta=ad.meta,
            targeting=ad.targeting,
            lead_form=ad.lead_form,
            creatives=ad.creatives,
            date_found=ad.date_found,
            created_at=ad.created_at,
            updated_at=ad.updated_at,
            
            # Populated from nested data
            ad_copy=first_creative.get('body'),
            main_title=first_creative.get('headline'),
            cta_text=first_creative.get('cta', {}).get('text'),
            cta_type=first_creative.get('cta', {}).get('type'),
            media_type=main_media.get('type'),
            media_url=main_media.get('url'),
            is_active=ad.meta.get('is_active') if ad.meta else None,
            start_date=ad.meta.get('start_date') if ad.meta else None,
            end_date=ad.meta.get('end_date') if ad.meta else None,
            duration_days=ad.duration_days,
        )
    
    def _convert_to_detail_dto(self, ad: Ad) -> AdDetailResponseDTO:
        """Helper to convert Ad model to AdDetailResponseDTO"""
        if not ad:
            return None
            
        analysis_dto = AdAnalysisResponseDTO.from_orm(ad.analysis) if ad.analysis else None
        
        competitor_dto = CompetitorResponseDTO(
            id=ad.competitor.id,
            name=ad.competitor.name,
            page_id=ad.competitor.page_id,
            page_url=ad.competitor.page_url,
            is_active=ad.competitor.is_active,
            ads_count=len(ad.competitor.ads)
        ) if ad.competitor else None

        first_creative = ad.creatives[0] if ad.creatives else {}
        main_media = first_creative.get('media', [])[0] if first_creative.get('media') else {}

        # The AdDetailResponseDTO has more fields, so we map them explicitly
        return AdDetailResponseDTO(
            id=ad.id,
            ad_archive_id=ad.ad_archive_id,
            competitor=competitor_dto,
            analysis=analysis_dto,
            meta=ad.meta,
            targeting=ad.targeting,
            lead_form=ad.lead_form,
            creatives=ad.creatives,
            date_found=ad.date_found,
            created_at=ad.created_at,
            updated_at=ad.updated_at,
            raw_data=ad.raw_data,
            
            # Populated from nested data
            ad_copy=first_creative.get('body'),
            main_title=first_creative.get('headline'),
            cta_text=first_creative.get('cta', {}).get('text'),
            cta_type=first_creative.get('cta', {}).get('type'),
            media_type=main_media.get('type'),
            media_url=main_media.get('url'),
            is_active=ad.meta.get('is_active') if ad.meta else None,
            start_date=ad.meta.get('start_date') if ad.meta else None,
            end_date=ad.meta.get('end_date') if ad.meta else None,
        )

    def delete_all_ads(self) -> int:
        """
        Delete all ads and their analyses from the database.
        
        Returns:
            Number of ads deleted
        """
        try:
            # First delete all analyses
            analyses_deleted = self.db.query(AdAnalysis).delete(synchronize_session=False)
            
            # Then delete all ads
            ads_deleted = self.db.query(Ad).delete(synchronize_session=False)
            
            self.db.commit()
            
            logger.info(f"Successfully deleted ALL {ads_deleted} ads and {analyses_deleted} analyses")
            return ads_deleted
            
        except Exception as e:
            logger.error(f"Error deleting all ads: {str(e)}")
            self.db.rollback()
            raise


def get_ad_service(db: Session) -> AdService:
    """
    Factory function to get AdService instance.
    
    Args:
        db: Database session
        
    Returns:
        AdService instance
    """
    return AdService(db) 