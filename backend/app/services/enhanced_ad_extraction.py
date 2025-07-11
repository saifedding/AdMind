import json
import hashlib
from datetime import datetime, date, timezone
from typing import Dict, List, Optional, Any, Tuple, cast
import logging
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.models import Ad, Competitor, AdSet
from app.database import get_db
from app.services.creative_comparison_service import CreativeComparisonService

logger = logging.getLogger(__name__)


class EnhancedAdExtractionService:
    """Service for enhanced ad data extraction matching frontend_payload_final.json format"""
    
    EXTRACTION_VERSION = "1.0.0"
    
    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger(__name__)
        self.creative_comparison_service = CreativeComparisonService(db)
    
    def convert_timestamp_to_date(self, ts: Any) -> Optional[str]:
        """Converts a UNIX timestamp to a 'YYYY-MM-DD' formatted string."""
        if not ts: 
            return None
        try:
            return datetime.fromtimestamp(ts).strftime('%Y-%m-%d')
        except (ValueError, TypeError):
            return None
    
    def calculate_duration_days(self, start_date_str: Optional[str], end_date_str: Optional[str], is_active: bool = False) -> Optional[int]:
        """Calculate duration in days between start_date and end_date (or current date if active)"""
        if not start_date_str:
            return None
        
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            
            if is_active or not end_date_str:
                # If ad is active or no end date, calculate up to today
                end_date = date.today()
            else:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            
            duration = (end_date - start_date).days
            return max(duration, 1)  # Ensure minimum of 1 day
            
        except (ValueError, TypeError) as e:
            logger.warning(f"Error calculating duration: start={start_date_str}, end={end_date_str}, error={e}")
            return None
    
    def _generate_content_signature(self, ad_data: Dict) -> str:
        """
        Generate a content signature for an AdSet based on the perceptual hash of its representative ad's media.
        This creates a stable, visual identifier that persists across ingestion processes.
        
        Args:
            ad_data: Ad data object containing media information
            
        Returns:
            Content signature string (perceptual hash or fallback)
        """
        ad_id = ad_data.get("ad_archive_id", ad_data.get("id", "unknown"))
        self.logger.info(f"Generating perceptual hash content signature for ad {ad_id}")
        
        # Try to generate perceptual hash based on media
        perceptual_hash = self._calculate_perceptual_hash_for_ad(ad_data)
        if perceptual_hash:
            self.logger.info(f"Generated perceptual hash signature for ad {ad_id}: {perceptual_hash}")
            return perceptual_hash
            
        # Fallback: use ad_archive_id as signature if no media hash available
        fallback = str(ad_id)
        self.logger.warning(f"No perceptual hash available for ad {ad_id}, using ad ID as fallback: {fallback}")
        return fallback
    
    def _calculate_perceptual_hash_for_ad(self, ad_data: Dict) -> Optional[str]:
        """
        Calculate a perceptual hash for an ad's primary media.
        This creates a stable visual identifier for the ad set based on the representative ad.
        
        Args:
            ad_data: Ad data object containing media information
            
        Returns:
            Perceptual hash string or None if no media found
        """
        try:
            ad_id = ad_data.get("ad_archive_id", "unknown")
            self.logger.info(f"Calculating perceptual hash for ad {ad_id}")
            
            # Try to find primary media URL
            media_url = ad_data.get("media_url")
            if not media_url:
                # Fallback to main image URLs
                if main_images := ad_data.get("main_image_urls", []):
                    media_url = main_images[0]
                elif main_videos := ad_data.get("main_video_urls", []):
                    media_url = main_videos[0]
                else:
                    # Check creatives for media
                    if creatives := ad_data.get("creatives", []):
                        for creative in creatives:
                            if media_list := creative.get("media", []):
                                for media_item in media_list:
                                    if media_item.get("url"):
                                        media_url = media_item["url"]
                                        break
                                if media_url:
                                    break
            
            if not media_url:
                self.logger.warning(f"No media URL found for ad {ad_id}, cannot calculate perceptual hash")
                return None
            
            # Determine media type and calculate appropriate hash
            media_type = self.creative_comparison_service.get_media_type(media_url)
            
            if media_type == "image":
                # Use image hashing
                image_hash = self.creative_comparison_service._download_and_hash_image(media_url)
                if image_hash:
                    hash_str = str(image_hash)
                    self.logger.info(f"Generated image perceptual hash for ad {ad_id}: {hash_str}")
                    return hash_str
                    
            elif media_type == "video":
                # Use video hashing - take the first frame hash as representative
                video_hashes = self.creative_comparison_service._sample_video_hashes(media_url, samples=1)
                if video_hashes and len(video_hashes) > 0:
                    hash_str = str(video_hashes[0])
                    self.logger.info(f"Generated video perceptual hash for ad {ad_id}: {hash_str}")
                    return hash_str
            
            self.logger.warning(f"Could not generate perceptual hash for ad {ad_id}, media type: {media_type}")
            return None
            
        except Exception as e:
            self.logger.error(f"Error calculating perceptual hash for ad: {e}")
            return None
    
    def _update_ad_set_metadata(self, ad_set_id: int) -> None:
        """
        Update metadata for an AdSet including:
        - variant_count: Count of ads in the set
        - best_ad_id: ID of the ad with highest overall_score
        - content_signature: Perceptual hash of the best ad's media
        
        Args:
            ad_set_id: ID of the AdSet to update
        """
        try:
            # Get the AdSet
            ad_set = self.db.query(AdSet).filter(AdSet.id == ad_set_id).first()
            if not ad_set:
                self.logger.warning(f"AdSet not found for updating metadata: {ad_set_id}")
                return
            
            # Count variants (ads in this set)
            variant_count = self.db.query(Ad).filter(Ad.ad_set_id == ad_set_id).count()
            ad_set.variant_count = variant_count
            
            # Find best ad (currently using first ad in set as we don't have overall_score yet)
            # TODO: Update this logic when overall_score is implemented
            best_ad = self.db.query(Ad).filter(Ad.ad_set_id == ad_set_id).first()
            previous_best_ad_id = ad_set.best_ad_id
            
            if best_ad:
                ad_set.best_ad_id = best_ad.id
            
                # Update content_signature if best_ad changed or if it's not set
                if (previous_best_ad_id != best_ad.id or not ad_set.content_signature):
                    self.logger.info(f"Best ad changed or content_signature missing for AdSet {ad_set_id}, updating content_signature")
                    
                    # Convert the best ad back to dict format for hash calculation
                    try:
                        best_ad_data = best_ad.to_enhanced_format()
                        if best_ad_data:
                            new_signature = self._generate_content_signature(best_ad_data)
                            if new_signature:
                                ad_set.content_signature = new_signature
                                self.logger.info(f"Updated content_signature for AdSet {ad_set_id}: {new_signature}")
                            else:
                                self.logger.warning(f"Could not generate content_signature for AdSet {ad_set_id}")
                        else:
                            self.logger.warning(f"Could not convert best ad to dict format for AdSet {ad_set_id}")
                    except Exception as e:
                        self.logger.error(f"Error updating content_signature for AdSet {ad_set_id}: {e}")
            
            self.logger.info(f"Updated AdSet metadata: id={ad_set_id}, variants={variant_count}, best_ad_id={ad_set.best_ad_id}")
            
        except Exception as e:
            self.logger.error(f"Error updating AdSet metadata: {e}")
    
    def parse_dynamic_lead_form(self, extra_texts: List[Dict]) -> Dict:
        """
        Dynamically parses lead form questions and options from extra_texts.
        This is the key function from test_ad_extraction.py
        """
        if not extra_texts:
            return {}
        
        form_details = {"questions": {}, "standalone_fields": []}
        standalone_field_keywords = {"full name", "email", "phone number", "country"}
        current_question = None
        
        for item in extra_texts:
            text = (item.get("text") or "").strip()
            if not text:
                continue
            
            text_lower = text.lower()
            
            # Check if this is a standalone field
            if any(keyword in text_lower for keyword in standalone_field_keywords) and len(text.split()) < 4:
                form_details["standalone_fields"].append(text)
                current_question = None
                continue
            
            # Check if this is a question (ends with ':')
            if text.endswith(':'):
                current_question = text
                form_details["questions"][current_question] = []
            elif current_question and len(text.split()) < 6 and "\n" not in text:
                # This is likely an option for the current question
                form_details["questions"][current_question].append(text)
        
        # Clean up questions with no options
        form_details["questions"] = {q: opts for q, opts in form_details["questions"].items() if opts}
        
        # Remove duplicates from standalone fields and sort
        form_details["standalone_fields"] = sorted(list(set(form_details["standalone_fields"])))
        
        return form_details
    
    def build_detailed_creative_object(self, creative_data: Dict) -> Optional[Dict]:
        """
        Builds a highly detailed object for a single creative (card).
        This matches the logic from test_ad_extraction.py
        """
        if not isinstance(creative_data, dict):
            return None
        
        # Safely extract and strip text fields
        headline = (creative_data.get("title") or "").strip()
        
        # Handle body data more carefully with additional type checking
        body_data = creative_data.get("body")
        body = ""
        if body_data is None:
            body = ""
        elif isinstance(body_data, dict):
            body = (body_data.get("text") or "").strip()
        elif isinstance(body_data, str):
            body = body_data.strip()
        else:
            self.logger.warning(f"Unexpected body_data type: {type(body_data)}")
            body = str(body_data) if body_data is not None else ""
            
        caption = (creative_data.get("caption") or "").strip()

        # Transform media URLs into a list of media objects
        media_list = []
        if url := creative_data.get("video_hd_url"):
            media_list.append({"type": "Video", "url": url})
        if url := creative_data.get("video_sd_url"):
            media_list.append({"type": "Video", "url": url})
        if url := creative_data.get("original_image_url"):
            media_list.append({"type": "Image", "url": url})
        if url := creative_data.get("resized_image_url"):
            media_list.append({"type": "Image", "url": url})
        if url := creative_data.get("video_preview_image_url"):
             media_list.append({"type": "Image", "url": url})

        creative_object = {
            "headline": headline or None,
            "body": body or None,
            "cta": {
                "text": creative_data.get("cta_text"), 
                "type": creative_data.get("cta_type")
            },
            "media": media_list,
            "link": {
                "url": creative_data.get("link_url"), 
                "caption": caption or None
            }
        }
        
        # Clean up empty values in dictionaries
        for key in ["cta", "link"]:
            if isinstance(creative_object[key], dict):
                creative_object[key] = {k: v for k, v in creative_object[key].items() if v}
        
        return creative_object
    
    def extract_targeting_data(self, ad_data: Dict) -> Dict:
        """
        Extracts detailed targeting and reach data, filtering for countries with non-zero reach.
        This is the enhanced logic from test_ad_extraction.py
        """
        transparency_data = (ad_data.get("enrichment_response", {})
                            .get("data", {})
                            .get("ad_library_main", {})
                            .get("ad_details", {})
                            .get("transparency_by_location", {}))
        
        targeting_info = {
            "locations": [], 
            "age_range": None, 
            "gender": None, 
            "reach_breakdown": [], 
            "total_reach": None
        }
        
        # Check both UK and EU transparency data
        for region in ["uk_transparency", "eu_transparency"]:
            if region_data := transparency_data.get(region):
                targeting_info["locations"] = region_data.get("location_audience", [])
                targeting_info["age_range"] = region_data.get("age_audience")
                targeting_info["gender"] = region_data.get("gender_audience")
                targeting_info["total_reach"] = (region_data.get("total_reach") or 
                                               region_data.get("eu_total_reach"))
                
                # Smart Filtering Logic - only include countries with non-zero reach
                filtered_reach_breakdown = []
                for country_breakdown in region_data.get("age_country_gender_reach_breakdown", []):
                    total_country_reach = 0
                    for age_gender in country_breakdown.get("age_gender_breakdowns", []):
                        total_country_reach += age_gender.get("male") or 0
                        total_country_reach += age_gender.get("female") or 0
                        total_country_reach += age_gender.get("unknown") or 0
                    
                    if total_country_reach > 0:
                        filtered_reach_breakdown.append(country_breakdown)
                
                targeting_info["reach_breakdown"] = filtered_reach_breakdown
                break
        
        # Return only non-empty values
        return {k: v for k, v in targeting_info.items() if v}
    
    def build_clean_ad_object(self, ad_data: Dict) -> Optional[Dict]:
        """
        Transforms a single raw ad variation into a clean, structured object.
        This is the main transformation logic from test_ad_extraction.py
        """
        snapshot = ad_data.get("snapshot", {})
        if not snapshot:
            return None
        
        # Extract page information directly from ad_data and snapshot
        page_id = ad_data.get("page_id")
        page_name = ad_data.get("page_name") or snapshot.get("page_name")
        page_url = snapshot.get("page_profile_uri")
        
        ad_object = {
            "ad_archive_id": ad_data.get("ad_archive_id"),
            "meta": {
                "is_active": ad_data.get("is_active", False),
                "cta_type": snapshot.get("cta_type"),
                "display_format": snapshot.get("display_format"),
                "page_id": page_id,
                "page_name": page_name,
                "page_url": page_url
            },
            "targeting": self.extract_targeting_data(ad_data),
            "lead_form": self.parse_dynamic_lead_form(snapshot.get("extra_texts", [])),
            "creatives": []
        }
        
        # Process cards/creatives
        creatives_source = []
        if snapshot.get("cards"):
            creatives_source.extend(snapshot["cards"])
        
        if not creatives_source:
            if snapshot.get("videos"):
                creatives_source.extend(snapshot["videos"])
            if snapshot.get("images"):
                 creatives_source.extend(snapshot["images"])

        if not creatives_source and (snapshot.get('title') or snapshot.get('body')):
             creatives_source = [snapshot]

        for i, creative_data in enumerate(creatives_source):
            detailed_creative = self.build_detailed_creative_object(creative_data)
            if detailed_creative:
                detailed_creative['id'] = f"{ad_object['ad_archive_id']}-{i}"
                ad_object['creatives'].append(detailed_creative)
        
        return ad_object
    
    def _group_ads_into_sets(self, ads_data: List[Dict]) -> Dict[str, List[Dict]]:
        """
        Group similar ads into sets based on creative content comparison
        
        Args:
            ads_data: List of ads to group
            
        Returns:
            Dictionary mapping content_signature to list of ad data
        """
        self.logger.info(f"Starting ad grouping process for {len(ads_data)} ads")
        
        ad_groups = {}  # Signature -> list of ads with that signature
        
        # First pass: group identical ads (exact same content signature)
        for ad_data in ads_data:
            # Extract ad identifier
            ad_id = ad_data.get("ad_archive_id", ad_data.get("id", "unknown"))
            
            # Generate the content signature based on ad copy or media
            content_signature = self._generate_content_signature(ad_data)
            self.logger.info(f"Generated content signature for ad {ad_id}: {content_signature[:8]}...")
            
            if content_signature not in ad_groups:
                self.logger.info(f"Creating new ad group with signature {content_signature[:8]}...")
                ad_groups[content_signature] = []
                
            ad_groups[content_signature].append(ad_data)
            self.logger.info(f"Added ad {ad_id} to group {content_signature[:8]}...")
        
        self.logger.info(f"First-pass grouping complete: {len(ad_groups)} groups created")
        for sig, ads in ad_groups.items():
            self.logger.info(f"Group {sig[:8]}: {len(ads)} ads, first ad: {ads[0].get('ad_archive_id', ads[0].get('id', 'unknown'))}")
        
        # Second pass: try to merge groups with similar content
        # This uses our creative comparison service for more sophisticated matching
        signatures = list(ad_groups.keys())
        merged_signatures = set()
        
        self.logger.info(f"Starting second-pass group merging for {len(signatures)} groups")
        
        # For each group
        for i, sig1 in enumerate(signatures):
            if sig1 in merged_signatures:
                self.logger.debug(f"Skipping already merged group {sig1[:8]}...")
                continue
            
            group1_id = f"{sig1[:8]}({len(ad_groups[sig1])} ads)"
            self.logger.info(f"Processing group {i+1}/{len(signatures)}: {group1_id}")
                
            # Compare with every other group
            for j in range(i + 1, len(signatures)):
                sig2 = signatures[j]
                if sig2 in merged_signatures:
                    self.logger.debug(f"Skipping already merged group {sig2[:8]}...")
                    continue
                
                group2_id = f"{sig2[:8]}({len(ad_groups[sig2])} ads)"
                self.logger.info(f"Comparing group {group1_id} with group {group2_id}")
                
                # Check if representative ads from each group are similar
                if self._are_ad_groups_similar(ad_groups[sig1], ad_groups[sig2]):
                    # Merge groups
                    self.logger.info(f"Merging groups: {group1_id} + {group2_id}")
                    ad_groups[sig1].extend(ad_groups[sig2])
                    merged_signatures.add(sig2)
                    self.logger.info(f"Group {sig1[:8]} now has {len(ad_groups[sig1])} ads after merging")
                else:
                    self.logger.info(f"Groups {group1_id} and {group2_id} are not similar enough to merge")
        
        # Remove merged groups
        for sig in merged_signatures:
            self.logger.debug(f"Removing merged group {sig[:8]}...")
            ad_groups.pop(sig, None)
            
        # Log final grouping results
        self.logger.info(f"Ad grouping complete: {len(ads_data)} ads grouped into {len(ad_groups)} sets")
        for sig, ads in ad_groups.items():
            self.logger.info(f"Final group {sig[:8]}: {len(ads)} ads")
            if len(ads) > 1:
                ad_ids = [ad.get('ad_archive_id', ad.get('id', 'unknown')) for ad in ads[:5]]
                if len(ads) > 5:
                    ad_ids.append("...")
                self.logger.info(f"   Ads in group: {', '.join(ad_ids)}")
            
        return ad_groups
    
    def _are_ad_groups_similar(self, group1: List[Dict], group2: List[Dict]) -> bool:
        """
        Check if two ad groups are similar by comparing their representative ads
        
        Args:
            group1: First group of ads
            group2: Second group of ads
            
        Returns:
            True if the groups are similar enough to be merged
        """
        # Use the first ad from each group as representative
        ad1 = group1[0]
        ad2 = group2[0]
        
        # Log the representative ads being compared
        ad1_id = ad1.get("ad_archive_id", ad1.get("id", "unknown"))
        ad2_id = ad2.get("ad_archive_id", ad2.get("id", "unknown"))
        self.logger.info(f"Comparing representative ads: {ad1_id} vs {ad2_id}")
        
        # Extract basic ad details for logging
        ad1_type = ad1.get("media_type", "unknown")
        ad2_type = ad2.get("media_type", "unknown")
        self.logger.info(f"Ad types: {ad1_type} vs {ad2_type}")
        
        # Check if both ads have text
        ad1_text = ""
        ad2_text = ""
        if ad1.get("creatives") and ad1["creatives"] and "body" in ad1["creatives"][0]:
            ad1_text = ad1["creatives"][0]["body"]
        if ad2.get("creatives") and ad2["creatives"] and "body" in ad2["creatives"][0]:
            ad2_text = ad2["creatives"][0]["body"]
            
        if ad1_text and ad2_text:
            text_match = "identical" if ad1_text == ad2_text else "different"
            self.logger.info(f"Ad text is {text_match}")
            self.logger.debug(f"Ad1 text: {ad1_text[:100]}...")
            self.logger.debug(f"Ad2 text: {ad2_text[:100]}...")
            
        # Check media URLs
        ad1_urls = self._extract_media_urls(ad1)
        ad2_urls = self._extract_media_urls(ad2)
        
        if ad1_urls and ad2_urls:
            self.logger.info(f"Ad1 media URLs: {', '.join([url[:40]+'...' for url in ad1_urls[:2]])}")
            self.logger.info(f"Ad2 media URLs: {', '.join([url[:40]+'...' for url in ad2_urls[:2]])}")
            
            # Check for exact URL matches
            common_urls = set(ad1_urls).intersection(set(ad2_urls))
            if common_urls:
                self.logger.info(f"Found {len(common_urls)} identical media URLs between the ads")
            
        # Use creative comparison service to check similarity
        result = self.creative_comparison_service.should_group_ads(ad1, ad2)
        self.logger.info(f"Creative comparison service decision: ads should{'' if result else ' not'} be grouped")
        return result
        
    def _extract_media_urls(self, ad: Dict) -> List[str]:
        """Extract all media URLs from an ad for logging purposes"""
        urls = []
        
        # Check direct media URL
        if ad.get("media_url"):
            urls.append(ad["media_url"])
            
        # Check image URLs
        if ad.get("main_image_urls"):
            urls.extend(ad["main_image_urls"])
            
        # Check video URLs
        if ad.get("main_video_urls"):
            urls.extend(ad["main_video_urls"])
            
        # Check creative media
        if ad.get("creatives"):
            for creative in ad["creatives"]:
                if creative.get("media"):
                    for media in creative["media"]:
                        if media.get("url"):
                            urls.append(media["url"])
                            
        return urls
    
    def _create_new_ad_set(self, content_signature: str) -> Optional[AdSet]:
        """
        Creates a new AdSet with the given content_signature.
        
        Args:
            content_signature: The content signature for the new AdSet.
            
        Returns:
            The newly created AdSet object or None if creation failed.
        """
        try:
            new_ad_set = AdSet(
                content_signature=content_signature,
                variant_count=1,  # Initial count is 1 (this ad)
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            self.db.add(new_ad_set)
            self.db.flush()  # Get the ID without committing
            self.logger.info(f"Created new AdSet {new_ad_set.id} for content signature: {content_signature}")
            return new_ad_set
        except Exception as e:
            self.logger.error(f"Error creating new AdSet for content signature {content_signature}: {e}")
            return None

    def find_or_create_ad_set_for_ad(self, ad_data: Dict) -> Optional[AdSet]:
        """
        Finds or creates an AdSet for a new ad using a highly performant,
        index-driven candidate selection process based on perceptual hashes.
        """
        try:
            ad_id = ad_data.get("ad_archive_id", "unknown")
            self.logger.info(f"Finding AdSet for ad {ad_id} using visual index pre-filtering.")

            # 1. Calculate perceptual hash for the new ad
            new_hash = self._calculate_perceptual_hash_for_ad(ad_data)
            if not new_hash:
                self.logger.warning(f"Could not generate perceptual hash for ad {ad_id}. Creating new AdSet via fallback.")
                return self._create_new_ad_set(str(ad_id))

            # 2. Quick exact match: check if hash already exists
            exact_match = self.db.query(AdSet).filter(AdSet.content_signature == new_hash).first()
            if exact_match:
                self.logger.info(f"Exact content_signature match found – using existing AdSet {exact_match.id}.")
                return exact_match

            # 3. Use pg_trgm similarity to fetch top candidate AdSets
            candidate_query = text(
                """
                SELECT id FROM ad_sets
                WHERE similarity(content_signature, :hash) > 0.8
                ORDER BY similarity(content_signature, :hash) DESC
                LIMIT 20
                """
            )
            try:
                result = self.db.execute(candidate_query, {"hash": new_hash})
                candidate_ids = [row[0] for row in result]
            except Exception as e:
                self.logger.error(f"pg_trgm similarity query failed: {e}. Falling back to new AdSet.")
                return self._create_new_ad_set(new_hash)

            self.logger.info(f"{len(candidate_ids)} candidate AdSets retrieved for visual hash {new_hash}.")

            # 4. Compare with candidate AdSets' representative ads
            if candidate_ids:
                candidates = (
                    self.db.query(AdSet)
                    .options(joinedload(AdSet.best_ad))
                    .filter(AdSet.id.in_(candidate_ids))
                    .all()
                )
                for ad_set in candidates:
                    if not ad_set.best_ad:
                        continue
                    rep_ad_data = ad_set.best_ad.to_enhanced_format()
                    try:
                        if self.creative_comparison_service.should_group_ads(ad_data, rep_ad_data):
                            self.logger.info(f"Grouping ad {ad_id} with existing AdSet {ad_set.id} (hash match).")
                            return ad_set
                    except Exception as e:
                        self.logger.warning(f"Comparison failed between ad {ad_id} and AdSet {ad_set.id}: {e}")
                        continue

            # 5. No suitable candidate – create a new AdSet
            self.logger.info(f"No AdSet matched. Creating new AdSet for hash {new_hash}.")
            return self._create_new_ad_set(new_hash)
        except Exception as e:
            self.logger.error(f"Error in find_or_create_ad_set_for_ad: {e}")
            return None
    
    def _create_or_update_enhanced_ad(
        self,
        ad_data: Dict,
        competitor_id: int,
        campaign_name: str = None,
        platforms: List[str] = None,
        meta_data: Dict = None,
    ) -> Tuple[Optional[Ad], bool]:
        """
        Create or update an ad with enhanced extraction data.
        
        Args:
            ad_data: Ad data to create or update
            competitor_id: ID of the competitor
            campaign_name: Optional campaign name
            platforms: Optional list of platforms where the ad was found
            meta_data: Optional metadata for the ad
            
        Returns:
            Tuple of (Ad object, is_new flag)
        """
        try:
            ad_id = ad_data.get("ad_archive_id", None)
            if not ad_id:
                self.logger.error("Ad data missing ad_archive_id, cannot process")
                return None, False
                
            # Check if the ad already exists
            existing_ad = self.db.query(Ad).filter(Ad.ad_archive_id == ad_id).first()
            is_new = existing_ad is None
            
            # Enhanced data extraction
            enhanced_data = self._extract_enhanced_ad_data(ad_data)

            # Prepare meta dictionary, ensuring it's a plain dict we can mutate safely
            base_meta: Dict[str, Any] = cast(Dict[str, Any], ad_data.get("meta") or {})

            # Inject campaign name and platforms if provided
            if campaign_name:
                base_meta["campaign_name"] = campaign_name
            if platforms:
                base_meta["platforms"] = platforms
            
            if is_new:
                # Create a new ad
                
                # First, find or create the appropriate AdSet using direct comparison
                ad_set = self.find_or_create_ad_set_for_ad(ad_data)
                if not ad_set:
                    self.logger.error(f"Failed to find or create AdSet for ad {ad_id}")
                    return None, False
                
                # Create the new ad
                new_ad = Ad(
                    ad_archive_id=ad_id,
                    competitor_id=competitor_id,
                    ad_set_id=ad_set.id,
                    date_found=datetime.utcnow(),
                    meta=base_meta,
                    targeting=ad_data.get("targeting", {}),
                    lead_form=ad_data.get("lead_form", {}),
                    creatives=ad_data.get("creatives", []),
                    duration_days=enhanced_data.get("duration_days", 0)
                )
                
                # --- Maintain AdSet date range ---
                ad_found_date = new_ad.date_found.astimezone(timezone.utc)
                if ad_set.first_seen_date is None or ad_found_date < ad_set.first_seen_date:
                    ad_set.first_seen_date = ad_found_date
                if ad_set.last_seen_date is None or ad_found_date > ad_set.last_seen_date:
                    ad_set.last_seen_date = ad_found_date
                # ---------------------------------
                
                self.db.add(new_ad)
                self.db.flush()
                
                # Update the ad set's metadata
                if not ad_set.best_ad_id:
                    ad_set.best_ad_id = new_ad.id
                    
                ad_set.variant_count = ad_set.variant_count + 1
                ad_set.updated_at = datetime.utcnow()
                
                self.logger.info(f"Updated AdSet metadata: id={ad_set.id}, variants={ad_set.variant_count}")
                
                return new_ad, True
                
            else:
                # Update existing ad
                existing_ad.updated_at = datetime.utcnow()
                
                # Update duration_days if available in enhanced data
                if "duration_days" in enhanced_data:
                    existing_ad.duration_days = enhanced_data.get("duration_days")
                
                # Update meta data if provided
                if meta_data and existing_ad.meta:
                    existing_ad.meta.update(meta_data)
                
                # Safely update meta information (campaign name / platforms)
                try:
                    current_meta: Dict[str, Any] = cast(Dict[str, Any], existing_ad.meta or {})
                    if campaign_name:
                        current_meta["campaign_name"] = campaign_name
                    if platforms:
                        existing_platforms = set(current_meta.get("platforms", []))
                        existing_platforms.update(platforms)
                        current_meta["platforms"] = list(existing_platforms)
                    existing_ad.meta = current_meta
                except Exception as meta_err:
                    self.logger.error(f"Failed to update ad meta for {ad_id}: {meta_err}")
                
                # Update creatives if provided
                if ad_data.get("creatives"):
                    existing_ad.creatives = ad_data.get("creatives")
                
                self.db.flush()
                return existing_ad, False
                
        except Exception as e:
            self.logger.error(f"Error creating/updating enhanced ad: {e}")
            self.db.rollback()
            return None, False
    
    def process_raw_responses(self, raw_responses: List[Dict]) -> Tuple[Dict, Dict]:
        """
        Process raw JSON responses from Facebook Ads Library and save to database
        
        Args:
            raw_responses: List of raw JSON responses from Facebook Ads Library
            
        Returns:
            Tuple of (enhanced_data, stats)
        """
        self.logger.info(f"Processing {len(raw_responses)} raw responses with enhanced extraction")
        
        # Transform raw data to enhanced format
        enhanced_data = self.transform_raw_data_to_enhanced_format(raw_responses)
        
        # Save enhanced data to database
        stats = self.save_enhanced_ads_to_database(enhanced_data)
        
        return enhanced_data, stats 

    def transform_raw_data_to_enhanced_format(self, raw_responses: List[Dict]) -> Dict[str, List[Dict]]:
        """
        Transform raw JSON responses into enhanced format grouped by competitor
        
        Args:
            raw_responses: List of raw JSON responses from Facebook Ads Library
            
        Returns:
            Dictionary mapping competitor names to lists of enhanced ad data
        """
        enhanced_data = {}
        
        self.logger.info(f"Starting transform with {len(raw_responses)} responses, types: {[type(r).__name__ for r in raw_responses[:3]]}")
        
        for i, response in enumerate(raw_responses):
            try:
                self.logger.info(f"Processing response {i}: type={type(response).__name__}, preview={str(response)[:100]}")
                
                # Handle case where response might be a JSON string
                if isinstance(response, str):
                    self.logger.info(f"Response {i} is string, attempting JSON parse")
                    try:
                        response = json.loads(response)
                        self.logger.info(f"Successfully parsed JSON, new type: {type(response).__name__}")
                    except json.JSONDecodeError as e:
                        self.logger.error(f"Failed to parse JSON response {i}: {e}")
                        continue
                
                # Ensure response is a dictionary
                if not isinstance(response, dict):
                    self.logger.warning(f"Response {i} is not a dictionary after parsing: {type(response)}")
                    continue
                
                # Extract ads from response
                self.logger.info(f"Extracting data from response {i}")
                
                # Handle GraphQL response structure
                ads_data = []
                if "data" in response:
                    # Check for GraphQL structure: data.ad_library_main.search_results_connection.edges
                    if "ad_library_main" in response["data"]:
                        search_results = response["data"]["ad_library_main"].get("search_results_connection", {})
                        edges = search_results.get("edges", [])
                        self.logger.info(f"Found {len(edges)} edges in GraphQL response")
                        
                        for edge in edges:
                            if "node" in edge:
                                node_data = edge["node"]
                                # Check for collated_results or direct ad data
                                if "collated_results" in node_data:
                                    collated = node_data["collated_results"]
                                    if isinstance(collated, list):
                                        ads_data.extend(collated)
                                    else:
                                        ads_data.append(collated)
                                else:
                                    ads_data.append(node_data)
                    else:
                        # Fallback to direct data array
                        ads_data = response["data"] if isinstance(response["data"], list) else [response["data"]]
                else:
                    # Fallback for non-GraphQL responses
                    ads_data = response.get("data", [])
                
                if not ads_data:
                    self.logger.warning(f"No ads found in response {i}")
                    continue
                
                self.logger.info(f"Found {len(ads_data)} ads in response {i}")
                
                # Process each ad
                for j, ad_data in enumerate(ads_data):
                    self.logger.info(f"Processing ad {j} from response {i}")
                    self.logger.info(f"Ad {j} type: {type(ad_data).__name__}, content preview: {str(ad_data)[:200]}")
                    
                    # Ensure ad_data is a dictionary
                    if not isinstance(ad_data, dict):
                        self.logger.warning(f"Ad {j} is not a dictionary after parsing: {type(ad_data)}")
                        continue
                    
                    # Build clean ad object
                    clean_ad = self.build_clean_ad_object(ad_data)
                    if not clean_ad:
                        self.logger.warning(f"Failed to build clean ad object for ad {j}")
                        continue
                    
                    # Extract competitor info
                    page_name = clean_ad.get("meta", {}).get("page_name", "Unknown")
                    self.logger.info(f"Ad {j} belongs to competitor: {page_name}")
                    
                    # Group by competitor
                    if page_name not in enhanced_data:
                        enhanced_data[page_name] = []
                    
                    enhanced_data[page_name].append(clean_ad)
                    
            except Exception as e:
                self.logger.error(f"Error processing raw response {i}: {e}", exc_info=True)
                continue
                
        self.logger.info(f"Transformed {len(raw_responses)} responses into {len(enhanced_data)} competitor groups")
        return enhanced_data

    def save_enhanced_ads_to_database(self, enhanced_data: Dict[str, List[Dict]]) -> Dict[str, int]:
        """
        Save enhanced ad data to database
        
        Args:
            enhanced_data: Dictionary mapping competitor names to ad data lists
            
        Returns:
            Dictionary with processing statistics
        """
        stats = {
            "total_ads_processed": 0,
            "new_ads_created": 0,
            "existing_ads_updated": 0,
            "errors": 0,
            "competitors_processed": 0
        }
        
        try:
            for competitor_name, ads_list in enhanced_data.items():
                try:
                    stats["competitors_processed"] += 1
                    
                    # Find or create competitor
                    competitor = self.db.query(Competitor).filter(
                        Competitor.name == competitor_name
                    ).first()
                    
                    if not competitor:
                        # Extract page_id from first ad if available
                        page_id = None
                        if ads_list and ads_list[0].get("meta", {}).get("page_id"):
                            page_id = ads_list[0]["meta"]["page_id"]
                        
                        competitor = Competitor(
                            name=competitor_name,
                            page_id=page_id,
                            created_at=datetime.utcnow()
                        )
                        self.db.add(competitor)
                        self.db.flush()
                        self.logger.info(f"Created new competitor: {competitor_name}")
                    
                    # Process each ad for this competitor
                    for ad_data in ads_list:
                        try:
                            stats["total_ads_processed"] += 1
                            
                            # Create or update the ad
                            ad_obj, is_new = self._create_or_update_enhanced_ad(
                                ad_data, 
                                competitor.id
                            )
                            
                            if ad_obj:
                                if is_new:
                                    stats["new_ads_created"] += 1
                                else:
                                    stats["existing_ads_updated"] += 1
                            else:
                                stats["errors"] += 1
                                
                        except Exception as e:
                            self.logger.error(f"Error processing ad {ad_data.get('ad_archive_id', 'unknown')}: {e}")
                            stats["errors"] += 1
                            continue
                            
                except Exception as e:
                    self.logger.error(f"Error processing competitor {competitor_name}: {e}")
                    stats["errors"] += 1
                    continue
            
            # Commit all changes
            self.db.commit()
            self.logger.info(f"Database save completed: {stats}")
            
        except Exception as e:
            self.logger.error(f"Error saving to database: {e}")
            self.db.rollback()
            stats["errors"] += 1
            
        return stats

    def _extract_enhanced_ad_data(self, ad_data: Dict) -> Dict:
        """
        Extract enhanced ad data from ad_data into a format suitable for storage.
        
        Args:
            ad_data: Raw ad data to extract enhanced data from
            
        Returns:
            Dictionary with enhanced ad data
        """
        try:
            enhanced_data = {}
            
            # Extract basic metadata
            meta = ad_data.get("meta", {})
            enhanced_data["advertiser_name"] = meta.get("page_name", "")
            enhanced_data["advertiser_id"] = meta.get("page_id", "")
            enhanced_data["start_date"] = meta.get("start_date", "")
            enhanced_data["end_date"] = meta.get("end_date", None)
            enhanced_data["is_active"] = meta.get("is_active", False)
            
            # Extract primary texts
            primary_text = ""
            title = ""
            link_description = ""
            cta = ""
            
            # Extract creatives data
            creatives = ad_data.get("creatives", [])
            if creatives and len(creatives) > 0:
                # Use first creative as primary
                primary_creative = creatives[0]
                primary_text = primary_creative.get("body", "")
                title = primary_creative.get("title", "")
                link_description = primary_creative.get("description", "")
                cta = primary_creative.get("call_to_action", "")
            
            enhanced_data["primary_text"] = primary_text
            enhanced_data["title"] = title
            enhanced_data["link_description"] = link_description
            enhanced_data["cta"] = cta
            
            # Extract media URLs
            enhanced_data["image_urls"] = ad_data.get("main_image_urls", [])
            enhanced_data["video_urls"] = ad_data.get("main_video_urls", [])
            enhanced_data["primary_media_url"] = ad_data.get("media_url", "")
            
            # Extract other useful data
            enhanced_data["targeting"] = ad_data.get("targeting", {})
            enhanced_data["lead_form"] = ad_data.get("lead_form", {})
            enhanced_data["media_type"] = ad_data.get("media_type", "unknown")
            
            # Calculate duration in days if dates are available
            if enhanced_data["start_date"]:
                enhanced_data["duration_days"] = self.calculate_duration_days(
                    enhanced_data["start_date"], 
                    enhanced_data["end_date"],
                    enhanced_data["is_active"]
                )
            
            return enhanced_data
            
        except Exception as e:
            self.logger.error(f"Error extracting enhanced ad data: {e}")
            return {}

