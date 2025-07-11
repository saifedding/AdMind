import json
import hashlib
from datetime import datetime, date
from typing import Dict, List, Optional, Any, Tuple
import logging
from sqlalchemy.orm import Session
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
        Generate a content signature for an ad based on its content
        This is used to group identical ads together quickly
        
        Args:
            ad_data: Ad data object
            
        Returns:
            Content signature string
        """
        ad_id = ad_data.get("ad_archive_id", ad_data.get("id", "unknown"))
        self.logger.info(f"Generating content signature for ad {ad_id}")
        
        signature_components = []
        
        # Add media URL if available
        if media_url := ad_data.get("media_url"):
            signature_components.append(f"media:{media_url}")
            self.logger.info(f"Using primary media URL for signature: {media_url[:50]}...")
            
        # Add text content from creatives
        if creatives := ad_data.get("creatives"):
            for i, creative in enumerate(creatives):
                if body := creative.get("body"):
                    # Normalize text by removing spaces, lowercasing
                    normalized_body = body.lower().strip()
                    signature_components.append(f"text:{normalized_body[:100]}")
                    self.logger.info(f"Added creative {i} text to signature: {normalized_body[:50]}...")
                    
                # Add media URLs from creatives
                if media := creative.get("media"):
                    for j, media_item in enumerate(media):
                        if media_url := media_item.get("url"):
                            signature_components.append(f"creative_media:{media_url}")
                            self.logger.info(f"Added creative {i} media {j} URL to signature: {media_url[:50]}...")
        
        # Also include image and video URLs if available
        if image_urls := ad_data.get("main_image_urls", []):
            for i, url in enumerate(image_urls):
                signature_components.append(f"image:{url}")
                self.logger.info(f"Added image URL {i} to signature: {url[:50]}...")
                
        if video_urls := ad_data.get("main_video_urls", []):
            for i, url in enumerate(video_urls):
                signature_components.append(f"video:{url}")
                self.logger.info(f"Added video URL {i} to signature: {url[:50]}...")
        
        if not signature_components:
            # Fallback: use ad_archive_id as signature
            fallback = str(ad_id)
            self.logger.warning(f"No content found for signature, using ad ID as fallback: {fallback}")
            return fallback
            
        # Generate a hash of all components
        signature_text = "|".join(signature_components)
        import hashlib
        signature = hashlib.md5(signature_text.encode()).hexdigest()
        
        self.logger.info(f"Generated signature {signature} for ad {ad_id} from {len(signature_components)} components")
        return signature
    
    def _update_ad_set_metadata(self, ad_set_id: int) -> None:
        """
        Update metadata for an AdSet including:
        - variant_count: Count of ads in the set
        - best_ad_id: ID of the ad with highest overall_score
        
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
            if best_ad:
                ad_set.best_ad_id = best_ad.id
            
            self.logger.info(f"Updated AdSet metadata: id={ad_set_id}, variants={variant_count}")
            
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
    
    def find_or_create_ad_set_for_ad(self, ad_data: Dict) -> Optional[AdSet]:
        """
        Find an existing AdSet for an ad by comparing against representative ads,
        or create a new AdSet if no match is found.
        
        This replaces the signature-based grouping with direct visual comparison
        against existing AdSets.
        
        Args:
            ad_data: Ad data to find a matching AdSet for
            
        Returns:
            AdSet object or None if creation failed
        """
        try:
            ad_id = ad_data.get("ad_archive_id", "unknown")
            self.logger.info(f"Finding AdSet for ad {ad_id} using direct comparison")
            
            # Fetch all existing AdSets with their best_ad
            ad_sets = self.db.query(AdSet).all()
            self.logger.info(f"Found {len(ad_sets)} existing AdSets to compare against")
            
            # Track best match for debugging
            best_match = None
            best_match_id = None
            
            # For each AdSet, check if the ad should be grouped with its representative
            for ad_set in ad_sets:
                # Skip AdSets without a best_ad
                if not ad_set.best_ad_id:
                    continue
                    
                # Get the representative ad for this AdSet
                representative_ad = self.db.query(Ad).filter(Ad.id == ad_set.best_ad_id).first()
                if not representative_ad:
                    self.logger.warning(f"AdSet {ad_set.id} has best_ad_id {ad_set.best_ad_id} but ad not found")
                    continue
                    
                # Convert representative ad to dict format for comparison with necessary fields
                try:
                    # Start with the basic enhanced format
                    representative_ad_data = representative_ad.to_enhanced_format()
                    
                    # Add required fields for comparison that might be missing
                    representative_ad_data["ad_archive_id"] = representative_ad.ad_archive_id
                    
                    # Try to determine media type
                    media_type = "unknown"
                    if representative_ad.creatives and len(representative_ad.creatives) > 0:
                        for creative in representative_ad.creatives:
                            if creative.get("media"):
                                for media in creative.get("media", []):
                                    if media.get("type") == "image":
                                        media_type = "image"
                                        break
                                    elif media.get("type") == "video":
                                        media_type = "video"
                                        break
                    
                    representative_ad_data["media_type"] = media_type
                    
                    # Ensure creatives have the required structure
                    if "creatives" not in representative_ad_data or not representative_ad_data["creatives"]:
                        representative_ad_data["creatives"] = []
                    
                    # Ensure we have at least one creative with proper structure for comparison
                    if not representative_ad_data["creatives"]:
                        # Create a minimal creative if none exists
                        representative_ad_data["creatives"] = [{
                            "id": f"{representative_ad.ad_archive_id}-0",
                            "body": "",
                            "title": "",
                            "media": []
                        }]
                    else:
                        # Ensure each creative has the minimal required fields
                        for i, creative in enumerate(representative_ad_data["creatives"]):
                            if "id" not in creative:
                                creative["id"] = f"{representative_ad.ad_archive_id}-{i}"
                            if "body" not in creative:
                                creative["body"] = ""
                            if "title" not in creative:
                                creative["title"] = ""
                            if "media" not in creative:
                                creative["media"] = []
                    
                    rep_ad_id = representative_ad.ad_archive_id
                    self.logger.info(f"Comparing ad {ad_id} with representative ad {rep_ad_id} of AdSet {ad_set.id}")
                    
                    # Use the creative comparison service to compare the ads
                    should_group = self.creative_comparison_service.should_group_ads(
                        ad_data, representative_ad_data
                    )
                    
                    if should_group:
                        self.logger.info(f"Match found! Grouping ad {ad_id} with AdSet {ad_set.id}")
                        best_match = ad_set
                        best_match_id = rep_ad_id
                        break
                except Exception as e:
                    self.logger.warning(f"Error comparing ad {ad_id} with representative ad {representative_ad.ad_archive_id}: {e}")
                    continue
            
            # If we found a match, return it
            if best_match:
                self.logger.info(f"Ad {ad_id} matched with AdSet {best_match.id} (rep ad: {best_match_id})")
                return best_match
                
            # If no match found, create a new AdSet
            self.logger.info(f"No matching AdSet found for ad {ad_id}, creating new AdSet")
            
            # Generate a content signature for reference (not for matching)
            content_signature = self._generate_content_signature(ad_data)
            
            # Create new ad set
            new_ad_set = AdSet(
                content_signature=content_signature,
                variant_count=1,  # Initial count is 1 (this ad)
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            self.db.add(new_ad_set)
            self.db.flush()  # Get the ID without committing
            
            self.logger.info(f"Created new AdSet {new_ad_set.id} for ad {ad_id}")
            return new_ad_set
            
        except Exception as e:
            self.logger.error(f"Error finding/creating ad set via direct comparison: {e}")
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
                    meta=ad_data.get("meta", {}),
                    targeting=ad_data.get("targeting", {}),
                    lead_form=ad_data.get("lead_form", {}),
                    creatives=ad_data.get("creatives", []),
                    duration_days=enhanced_data.get("duration_days", 0)
                )
                
                # Store campaign name in meta if provided
                if campaign_name and new_ad.meta:
                    new_ad.meta["campaign_name"] = campaign_name
                
                # Store platforms in meta if provided
                if platforms and new_ad.meta:
                    new_ad.meta["platforms"] = platforms
                
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
                
                # Update campaign name in meta if provided
                if campaign_name and existing_ad.meta:
                    existing_ad.meta["campaign_name"] = campaign_name
                
                # Update platforms in meta if provided
                if platforms and existing_ad.meta:
                    existing_platforms = set(existing_ad.meta.get("platforms", []))
                    for platform in platforms:
                        existing_platforms.add(platform)
                    existing_ad.meta["platforms"] = list(existing_platforms)
                
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

    def calculate_duration_days(self, start_date_str: str, end_date_str: Optional[str], is_active: bool) -> int:
        """
        Calculate the duration of an ad in days.
        
        Args:
            start_date_str: Start date string
            end_date_str: End date string, or None if not ended
            is_active: Whether the ad is still active
            
        Returns:
            Number of days the ad has been or was running
        """
        try:
            # Parse start date
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date() if start_date_str else None
            if not start_date:
                return 0
                
            # Parse end date or use current date if ad is active
            if end_date_str:
                end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
            elif is_active:
                # If ad is active and no end date, use current date
                end_date = datetime.now().date()
            else:
                # If ad is not active and no end date, assume it ran for 1 day
                return 1
                
            # Calculate difference in days
            duration = (end_date - start_date).days
            return max(1, duration)  # Ensure at least 1 day
            
        except Exception as e:
            self.logger.error(f"Error calculating duration days: {e}")
            return 0 