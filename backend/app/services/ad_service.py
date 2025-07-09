from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, desc, asc, cast, String as SQLAString, literal, case
from typing import List, Optional, Dict, Any, Tuple, Union, Sequence
from datetime import datetime, timedelta
import logging

from app.models import Ad, Competitor, AdAnalysis, AdSet
from app.models.dto.ad_dto import (
    AdFilterParams, 
    AdResponseDTO, 
    AdDetailResponseDTO, 
    PaginatedAdResponseDTO, 
    PaginationMetadata,
    AdStatsResponseDTO,
    AdStats,
    Campaign,
    AdvertiserInfo,
    PaginatedAdResponse,
    AdResponse,
    AdAnalysisResponseDTO
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
        Get paginated and filtered ads grouped by AdSets.
        Returns the "best" ad from each set with the variant count.
        
        Args:
            filters: AdFilterParams containing pagination and filter parameters
            
        Returns:
            PaginatedAdResponseDTO with the best ad from each set and pagination metadata
        """
        try:
            # Build base query on AdSet model
            query = self.db.query(AdSet).options(
                joinedload(AdSet.best_ad).joinedload(Ad.competitor),
                joinedload(AdSet.best_ad).joinedload(Ad.analysis)
            )
            
            # Apply filters to the AdSets based on their best ads
            query = self._apply_adset_filters(query, filters)
            
            # Apply sorting
            sort_by = filters.sort_by or "created_at"
            sort_order = filters.sort_order or "desc"
            query = self._apply_adset_sorting(query, sort_by, sort_order)
            
            # Get total count before pagination
            total_items = query.count()
            
            # Apply pagination
            offset = (filters.page - 1) * filters.page_size
            ad_sets = query.offset(offset).limit(filters.page_size).all()
            
            # Convert to DTOs with AdSet information
            ad_dtos = []
            for ad_set in ad_sets:
                if ad_set.best_ad:
                    # Convert the best ad to DTO and add AdSet information
                    ad_dto = self._convert_to_dto(ad_set.best_ad)
                    ad_dto.ad_set_id = ad_set.id
                    ad_dto.variant_count = ad_set.variant_count
                    ad_dtos.append(ad_dto)
                else:
                    # If there's no best_ad, fetch the first ad in the set
                    first_ad = self.db.query(Ad).filter(Ad.ad_set_id == ad_set.id).first()
                    if first_ad:
                        ad_dto = self._convert_to_dto(first_ad)
                        ad_dto.ad_set_id = ad_set.id
                        ad_dto.variant_count = ad_set.variant_count
                        ad_dtos.append(ad_dto)
            
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
            logger.error(f"Error fetching ad sets: {str(e)}")
            raise
    
    def _apply_adset_filters(self, query, filters: AdFilterParams):
        """
        Apply filters to AdSet query based on filter parameters.
        Filters are applied based on the properties of the best ad in each set.
        """
        try:
            # Filter by competitor
            if filters.competitor_id:
                query = query.join(AdSet.best_ad).filter(Ad.competitor_id == filters.competitor_id)
            
            if filters.competitor_name:
                query = query.join(AdSet.best_ad).join(Ad.competitor).filter(
                    Competitor.name.ilike(f"%{filters.competitor_name}%")
                )
            
            # Filter by has_analysis
            if filters.has_analysis is not None:
                if filters.has_analysis:
                    query = query.join(AdSet.best_ad).join(Ad.analysis, isouter=True).filter(AdAnalysis.id.isnot(None))
                else:
                    query = query.join(AdSet.best_ad).outerjoin(Ad.analysis).filter(AdAnalysis.id.is_(None))
            
            # Filter by hook_score
            if filters.min_hook_score is not None:
                query = query.join(AdSet.best_ad).join(Ad.analysis).filter(
                    AdAnalysis.hook_score >= filters.min_hook_score
                )
                
            if filters.max_hook_score is not None:
                query = query.join(AdSet.best_ad).join(Ad.analysis).filter(
                    AdAnalysis.hook_score <= filters.max_hook_score
                )
            
            # Filter by overall_score
            if filters.min_overall_score is not None:
                query = query.join(AdSet.best_ad).join(Ad.analysis).filter(
                    AdAnalysis.overall_score >= filters.min_overall_score
                )
                
            if filters.max_overall_score is not None:
                query = query.join(AdSet.best_ad).join(Ad.analysis).filter(
                    AdAnalysis.overall_score <= filters.max_overall_score
                )
            
            # Filter by duration
            if filters.min_duration_days is not None:
                query = query.join(AdSet.best_ad).filter(Ad.duration_days >= filters.min_duration_days)
                
            if filters.max_duration_days is not None:
                query = query.join(AdSet.best_ad).filter(Ad.duration_days <= filters.max_duration_days)
            
            # Filter by date range
            if filters.date_from:
                query = query.join(AdSet.best_ad).filter(Ad.date_found >= filters.date_from)
                
            if filters.date_to:
                query = query.join(AdSet.best_ad).filter(Ad.date_found <= filters.date_to)
            
            # Filter by active status
            if filters.is_active is not None:
                # Check the meta JSON field for is_active
                query = query.join(AdSet.best_ad).filter(
                    cast(Ad.meta['is_active'].astext, SQLAString) == str(filters.is_active).lower()
                )
            
            # Search in ad content
            if filters.search:
                search_term = f"%{filters.search}%"
                query = query.join(AdSet.best_ad).filter(
                    or_(
                        # Search in ad text fields within the creatives JSON
                        cast(Ad.creatives, SQLAString).ilike(search_term),
                        # Check for page name within the meta JSON
                        cast(Ad.meta, SQLAString).ilike(search_term)
                    )
                )
                
            # Filter by media type
            if filters.media_type:
                query = query.join(AdSet.best_ad).filter(
                    cast(Ad.creatives, SQLAString).like(f'%"type": "{filters.media_type}"%')
                )
                
            return query
        except Exception as e:
            logger.error(f"Error applying filters to AdSet query: {str(e)}")
            raise
    
    def _apply_adset_sorting(self, query, sort_by: str, sort_order: str):
        """
        Apply sorting to AdSet query.
        Sorting is based on the properties of the best ad in each set.
        """
        try:
            # Determine sort direction
            direction = desc if sort_order.lower() == "desc" else asc
            
            # Apply sorting based on different fields
            if sort_by == "created_at" or sort_by == "date_found" or sort_by == "updated_at":
                # Sort by date fields from the Ad model
                query = query.join(AdSet.best_ad).order_by(direction(getattr(Ad, sort_by)))
            elif sort_by == "variant_count":
                # Sort directly by AdSet's variant_count
                query = query.order_by(direction(AdSet.variant_count))
            elif sort_by == "hook_score" or sort_by == "overall_score":
                # Sort by analysis scores
                query = query.join(AdSet.best_ad).join(Ad.analysis, isouter=True).order_by(
                    direction(getattr(AdAnalysis, sort_by, None)),
                    desc(Ad.date_found)  # Secondary sort by date found
                )
            else:
                # Default to sorting by AdSet creation date
                query = query.order_by(direction(AdSet.created_at))
                
            return query
        except Exception as e:
            logger.error(f"Error applying sorting to AdSet query: {str(e)}")
            raise
    
    def get_ad_by_id(self, ad_id: int) -> Optional[AdDetailResponseDTO]:
        """Get a single ad by ID."""
        ad = self.db.query(Ad).options(
            joinedload(Ad.competitor),
            joinedload(Ad.analysis)
        ).filter(Ad.id == ad_id).first()
        
        if not ad:
            return None
            
        return self._convert_to_detail_dto(ad)
    
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
                        cast(Ad.lead_form_standalone_fields, SQLAString) != '[]',
                        cast(Ad.lead_form_questions, SQLAString) != '{}'
                    )
                )
            else:
                # Empty lead form fields
                query = query.filter(
                    and_(
                        cast(Ad.lead_form_standalone_fields, SQLAString) == '[]',
                        cast(Ad.lead_form_questions, SQLAString) == '{}'
                    )
                )
        
        if filters.platform:
            query = query.filter(Ad.platforms.contains([filters.platform]))
        
        if filters.media_type:
            # Check in creatives array for media type
            query = query.filter(
                cast(Ad.creatives, SQLAString).like(f'%"type": "{filters.media_type}"%')
            )
        
        if filters.query:
            # Search in various text fields
            search_term = f"%{filters.query}%"
            query = query.filter(
                or_(
                    cast(Ad.creatives, SQLAString).ilike(search_term),
                    # Check for page name within the meta JSON
                    Ad.meta.op('->>')('page_name').ilike(search_term)
                )
            )
        
        # Count total results for pagination
        total = query.count()
        
        # Apply pagination
        query = query.order_by(desc(Ad.date_found))
        page_size = getattr(filters, 'limit', filters.page_size)
        query = query.offset((filters.page - 1) * page_size).limit(page_size)
        
        # Get results
        items = query.all()
        
        # Convert items to AdResponse objects
        response_items = [AdResponse.model_validate(item) for item in items]
        
        # Calculate total pages
        total_pages = (total + page_size - 1) // page_size
        
        return PaginatedAdResponse(
            items=response_items,
            total=total,
            page=filters.page,
            limit=page_size,
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
                platforms = []
                if hasattr(ads[0], 'platforms') and ads[0].platforms is not None:
                    platforms = ads[0].platforms
                
                # Convert ads to AdResponse objects
                response_ads = [AdResponse.model_validate(ad) for ad in ads]
                
                campaigns.append(Campaign(
                    campaign_id=campaign_id,
                    platforms=platforms,
                    ads=response_ads
                ))
        
        return campaigns
    
    def get_ad_stats(self) -> AdStats:
        """Get ad statistics"""
        total_ads = self.db.query(func.count(Ad.id)).scalar() or 0
        active_ads = self.db.query(func.count(Ad.id)).filter(Ad.meta_is_active == True).scalar() or 0
        
        # Count ads with lead forms
        with_lead_form = self.db.query(func.count(Ad.id)).filter(
            or_(
                cast(Ad.lead_form_standalone_fields, SQLAString) != '[]',
                cast(Ad.lead_form_questions, SQLAString) != '{}'
            )
        ).scalar() or 0
        
        # Get platform stats
        platforms_stats = {}
        for ad in self.db.query(Ad.platforms).all():
            platforms = []
            if hasattr(ad, 'platforms') and ad.platforms is not None:
                platforms = ad.platforms
                
            for platform in platforms:
                    platforms_stats[platform] = platforms_stats.get(platform, 0) + 1
        
        # Get media type stats
        # This is more complex with JSON array, using a simplified approach
        media_types = {
            "Image": self.db.query(func.count(Ad.id)).filter(cast(Ad.creatives, SQLAString).like('%"type": "Image"%')).scalar() or 0,
            "Video": self.db.query(func.count(Ad.id)).filter(cast(Ad.creatives, SQLAString).like('%"type": "Video"%')).scalar() or 0,
            "Carousel": self.db.query(func.count(Ad.id)).filter(cast(Ad.creatives, SQLAString).like('%"type": "Carousel"%')).scalar() or 0,
            "Other": self.db.query(func.count(Ad.id)).filter(
                and_(
                    ~cast(Ad.creatives, SQLAString).like('%"type": "Image"%'),
                    ~cast(Ad.creatives, SQLAString).like('%"type": "Video"%'),
                    ~cast(Ad.creatives, SQLAString).like('%"type": "Carousel"%')
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
                cast(Ad.creatives, SQLAString).ilike(f'%{query}%'),
                cast(Ad.meta, SQLAString).ilike(f'%{query}%')
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
        """
        Apply filters to query based on filter parameters.
        """
        
        if filters.competitor_id:
            query = query.filter(Ad.competitor_id == filters.competitor_id)
        
        if filters.competitor_name:
            query = query.join(Ad.competitor).filter(Competitor.name.ilike(f"%{filters.competitor_name}%"))
        
        if filters.media_type and filters.media_type != 'all':
            query = query.filter(cast(Ad.creatives, SQLAString).ilike(f'%"type": "{filters.media_type}"%'))
        
        if filters.is_active is not None:
            query = query.filter(cast(Ad.meta['is_active'], SQLAString) == str(filters.is_active).lower())

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
                    cast(Ad.creatives, SQLAString).ilike(search_query),
                    Competitor.name.ilike(search_query)
                )
            )
        
        return query
    
    def _apply_sorting(self, query, sort_by: str, sort_order: str):
        """
        Apply sorting to query based on sort_by and sort_order.
        """
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
        """
        Convert Ad entity to AdResponseDTO.
        """
        if not ad:
            return None  # type: ignore
            
        try:
            import json
            
            competitor_dto = None
            if ad.competitor:
                competitor_dto = CompetitorResponseDTO(
                    id=ad.competitor.id,
                    name=ad.competitor.name,
                    page_id=ad.competitor.page_id,
                    is_active=ad.competitor.is_active,
                    ads_count=0  # Will be calculated later if needed
                )
            
            # Extract media information
            media_type = None
            media_url = None
            main_image_urls = []
            main_video_urls = []
            
            # Initialize text content variables
            ad_copy = None
            main_title = None
            main_body_text = None
            main_caption = None
            
            # Process creatives if they exist
            creatives_data = []
            if ad.creatives:
                # Handle the case when creatives is a string (JSON string)
                if isinstance(ad.creatives, str):
                    try:
                        creatives_data = json.loads(ad.creatives)
                    except json.JSONDecodeError:
                        logger.error(f"Failed to parse creatives JSON for ad {ad.id}")
                        creatives_data = []
                else:
                    # Creatives is already a list or dict
                    creatives_data = ad.creatives
                
                # If creatives_data is a dict, convert to list for consistency
                if isinstance(creatives_data, dict):
                    creatives_data = [creatives_data]
                
                # Process each creative
                if isinstance(creatives_data, list):
                    for creative in creatives_data:
                        # Extract media information
                        if creative.get('media'):
                            for media in creative.get('media'):
                                if media.get('type') == 'Video':
                                    main_video_urls.append(media.get('url'))
                                    if not media_type:
                                        media_type = 'Video'
                                        media_url = media.get('url')
                                elif media.get('type') == 'Image':
                                    main_image_urls.append(media.get('url'))
                                    if not media_type and not main_video_urls:
                                        media_type = 'Image'
                                        media_url = media.get('url')
                        
                        # Extract text content
                        if creative.get('headline') and not main_title:
                            main_title = creative.get('headline')
                        if creative.get('body') and not main_body_text:
                            main_body_text = creative.get('body')
                        if creative.get('link', {}).get('caption') and not main_caption:
                            main_caption = creative.get('link', {}).get('caption')
            
            # Combine text fields for ad_copy
            all_text = [main_title, main_body_text, main_caption]
            ad_copy = " ".join([t for t in all_text if t])
            
            # Extract page info
            page_name = None
            page_id = None
            
            if ad.competitor:
                page_name = ad.competitor.name
                page_id = ad.competitor.page_id
                
            # Extract dates and status
            start_date = None
            end_date = None
            is_active = False
            
            # Parse meta data
            meta_data = {}
            if ad.meta:
                # Handle the case when meta is a string (JSON string)
                if isinstance(ad.meta, str):
                    try:
                        meta_data = json.loads(ad.meta)
                    except json.JSONDecodeError:
                        logger.error(f"Failed to parse meta JSON for ad {ad.id}")
                        meta_data = {}
                else:
                    meta_data = ad.meta
                
                if isinstance(meta_data, dict):
                    if 'start_date' in meta_data:
                        start_date = meta_data.get('start_date')
                    if 'end_date' in meta_data:
                        end_date = meta_data.get('end_date')
                    if 'is_active' in meta_data:
                        is_active = meta_data.get('is_active', False)
            
            # Extract CTA info
            cta_text = None
            cta_type = None
            
            if isinstance(creatives_data, list):
                for creative in creatives_data:
                    if creative.get('cta', {}).get('text') and not cta_text:
                        cta_text = creative.get('cta', {}).get('text')
                    if creative.get('cta', {}).get('type') and not cta_type:
                        cta_type = creative.get('cta', {}).get('type')
            
            # Parse targeting data
            targeting_data = {}
            targeted_countries = []
            if ad.targeting:
                # Handle the case when targeting is a string (JSON string)
                if isinstance(ad.targeting, str):
                    try:
                        targeting_data = json.loads(ad.targeting)
                    except json.JSONDecodeError:
                        logger.error(f"Failed to parse targeting JSON for ad {ad.id}")
                        targeting_data = {}
                else:
                    targeting_data = ad.targeting
                
                if isinstance(targeting_data, dict) and 'locations' in targeting_data:
                    targeted_countries = targeting_data.get('locations', [])
            
            # Parse lead form data
            lead_form_data = {}
            if ad.lead_form:
                # Handle the case when lead_form is a string (JSON string)
                if isinstance(ad.lead_form, str):
                    try:
                        lead_form_data = json.loads(ad.lead_form)
                    except json.JSONDecodeError:
                        logger.error(f"Failed to parse lead_form JSON for ad {ad.id}")
                        lead_form_data = {}
                else:
                    lead_form_data = ad.lead_form
            
            # Extract publisher platforms - using empty list as default since we don't have this data
            publisher_platform = []
            
            # Create the analysis DTO if analysis exists
            analysis_dto = None
            if ad.analysis:
                analysis_dto = AdAnalysisResponseDTO(
                    id=ad.analysis.id,
                    summary=ad.analysis.summary,
                    hook_score=ad.analysis.hook_score,
                    overall_score=ad.analysis.overall_score,
                    confidence_score=ad.analysis.confidence_score,
                    target_audience=ad.analysis.target_audience,
                    content_themes=ad.analysis.content_themes,
                    analysis_version=ad.analysis.analysis_version,
                    created_at=ad.analysis.created_at,
                    updated_at=ad.analysis.updated_at
                )
            
            # Create the ad response DTO
            return AdResponseDTO(
                id=ad.id,
                ad_archive_id=ad.ad_archive_id,
                competitor=competitor_dto,
                
                # Content fields
                ad_copy=ad_copy,
                main_title=main_title,
                main_body_text=main_body_text,
                main_caption=main_caption,
                
                # Media fields
                media_type=media_type,
                media_url=media_url,
                main_image_urls=main_image_urls,
                main_video_urls=main_video_urls,
                
                # Page info
                page_name=page_name,
                page_id=page_id,
                
                # Platform and targeting
                publisher_platform=publisher_platform,
                targeted_countries=targeted_countries,
                
                # Performance indicators - these are placeholder values
                impressions_text=None,
                spend=None,
                
                # CTA fields
                cta_text=cta_text,
                cta_type=cta_type,
                
                # Dates and status
                date_found=ad.date_found,
                start_date=start_date,
                end_date=end_date,
                is_active=is_active,
                duration_days=ad.duration_days,
                
                # Timestamps
                created_at=ad.created_at,
                updated_at=ad.updated_at,
                
                # Analysis data
                analysis=analysis_dto,
                
                # Raw data fields - use the parsed dictionaries
                meta=meta_data,
                targeting=targeting_data,
                lead_form=lead_form_data,
                creatives=creatives_data,
                
                # AdSet fields - will be populated later when needed
                ad_set_id=ad.ad_set_id,
                variant_count=None  # This will be set separately when needed
            )
            
        except Exception as e:
            logger.error(f"Error converting ad to DTO: {str(e)}")
            raise
    
    def _convert_to_detail_dto(self, ad: Ad) -> AdDetailResponseDTO:
        """Helper to convert Ad model to AdDetailResponseDTO"""
        if not ad:
            return None  # type: ignore
            
        analysis_dto = None
        if hasattr(ad, 'analysis') and ad.analysis is not None:
            analysis_dto = AdAnalysisResponseDTO.model_validate(ad.analysis)
        
        competitor_dto = None
        if hasattr(ad, 'competitor') and ad.competitor is not None:
            competitor_dto = CompetitorResponseDTO.model_validate(ad.competitor)

        creatives = []
        if hasattr(ad, 'creatives') and ad.creatives is not None:
            creatives = ad.creatives

        first_creative = creatives[0] if creatives else {}
        main_media = first_creative.get('media', [])[0] if first_creative.get('media') else {}

        # Prepare meta data
        meta_is_active = None
        meta_start_date = None
        meta_end_date = None
        
        if hasattr(ad, 'meta') and ad.meta is not None:
            meta = ad.meta
            meta_is_active = meta.get('is_active')
            meta_start_date = meta.get('start_date')
            meta_end_date = meta.get('end_date')

        # The AdDetailResponseDTO has more fields, so we map them explicitly
        return AdDetailResponseDTO(
            id=ad.id,
            ad_archive_id=ad.ad_archive_id,
            competitor=competitor_dto,
            analysis=analysis_dto,
            meta=ad.meta,
            targeting=ad.targeting,
            lead_form=ad.lead_form,
            creatives=creatives,
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
            is_active=meta_is_active,
            start_date=meta_start_date,
            end_date=meta_end_date,
            
            # Required fields with default values
            main_body_text=None,
            main_caption=None,
            main_link_url=None,
            main_link_description=None,
            main_image_urls=[],
            main_video_urls=[],
            page_name=None,
            page_id=None,
            page_like_count=None,
            page_categories=None,
            page_profile_uri=None,
            page_profile_picture_url=None,
            publisher_platform=None,
            targeted_countries=None,
            display_format=None,
            impressions_text=None,
            impressions_index=None,
            spend=None,
            currency=None,
            extra_texts=None,
            extra_links=None,
            contains_sensitive_content=None,
            contains_digital_created_media=None
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

    def get_ads_in_set(self, ad_set_id: int, page: int = 1, page_size: int = 20) -> Optional[PaginatedAdResponseDTO]:
        """
        Get all ads within a specific ad set with pagination.
        
        Args:
            ad_set_id: The ID of the ad set
            page: Page number (1-indexed)
            page_size: Number of items per page
            
        Returns:
            PaginatedAdResponseDTO with all ads in the set and pagination metadata
        """
        try:
            # Check if the ad set exists
            ad_set = self.db.query(AdSet).filter(AdSet.id == ad_set_id).first()
            if not ad_set:
                return None
                
            # Build query for ads in this set
            query = self.db.query(Ad).options(
                joinedload(Ad.competitor),
                joinedload(Ad.analysis)
            ).filter(Ad.ad_set_id == ad_set_id)
            
            # Get total count before pagination
            total_items = query.count()
            
            # Apply pagination
            offset = (page - 1) * page_size
            ads = query.offset(offset).limit(page_size).all()
            
            # Convert to DTOs
            ad_dtos = []
            for ad in ads:
                try:
                    ad_dto = self._convert_to_dto(ad)
                    if ad_dto:
                        ad_dtos.append(ad_dto)
                except Exception as e:
                    logger.error(f"Error converting ad {ad.id} to DTO: {str(e)}")
            
            # Calculate pagination metadata
            total_pages = (total_items + page_size - 1) // page_size
            pagination = PaginationMetadata(
                page=page,
                page_size=page_size,
                total_items=total_items,
                total_pages=total_pages,
                has_next=page < total_pages,
                has_previous=page > 1
            )
            
            return PaginatedAdResponseDTO(
                data=ad_dtos,
                pagination=pagination
            )
            
        except Exception as e:
            logger.error(f"Error fetching ads in set {ad_set_id}: {str(e)}")
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