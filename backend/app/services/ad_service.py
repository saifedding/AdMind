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
            # Use subquery to ensure joins are respected in count
            from sqlalchemy import select
            subquery = query.statement.alias()
            count_query = select(func.count()).select_from(subquery)
            total_items = self.db.execute(count_query).scalar()
            logger.info(f"📊 Total items after filtering: {total_items} (category_id={filters.category_id})")
            
            # Apply pagination
            offset = (filters.page - 1) * filters.page_size
            ad_sets = query.offset(offset).limit(filters.page_size).all()
            
            # Convert to DTOs with AdSet information
            ad_dtos = []
            for ad_set in ad_sets:
                if ad_set.best_ad:
                    # Convert the best ad to DTO and add AdSet information
                    ad_dto = self._convert_to_dto(ad_set.best_ad)
                    # Augment the Ad DTO with metadata from its parent AdSet
                    ad_dto.ad_set_id = ad_set.id
                    ad_dto.variant_count = ad_set.variant_count
                    ad_dto.ad_set_created_at = ad_set.created_at
                    ad_dto.ad_set_first_seen_date = ad_set.first_seen_date
                    ad_dto.ad_set_last_seen_date = ad_set.last_seen_date
                    # Set favorite status from AdSet, not individual Ad
                    ad_dto.is_favorite = getattr(ad_set, 'is_favorite', False)
                    ad_dtos.append(ad_dto)
                # Skip ad sets without best_ad to avoid N+1 queries
                # These should be rare and can be handled by data cleanup
            
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
        Optimized to minimize joins and improve performance.
        """
        try:
            # Track if we need to join with best_ad (do it only once)
            needs_ad_join = False
            needs_competitor_join = False
            needs_analysis_join = False
            
            # Check which joins we need
            if (filters.competitor_id or filters.competitor_name or filters.category_id or 
                filters.min_duration_days or filters.max_duration_days or filters.is_active or filters.search):
                needs_ad_join = True
                
            if filters.competitor_name or filters.category_id:
                needs_competitor_join = True
                
            if (filters.has_analysis is not None or filters.min_hook_score is not None or 
                filters.max_hook_score is not None or filters.min_overall_score is not None or 
                filters.max_overall_score is not None):
                needs_analysis_join = True
                needs_ad_join = True
            
            # Apply joins only once
            if needs_ad_join:
                query = query.join(AdSet.best_ad)
                
            if needs_competitor_join:
                query = query.join(Ad.competitor)
                
            if needs_analysis_join:
                query = query.join(Ad.analysis, isouter=True)
            
            # Apply filters
            if filters.competitor_id:
                query = query.filter(Ad.competitor_id == filters.competitor_id)
            
            if filters.competitor_name:
                query = query.filter(Competitor.name.ilike(f"%{filters.competitor_name}%"))
            
            if filters.category_id is not None:
                logger.info(f"🔍 Applying category filter: category_id={filters.category_id} (type: {type(filters.category_id).__name__})")
                if filters.category_id == -1:
                    # Special value -1 means "uncategorized"
                    logger.info(f"   Filtering for uncategorized competitors")
                    query = query.filter(Competitor.category_id.is_(None))
                else:
                    logger.info(f"   Filtering for category_id={filters.category_id}")
                    query = query.filter(Competitor.category_id == filters.category_id)
            
            # Filter by has_analysis
            if filters.has_analysis is not None:
                if filters.has_analysis:
                    query = query.filter(AdAnalysis.id.isnot(None))
                else:
                    query = query.filter(AdAnalysis.id.is_(None))
            
            # Score filters
            if filters.min_hook_score is not None:
                query = query.filter(AdAnalysis.hook_score >= filters.min_hook_score)
                
            if filters.max_hook_score is not None:
                query = query.filter(AdAnalysis.hook_score <= filters.max_hook_score)
            
            if filters.min_overall_score is not None:
                query = query.filter(AdAnalysis.overall_score >= filters.min_overall_score)
                
            if filters.max_overall_score is not None:
                query = query.filter(AdAnalysis.overall_score <= filters.max_overall_score)
            
            # Duration filters
            if filters.min_duration_days is not None:
                query = query.filter(Ad.duration_days >= filters.min_duration_days)
                
            if filters.max_duration_days is not None:
                query = query.filter(Ad.duration_days <= filters.max_duration_days)
            
            # Date range filters (AdSet level - no join needed)
            if filters.date_from:
                query = query.filter(AdSet.last_seen_date >= filters.date_from)
                
            if filters.date_to:
                query = query.filter(AdSet.first_seen_date <= filters.date_to)
            
            # Active status filter
            if filters.is_active is not None:
                query = query.filter(Ad.meta['is_active'].as_string() == str(filters.is_active).lower())
            
            # Favorite status (AdSet level - no join needed)
            if filters.is_favorite is not None:
                query = query.filter(AdSet.is_favorite == filters.is_favorite)
            
            # Search filter (optimized to avoid expensive JSON operations when possible)
            if filters.search:
                search_term = f"%{filters.search}%"
                # Use simpler text search when possible
                query = query.filter(
                    or_(
                        cast(Ad.creatives, SQLAString).ilike(search_term),
                        cast(Ad.meta, SQLAString).ilike(search_term)
                    )
                )
                
            # Filter by media type
            if filters.media_type and filters.media_type.lower() != 'all':
                mt_map = {'video': 'Video', 'image': 'Image', 'carousel': 'Carousel'}
                mt_norm = mt_map.get(filters.media_type.lower(), filters.media_type)
                query = query.join(AdSet.best_ad).filter(
                    cast(Ad.creatives, SQLAString).ilike(f'%"type": "{mt_norm}"%')
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
            if sort_by == "created_at":
                # Sort by Ad creation date (default)
                query = query.join(AdSet.best_ad).order_by(direction(Ad.created_at))
            elif sort_by == "date_found":
                # Sort by date the ad was first found
                query = query.join(AdSet.best_ad).order_by(direction(Ad.date_found))
            elif sort_by == "updated_at":
                # Sort by last update date
                query = query.join(AdSet.best_ad).order_by(direction(Ad.updated_at))
            elif sort_by == "variant_count":
                # Sort directly by AdSet's variant_count
                query = query.order_by(direction(AdSet.variant_count))
            elif sort_by == "duration_days":
                # Sort by duration in days
                query = query.join(AdSet.best_ad).order_by(direction(Ad.duration_days))
            elif sort_by == "hook_score":
                # Sort by hook score with null values last
                if sort_order.lower() == "desc":
                    query = query.join(AdSet.best_ad).join(Ad.analysis, isouter=True).order_by(
                        AdAnalysis.hook_score.desc().nullslast(),
                        desc(Ad.created_at)
                    )
                else:
                    query = query.join(AdSet.best_ad).join(Ad.analysis, isouter=True).order_by(
                        AdAnalysis.hook_score.asc().nullsfirst(),
                        desc(Ad.created_at)
                    )
            elif sort_by == "overall_score":
                # Sort by overall score with null values last
                if sort_order.lower() == "desc":
                    query = query.join(AdSet.best_ad).join(Ad.analysis, isouter=True).order_by(
                        AdAnalysis.overall_score.desc().nullslast(),
                        desc(Ad.created_at)
                    )
                else:
                    query = query.join(AdSet.best_ad).join(Ad.analysis, isouter=True).order_by(
                        AdAnalysis.overall_score.asc().nullsfirst(),
                        desc(Ad.created_at)
                    )
            else:
                # Default to sorting by Ad creation date (most recent first)
                query = query.join(AdSet.best_ad).order_by(desc(Ad.created_at))
                
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
        Delete multiple ads by IDs along with all related data.
        
        Args:
            ad_ids: List of ad IDs to delete
            
        Returns:
            Number of ads successfully deleted
        """
        try:
            from app.models.veo_generation import VeoGeneration
            from app.models.merged_video import MergedVideo
            
            # Unset best_ad_id in AdSets where it's one of the ads being deleted
            self.db.query(AdSet).filter(
                AdSet.best_ad_id.in_(ad_ids)
            ).update({"best_ad_id": None}, synchronize_session=False)

            # Delete all related data in correct order (child tables first)
            
            # 1. Delete Veo generations
            veo_deleted = self.db.query(VeoGeneration).filter(
                VeoGeneration.ad_id.in_(ad_ids)
            ).delete(synchronize_session=False)
            
            # 2. Delete merged videos
            merged_deleted = self.db.query(MergedVideo).filter(
                MergedVideo.ad_id.in_(ad_ids)
            ).delete(synchronize_session=False)
            
            # 3. Delete analyses
            analyses_deleted = self.db.query(AdAnalysis).filter(
                AdAnalysis.ad_id.in_(ad_ids)
            ).delete(synchronize_session=False)
            
            # 4. Finally delete the ads
            ads_deleted = self.db.query(Ad).filter(
                Ad.id.in_(ad_ids)
            ).delete(synchronize_session=False)
            
            self.db.commit()
            
            logger.info(
                f"Successfully deleted {ads_deleted} ads with "
                f"{analyses_deleted} analyses, {veo_deleted} Veo videos, "
                f"and {merged_deleted} merged videos"
            )
            return ads_deleted
            
        except Exception as e:
            logger.error(f"Error bulk deleting ads: {str(e)}")
            self.db.rollback()
            raise
    
    def toggle_favorite(self, ad_id: int) -> Optional[bool]:
        """
        Toggle the favorite status of an ad's AdSet.
        
        Args:
            ad_id: ID of the ad (will toggle its AdSet's favorite status)
            
        Returns:
            New favorite status (True/False) or None if ad not found
        """
        try:
            ad = self.db.query(Ad).filter(Ad.id == ad_id).first()
            
            if not ad or not ad.ad_set_id:
                logger.warning(f"Ad {ad_id} not found or not part of an ad set")
                return None
            
            # Get the AdSet and toggle its favorite status
            ad_set = self.db.query(AdSet).filter(AdSet.id == ad.ad_set_id).first()
            if not ad_set:
                logger.warning(f"AdSet {ad.ad_set_id} not found")
                return None
            
            # Toggle the favorite status
            ad_set.is_favorite = not ad_set.is_favorite
            self.db.commit()
            
            logger.info(f"Toggled favorite status for AdSet {ad_set.id} to {ad_set.is_favorite}")
            return ad_set.is_favorite
            
        except Exception as e:
            logger.error(f"Error toggling favorite for ad {ad_id}: {str(e)}")
            self.db.rollback()
            raise
    
    def toggle_ad_set_favorite(self, ad_set_id: int) -> Optional[bool]:
        """
        Toggle the favorite status of an AdSet.
        
        Args:
            ad_set_id: ID of the AdSet to toggle favorite status
            
        Returns:
            New favorite status (True/False) or None if AdSet not found
        """
        try:
            ad_set = self.db.query(AdSet).filter(AdSet.id == ad_set_id).first()
            
            if not ad_set:
                logger.warning(f"AdSet {ad_set_id} not found")
                return None
            
            # Toggle the favorite status
            ad_set.is_favorite = not ad_set.is_favorite
            self.db.commit()
            
            logger.info(f"Toggled favorite status for AdSet {ad_set_id} to {ad_set.is_favorite}")
            return ad_set.is_favorite
            
        except Exception as e:
            logger.error(f"Error toggling favorite for AdSet {ad_set_id}: {str(e)}")
            self.db.rollback()
            raise
    
    def save_ad_content(self, ad_id: int) -> Optional[Dict[str, Any]]:
        """
        Save the complete ad content including images and videos permanently.
        Downloads actual media files and stores them locally.
        
        Args:
            ad_id: ID of the ad to save
            
        Returns:
            Dictionary with saved content info or None if ad not found
        """
        try:
            ad = self.db.query(Ad).filter(Ad.id == ad_id).first()
            
            if not ad:
                logger.warning(f"Ad {ad_id} not found")
                return None
            
            # Download and save media files locally
            from app.services.media_storage_service import MediaStorageService
            media_service = MediaStorageService(self.db)
            
            logger.info(f"Downloading media for ad {ad_id}...")
            media_result = media_service.save_ad_media(ad_id)
            
            # Mark as saved by setting is_favorite to True
            ad.is_favorite = True
            
            # Additionally, if part of an AdSet, mark the AdSet as favorite too
            if ad.ad_set_id:
                ad_set = self.db.query(AdSet).filter(AdSet.id == ad.ad_set_id).first()
                if ad_set:
                    ad_set.is_favorite = True
            
            self.db.commit()
            
            # Collect saved content info
            saved_content = {
                "ad_id": ad.id,
                "is_saved": True,
                "saved_at": datetime.now().isoformat(),
                "content": {
                    "main_title": ad.raw_data.get("main_title") if ad.raw_data else None,
                    "main_body_text": ad.raw_data.get("main_body_text") if ad.raw_data else None,
                    "main_caption": ad.raw_data.get("main_caption") if ad.raw_data else None,
                    "image_urls": ad.raw_data.get("main_image_urls", []) if ad.raw_data else [],
                    "video_urls": ad.raw_data.get("main_video_urls", []) if ad.raw_data else [],
                    "creatives_count": len(ad.creatives) if ad.creatives and isinstance(ad.creatives, list) else 0,
                    "images_downloaded": media_result['images_saved'],
                    "videos_downloaded": media_result['videos_saved'],
                    "local_image_paths": media_result['local_image_paths'],
                    "local_video_paths": media_result['local_video_paths']
                }
            }
            
            logger.info(
                f"Successfully saved ad {ad_id}: "
                f"{media_result['images_saved']} images, "
                f"{media_result['videos_saved']} videos downloaded"
            )
            return saved_content
            
        except Exception as e:
            logger.error(f"Error saving ad content for ad {ad_id}: {str(e)}")
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
        
        if filters.is_favorite is not None:
            query = query.filter(Ad.is_favorite == filters.is_favorite)

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
            
            # Use ad.to_dict() to get dynamically built creatives
            ad_dict = ad.to_dict()
            creatives_data = ad_dict.get('creatives', [])
            
            # If creatives_data is a dict, convert to list for consistency
            if isinstance(creatives_data, dict):
                creatives_data = [creatives_data]
                
                # Process each creative
                if isinstance(creatives_data, list):
                    for creative in creatives_data:
                        # Skip if creative is None or not a dict
                        if not creative or not isinstance(creative, dict):
                            continue
                            
                        # Extract media information
                        media_list = creative.get('media')
                        if media_list and isinstance(media_list, list):
                            for media in media_list:
                                if not media or not isinstance(media, dict):
                                    continue
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
                        link = creative.get('link')
                        if link and isinstance(link, dict) and link.get('caption') and not main_caption:
                            main_caption = link.get('caption')
            
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
                    # Skip if creative is None or not a dict
                    if not creative or not isinstance(creative, dict):
                        continue
                    cta = creative.get('cta')
                    if cta and isinstance(cta, dict):
                        if cta.get('text') and not cta_text:
                            cta_text = cta.get('text')
                        if cta.get('type') and not cta_type:
                            cta_type = cta.get('type')
            
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
            try:
                current_analysis = ad.analysis
                if current_analysis is None:
                    from app.models.ad_analysis import AdAnalysis
                    current_analysis = self.db.query(AdAnalysis).filter(AdAnalysis.ad_id == ad.id, AdAnalysis.is_current == 1).first()
                if current_analysis:
                    analysis_dto = AdAnalysisResponseDTO(
                        id=current_analysis.id,
                        summary=current_analysis.summary,
                        hook_score=current_analysis.hook_score,
                        overall_score=current_analysis.overall_score,
                        confidence_score=current_analysis.confidence_score,
                        target_audience=current_analysis.target_audience,
                        content_themes=current_analysis.content_themes,
                        analysis_version=current_analysis.analysis_version,
                        created_at=current_analysis.created_at,
                        updated_at=current_analysis.updated_at
                    )
            except Exception:
                analysis_dto = None
            
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
                
                # User preferences
                is_favorite=ad.is_favorite if hasattr(ad, 'is_favorite') else False,
                
                # Timestamps
                created_at=ad.created_at,
                updated_at=ad.updated_at,
                
                # Analysis data
                analysis=analysis_dto,
                # Convenience flags
                is_analyzed=True if analysis_dto is not None else False,
                analysis_summary=analysis_dto.summary if analysis_dto and analysis_dto.summary else None,
                
                # Raw data fields - use the parsed dictionaries
                meta=meta_data,
                targeting=targeting_data,
                lead_form=lead_form_data,
                creatives=creatives_data,
                
                # AdSet fields - will be populated later when needed
                ad_set_id=ad.ad_set_id,
                variant_count=None,  # This will be set separately when needed
                ad_set_created_at=None,
                ad_set_first_seen_date=None,
                ad_set_last_seen_date=None
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

        # Use ad.to_dict() to get all extracted data, including dynamically built creatives
        ad_dict = ad.to_dict()
        
        # Get creatives from ad_dict (which includes dynamically built creatives from raw_data)
        creatives = ad_dict.get('creatives', [])
        
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
            is_favorite=ad.is_favorite if hasattr(ad, 'is_favorite') else False,
            
            # Extract from ad_dict which properly handles all data sources
            ad_copy=ad_dict.get('ad_copy'),
            main_title=ad_dict.get('main_title'),
            main_body_text=ad_dict.get('main_body_text'),
            main_caption=ad_dict.get('main_caption'),
            cta_text=ad_dict.get('cta_text'),
            cta_type=ad_dict.get('cta_type'),
            media_type=ad_dict.get('media_type'),
            media_url=ad_dict.get('media_url'),
            main_image_urls=ad_dict.get('main_image_urls', []),
            main_video_urls=ad_dict.get('main_video_urls', []),
            main_link_url=ad_dict.get('main_link_url'),
            main_link_description=ad_dict.get('main_link_description'),
            page_name=ad_dict.get('page_name'),
            page_id=ad_dict.get('page_id'),
            page_profile_picture_url=ad_dict.get('page_profile_picture_url'),
            publisher_platform=ad_dict.get('publisher_platform'),
            targeted_countries=ad_dict.get('targeted_countries'),
            impressions_text=ad_dict.get('impressions_text'),
            spend=ad_dict.get('spend'),
            is_active=ad_dict.get('is_active'),
            start_date=str(ad_dict.get('start_date')) if ad_dict.get('start_date') is not None else None,
            end_date=str(ad_dict.get('end_date')) if ad_dict.get('end_date') is not None else None,
            
            # Fields not in ad_dict - use defaults
            page_like_count=None,
            page_categories=None,
            page_profile_uri=None,
            display_format=None,
            impressions_index=None,
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
            from app.models.ad_set import AdSet
            from app.models.veo_generation import VeoGeneration
            from sqlalchemy import and_

            # 1. Identify "safe" ads (favorites) that should NOT be deleted
            # We want to keep all ads where is_favorite=True
            safe_ad_ids = self.db.query(Ad.id).filter(Ad.is_favorite == True).all()
            safe_ad_ids = [res[0] for res in safe_ad_ids] # Flatten list

            # 2. Handle AdSets - Unset best_ad_id ONLY if it points to an ad we are about to delete
            # If best_ad_id is a favorite, we keep it.
            if safe_ad_ids:
                # Set best_ad_id to None for AdSets where the best_ad is NOT in safe list
                self.db.query(AdSet).filter(
                    AdSet.best_ad_id.isnot(None),
                    ~AdSet.best_ad_id.in_(safe_ad_ids)
                ).update({"best_ad_id": None}, synchronize_session=False)
            else:
                # No safe ads, so wipe all best_ad_id references to be safe
                self.db.query(AdSet).filter(AdSet.best_ad_id.isnot(None)).update({"best_ad_id": None}, synchronize_session=False)

            # 3. Delete dependent data (VeoGeneration, AdAnalysis) but ONLY for ads that are NOT safe
            if safe_ad_ids:
                self.db.query(VeoGeneration).filter(~VeoGeneration.ad_id.in_(safe_ad_ids)).delete(synchronize_session=False)
                analyses_deleted = self.db.query(AdAnalysis).filter(~AdAnalysis.ad_id.in_(safe_ad_ids)).delete(synchronize_session=False)
                
                # 4. Delete the ads themselves (excluding favorites)
                ads_deleted = self.db.query(Ad).filter(~Ad.id.in_(safe_ad_ids)).delete(synchronize_session=False)
            else:
                # Fallback: Delete everything if no favorites exist (original behavior)
                self.db.query(VeoGeneration).delete(synchronize_session=False)
                analyses_deleted = self.db.query(AdAnalysis).delete(synchronize_session=False)
                ads_deleted = self.db.query(Ad).delete(synchronize_session=False)
            
            self.db.commit()
            
            logger.info(f"Successfully deleted {ads_deleted} ads and {analyses_deleted} analyses (Protected {len(safe_ad_ids)} favorites)")
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
                
            # Build query for ads in this set and eagerly load the related AdSet
            query = self.db.query(Ad).options(
                joinedload(Ad.competitor),
                joinedload(Ad.analysis),
                joinedload(Ad.ad_set)  # Eagerly load the parent AdSet to avoid N+1 queries
            ).filter(Ad.ad_set_id == ad_set_id)
            
            # Get total count before pagination
            total_items = query.count()
            
            # Apply pagination
            offset = (page - 1) * page_size
            ads = query.offset(offset).limit(page_size).all()
            
            # Convert to DTOs and include AdSet metadata
            ad_dtos = []
            for ad in ads:
                try:
                    ad_dto = self._convert_to_dto(ad)
                    # Attach AdSet metadata if available
                    if ad_dto and ad.ad_set:
                        ad_dto.variant_count = ad.ad_set.variant_count
                        ad_dto.ad_set_first_seen_date = ad.ad_set.first_seen_date
                        ad_dto.ad_set_last_seen_date = ad.ad_set.last_seen_date
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

    def get_ad_sets(self, page: int = 1, page_size: int = 20, sort_by: str = "created_at", sort_order: str = "desc") -> Optional[PaginatedAdResponseDTO]:
        """
        Get all ad sets with pagination.
        
        Args:
            page: Page number (1-indexed)
            page_size: Number of items per page
            sort_by: Field to sort by (created_at, variant_count, etc.)
            sort_order: Sort direction (asc, desc)
            
        Returns:
            PaginatedAdResponseDTO with the best ad from each set and pagination metadata
        """
        try:
            # Build base query on AdSet model
            query = self.db.query(AdSet).options(
                joinedload(AdSet.best_ad).joinedload(Ad.competitor),
                joinedload(AdSet.best_ad).joinedload(Ad.analysis)
            )
            
            # Apply sorting
            direction = desc if sort_order.lower() == "desc" else asc
            
            if sort_by == "created_at":
                query = query.order_by(direction(AdSet.created_at))
            elif sort_by == "variant_count":
                query = query.order_by(direction(AdSet.variant_count))
            elif sort_by == "first_seen_date":
                query = query.order_by(direction(AdSet.first_seen_date))
            elif sort_by == "last_seen_date":
                query = query.order_by(direction(AdSet.last_seen_date))
            else:
                query = query.order_by(direction(AdSet.created_at))
            
            # Get total count before pagination
            total_items = query.count()
            
            # Apply pagination
            offset = (page - 1) * page_size
            ad_sets = query.offset(offset).limit(page_size).all()
            
            # Convert to DTOs with AdSet information
            ad_dtos = []
            for ad_set in ad_sets:
                if ad_set.best_ad:
                    # Convert the best ad to DTO and add AdSet information
                    ad_dto = self._convert_to_dto(ad_set.best_ad)
                    # Augment the Ad DTO with metadata from its parent AdSet
                    ad_dto.ad_set_id = ad_set.id
                    ad_dto.variant_count = ad_set.variant_count
                    ad_dto.ad_set_created_at = ad_set.created_at
                    ad_dto.ad_set_first_seen_date = ad_set.first_seen_date
                    ad_dto.ad_set_last_seen_date = ad_set.last_seen_date
                    ad_dtos.append(ad_dto)
                else:
                    # If there's no best_ad, fetch the first ad in the set
                    first_ad = self.db.query(Ad).filter(Ad.ad_set_id == ad_set.id).first()
                    if first_ad:
                        ad_dto = self._convert_to_dto(first_ad)
                        ad_dto.ad_set_id = ad_set.id
                        ad_dto.variant_count = ad_set.variant_count
                        ad_dto.ad_set_created_at = ad_set.created_at
                        ad_dto.ad_set_first_seen_date = ad_set.first_seen_date
                        ad_dto.ad_set_last_seen_date = ad_set.last_seen_date
                        ad_dtos.append(ad_dto)
            
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
            logger.error(f"Error fetching ad sets: {str(e)}")
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
