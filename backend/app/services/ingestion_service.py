from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime
import logging
from typing import Optional, Tuple, List, Dict, Any

from app.models import Competitor, Ad
from app.models.dto import AdCreate, AdIngestionResponse

logger = logging.getLogger(__name__)


class DataIngestionService:
    """
    Centralized service for handling ad data ingestion.
    
    This service acts as the single entry point for all scraped ad data,
    ensuring consistent processing and triggering of downstream tasks.
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    async def ingest_ad(self, ad_data: AdCreate) -> AdIngestionResponse:
        """
        Main method for ingesting ad data.
        
        This method:
        1. Validates the input data
        2. Finds or creates the competitor
        3. Creates or updates the ad record
        4. Triggers the AI analysis task
        
        Args:
            ad_data: Validated ad data from external scraper
            
        Returns:
            AdIngestionResponse with operation results
        """
        try:
            logger.info(f"Starting ad ingestion for ad_archive_id: {ad_data.ad_archive_id}")
            
            # Step 1: Find or create competitor
            competitor = await self._find_or_create_competitor(ad_data.competitor)
            logger.info(f"Using competitor: {competitor.name} (ID: {competitor.id})")
            
            # Step 2: Create or update ad record
            ad, is_new = await self._create_or_update_ad(ad_data, competitor.id)
            logger.info(f"{'Created new' if is_new else 'Updated existing'} ad: {ad.id}")
            
            # Step 3: Trigger AI analysis task
            analysis_task_id = await self._trigger_analysis_task(ad.id)
            logger.info(f"Triggered AI analysis task: {analysis_task_id}")
            
            # Step 4: Commit transaction
            self.db.commit()
            
            return AdIngestionResponse(
                success=True,
                ad_id=ad.id,
                competitor_id=competitor.id,
                analysis_task_id=analysis_task_id,
                message=f"Ad {ad_data.ad_archive_id} {'ingested' if is_new else 'updated'} successfully and analysis task dispatched"
            )
            
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Database integrity error during ad ingestion: {e}")
            return AdIngestionResponse(
                success=False,
                message=f"Database integrity error: Duplicate ad_archive_id or constraint violation"
            )
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Unexpected error during ad ingestion: {e}")
            return AdIngestionResponse(
                success=False,
                message=f"Ingestion failed: {str(e)}"
            )
    
    async def _find_or_create_competitor(self, competitor_data) -> Competitor:
        """
        Find existing competitor or create new one.
        
        Args:
            competitor_data: CompetitorCreateDTO data
            
        Returns:
            Competitor instance
        """
        # Try to find existing competitor by page_id
        existing_competitor = self.db.query(Competitor).filter_by(
            page_id=competitor_data.page_id
        ).first()
        
        if existing_competitor:
            # Update competitor info if name has changed
            if existing_competitor.name != competitor_data.name:
                logger.info(f"Updating competitor name from '{existing_competitor.name}' to '{competitor_data.name}'")
                existing_competitor.name = competitor_data.name
                existing_competitor.updated_at = datetime.utcnow()
            
            # Reactivate if it was deactivated
            if not existing_competitor.is_active and competitor_data.is_active:
                logger.info(f"Reactivating competitor: {existing_competitor.name}")
                existing_competitor.is_active = True
                existing_competitor.updated_at = datetime.utcnow()
            
            return existing_competitor
        
        # Create new competitor
        logger.info(f"Creating new competitor: {competitor_data.name}")
        new_competitor = Competitor(
            name=competitor_data.name,
            page_id=competitor_data.page_id,
            is_active=competitor_data.is_active
        )
        
        self.db.add(new_competitor)
        self.db.flush()  # Get the ID without committing
        
        return new_competitor
    
    async def _create_or_update_ad(self, ad_data: AdCreate, competitor_id: int) -> Tuple[Ad, bool]:
        """
        Create new ad or update existing one.
        
        Args:
            ad_data: AdCreateDTO data
            competitor_id: ID of the associated competitor
            
        Returns:
            Tuple of (Ad instance, is_new_record)
        """
        # Check if ad already exists
        existing_ad = self.db.query(Ad).filter_by(
            ad_archive_id=ad_data.ad_archive_id
        ).first()
        
        # Extract enhanced data from raw data
        enhanced_data = self._extract_enhanced_data(ad_data)
        
        # Prepare ad data for database
        ad_dict = {
            "competitor_id": competitor_id,
            "ad_archive_id": ad_data.ad_archive_id,
            "ad_copy": ad_data.ad_copy,  # Keep original ad_copy as fallback
            "media_type": ad_data.media_type,
            "media_url": ad_data.media_url,
            "landing_page_url": ad_data.landing_page_url,
            "date_found": ad_data.date_found,
            "page_name": ad_data.page_name,
            "publisher_platform": ad_data.publisher_platform,
            "impressions_text": ad_data.impressions_text,
            "end_date": ad_data.end_date,
            "cta_text": ad_data.cta_text,
            "cta_type": ad_data.cta_type,
            "raw_data": ad_data.raw_data,
            # Enhanced data fields
            "targeted_countries": enhanced_data.get("targeted_countries"),
            "form_details": enhanced_data.get("form_details"),
            "running_countries": enhanced_data.get("targeted_countries"),
            "extra_texts": enhanced_data.get("extra_texts", ad_data.extra_texts),
            "main_title": enhanced_data.get("main_title"),
            "main_body_text": enhanced_data.get("main_body_text"),
            "main_caption": enhanced_data.get("main_caption"),
            "card_count": enhanced_data.get("card_count"),
            "card_bodies": enhanced_data.get("card_bodies"),
            "card_titles": enhanced_data.get("card_titles"),
            "card_cta_texts": enhanced_data.get("card_cta_texts"),
            "card_urls": enhanced_data.get("card_urls"),
            "main_image_urls": enhanced_data.get("main_image_urls"),
            "main_video_urls": enhanced_data.get("main_video_urls")
        }
        
        if existing_ad:
            # Update existing ad
            logger.info(f"Updating existing ad: {ad_data.ad_archive_id}")
            
            for key, value in ad_dict.items():
                if key != "competitor_id":  # Don't change competitor association
                    setattr(existing_ad, key, value)
            
            existing_ad.updated_at = datetime.utcnow()
            return existing_ad, False
        
        # Create new ad
        logger.info(f"Creating new ad: {ad_data.ad_archive_id}")
        new_ad = Ad(**ad_dict)
        
        self.db.add(new_ad)
        self.db.flush()  # Get the ID without committing
        
        return new_ad, True
    
    def _extract_enhanced_data(self, ad_data: AdCreate) -> Dict[str, Any]:
        """
        Extract enhanced data from raw ad data.
        
        Args:
            ad_data: AdCreateDTO with raw_data
            
        Returns:
            Dict with extracted enhanced data
        """
        enhanced = {}
        
        if not ad_data.raw_data:
            return enhanced
        
        try:
            # Extract data from snapshot if available
            snapshot = ad_data.raw_data.get('snapshot', {})
            
            # Extract main content fields
            enhanced['main_title'] = snapshot.get('title', '')
            enhanced['main_body_text'] = snapshot.get('body', {}).get('text', '')
            enhanced['main_caption'] = snapshot.get('caption', '')
            
            # Extract form details from extra_texts
            extra_texts = snapshot.get('extra_texts', [])
            enhanced['form_details'] = self._extract_form_details(extra_texts)
            
            # Also store the original extra_texts for backward compatibility
            enhanced['extra_texts'] = extra_texts
            
            # Extract targeted countries
            enhanced['targeted_countries'] = self._extract_targeted_countries(ad_data.raw_data)
            
            # Extract card data
            cards = snapshot.get('cards', [])
            if cards:
                enhanced['card_count'] = len(cards)
                enhanced['card_bodies'] = [card.get('body', '') for card in cards]
                enhanced['card_titles'] = [card.get('title', '') for card in cards]
                enhanced['card_cta_texts'] = [card.get('cta_text', '') for card in cards]
                enhanced['card_urls'] = [card.get('link_url', '') for card in cards]
            else:
                # If no separate cards but has main body, treat it as a single card
                main_body = snapshot.get('body', {}).get('text', '')
                main_title = snapshot.get('title', '')
                if main_body:
                    enhanced['card_count'] = 1
                    enhanced['card_bodies'] = [main_body]
                    enhanced['card_titles'] = [main_title] if main_title else ['']
                    enhanced['card_cta_texts'] = [snapshot.get('cta_text', '')]
                    enhanced['card_urls'] = [snapshot.get('link_url', '')]
                
            # Extract media URLs from cards or main content
            image_urls = []
            video_urls = []
            
            if cards:
                # Extract from actual cards
                for card in cards:
                    if card.get('video_hd_url'):
                        video_urls.append(card['video_hd_url'])
                    elif card.get('video_sd_url'):
                        video_urls.append(card['video_sd_url'])
                    if card.get('video_preview_image_url'):
                        image_urls.append(card['video_preview_image_url'])
                    if card.get('resized_image_url'):
                        image_urls.append(card['resized_image_url'])
            else:
                # Extract from main snapshot level
                videos = snapshot.get('videos', [])
                images = snapshot.get('images', [])
                
                for video in videos:
                    if isinstance(video, dict):
                        if video.get('video_hd_url'):
                            video_urls.append(video['video_hd_url'])
                        elif video.get('video_sd_url'):
                            video_urls.append(video['video_sd_url'])
                        if video.get('video_preview_image_url'):
                            image_urls.append(video['video_preview_image_url'])
                
                for image in images:
                    if isinstance(image, dict) and image.get('resized_image_url'):
                        image_urls.append(image['resized_image_url'])
            
            enhanced['main_video_urls'] = video_urls
            enhanced['main_image_urls'] = image_urls
            
            logger.info(f"Enhanced data extracted for ad {ad_data.ad_archive_id}: "
                       f"Countries: {enhanced.get('targeted_countries', [])}, "
                       f"Form fields: {len(enhanced.get('form_details', []))}, "
                       f"Cards: {enhanced.get('card_count', 0)}")
            
        except Exception as e:
            logger.error(f"Error extracting enhanced data: {e}")
        
        return enhanced
    
    def _extract_enhanced_data_from_raw(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract enhanced data from raw ad data (for reprocessing existing ads).
        
        Args:
            raw_data: Raw Facebook API data
            
        Returns:
            Dict with extracted enhanced data
        """
        enhanced = {}
        
        if not raw_data:
            return enhanced
        
        try:
            # Extract data from snapshot if available
            snapshot = raw_data.get('snapshot', {})
            
            # Extract main content fields
            enhanced['main_title'] = snapshot.get('title', '')
            enhanced['main_body_text'] = snapshot.get('body', {}).get('text', '')
            enhanced['main_caption'] = snapshot.get('caption', '')
            
            # Extract form details from extra_texts
            extra_texts = snapshot.get('extra_texts', [])
            logger.info(f"Reprocessing: Extracting form details from {len(extra_texts)} extra_texts")
            enhanced['form_details'] = self._extract_form_details(extra_texts)
            logger.info(f"Reprocessing: Extracted {len(enhanced.get('form_details', []))} form details")
            
            # Extract targeted countries
            enhanced['running_countries'] = self._extract_targeted_countries(raw_data)
            
            # Extract card data
            cards = snapshot.get('cards', [])
            if cards:
                enhanced['card_count'] = len(cards)
                enhanced['card_bodies'] = [card.get('body', '') for card in cards]
                enhanced['card_titles'] = [card.get('title', '') for card in cards]
                enhanced['card_cta_texts'] = [card.get('cta_text', '') for card in cards]
                enhanced['card_urls'] = [card.get('link_url', '') for card in cards]
            else:
                # If no separate cards but has main body, treat it as a single card
                main_body = snapshot.get('body', {}).get('text', '')
                main_title = snapshot.get('title', '')
                if main_body:
                    enhanced['card_count'] = 1
                    enhanced['card_bodies'] = [main_body]
                    enhanced['card_titles'] = [main_title] if main_title else ['']
                    enhanced['card_cta_texts'] = [snapshot.get('cta_text', '')]
                    enhanced['card_urls'] = [snapshot.get('link_url', '')]
            
            logger.info(f"Enhanced data extracted for reprocessing: "
                       f"Countries: {enhanced.get('running_countries', [])}, "
                       f"Form fields: {len(enhanced.get('form_details', []))}, "
                       f"Cards: {enhanced.get('card_count', 0)}")
            
        except Exception as e:
            logger.error(f"Error extracting enhanced data for reprocessing: {e}")
        
        return enhanced
    

    
    def _extract_form_details(self, extra_texts: List[Any]) -> List[str]:
        """
        Extract form details from extra_texts - treat all extra_texts as form details.
        """
        form_details = []
        
        for extra in extra_texts:
            if isinstance(extra, dict):
                text = extra.get('text', '')
            elif isinstance(extra, str):
                text = extra
            else:
                continue
                
            if text.strip():  # Only add non-empty texts
                form_details.append(text)
        
        return form_details
    
    def _extract_targeted_countries(self, raw_data: Dict[str, Any]) -> List[str]:
        """
        Extract targeted countries from various fields in raw data.
        """
        countries = []
        
        # Check targeted_or_reached_countries
        targeted_countries = raw_data.get('targeted_or_reached_countries', [])
        if targeted_countries:
            countries.extend(targeted_countries)
        
        # Check political_countries
        political_countries = raw_data.get('political_countries', [])
        if political_countries:
            countries.extend(political_countries)
        
        # Check snapshot for country info
        snapshot = raw_data.get('snapshot', {})
        country_iso = snapshot.get('country_iso_code')
        if country_iso:
            countries.append(country_iso)
        
        # Remove duplicates and empty values
        countries = list(set([c for c in countries if c]))
        
        # If no countries found, try to infer from other data
        if not countries:
            # Check if this looks like a specific region based on content
            content_text = ""
            if snapshot.get('body', {}).get('text'):
                content_text += snapshot['body']['text']
            for card in snapshot.get('cards', []):
                if card.get('body'):
                    content_text += " " + card['body']
            
            # Simple heuristics for common markets
            content_lower = content_text.lower()
            if any(keyword in content_lower for keyword in ['dubai', 'uae', 'emirates']):
                countries.append('AE')
            elif any(keyword in content_lower for keyword in ['riyadh', 'saudi', 'ksa']):
                countries.append('SA')
            elif any(keyword in content_lower for keyword in ['doha', 'qatar']):
                countries.append('QA')
        
        return countries
    
    async def _trigger_analysis_task(self, ad_id: int) -> str:
        """
        Trigger AI analysis task for the given ad.
        
        Args:
            ad_id: ID of the ad to analyze
            
        Returns:
            Task ID of the dispatched analysis task
        """
        try:
            # Import here to avoid circular import
            from app.tasks.ai_analysis_tasks import ai_analysis_task
            
            # Dispatch the AI analysis task
            task = ai_analysis_task.delay(ad_id)
            logger.info(f"AI analysis task dispatched: {task.id} for ad: {ad_id}")
            return task.id
        
        except Exception as e:
            logger.error(f"Failed to dispatch AI analysis task for ad {ad_id}: {e}")
            # Don't fail the entire ingestion if task dispatch fails
            # The ad is still saved, analysis can be triggered manually later
            return "failed-to-dispatch"
    
    async def batch_ingest_ads(self, ads_data: list[AdCreate]) -> dict:
        """
        Batch ingest multiple ads at once.
        
        Args:
            ads_data: List of AdCreateDTO objects
            
        Returns:
            Dict with batch processing results
        """
        logger.info(f"Starting batch ingestion of {len(ads_data)} ads")
        
        results = []
        successful_count = 0
        failed_count = 0
        
        for ad_data in ads_data:
            try:
                result = await self.ingest_ad(ad_data)
                results.append({
                    "ad_archive_id": ad_data.ad_archive_id,
                    "success": result.success,
                    "ad_id": result.ad_id,
                    "message": result.message
                })
                
                if result.success:
                    successful_count += 1
                else:
                    failed_count += 1
                    
            except Exception as e:
                logger.error(f"Failed to ingest ad {ad_data.ad_archive_id}: {e}")
                results.append({
                    "ad_archive_id": ad_data.ad_archive_id,
                    "success": False,
                    "error": str(e)
                })
                failed_count += 1
        
        logger.info(f"Batch ingestion completed: {successful_count} successful, {failed_count} failed")
        
        return {
            "total_ads": len(ads_data),
            "successful": successful_count,
            "failed": failed_count,
            "results": results,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_ingestion_stats(self) -> dict:
        """
        Get statistics about ingested data.
        
        Returns:
            Dict with ingestion statistics
        """
        try:
            total_ads = self.db.query(Ad).count()
            total_competitors = self.db.query(Competitor).count()
            active_competitors = self.db.query(Competitor).filter_by(is_active=True).count()
            
            # Get recent ingestion activity (last 24 hours)
            from datetime import timedelta
            yesterday = datetime.utcnow() - timedelta(days=1)
            recent_ads = self.db.query(Ad).filter(Ad.created_at >= yesterday).count()
            
            return {
                "total_ads": total_ads,
                "total_competitors": total_competitors,
                "active_competitors": active_competitors,
                "recent_ads_24h": recent_ads,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get ingestion stats: {e}")
            return {
                "error": "Failed to retrieve statistics",
                "timestamp": datetime.utcnow().isoformat()
            } 