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
        Generate a content signature for ad grouping using conditional logic:
        - If ad copy is longer than 10 words, use the copy as the signature base
        - Otherwise, use the media URLs as the signature base (prioritizing media)
        
        Args:
            ad_data: The ad data dictionary containing creatives
            
        Returns:
            A SHA256 hash string representing the content signature
        """
        # Default to empty signature in case of errors
        signature_base = ""
        
        try:
            # Extract primary ad copy from creatives
            ad_copy = ""
            if creatives := ad_data.get("creatives", []):
                for creative in creatives:
                    if body := creative.get("body"):
                        if body and isinstance(body, str) and len(body.strip()) > 0:
                            ad_copy = body.strip()
                            break
            
            # Normalize ad copy (lowercase and strip)
            normalized_copy = ad_copy.lower().strip() if ad_copy else ""
            
            # Calculate word count (split by whitespace)
            word_count = len(normalized_copy.split()) if normalized_copy else 0
            
            self.logger.debug(f"Ad copy word count: {word_count}")
            
            # Apply conditional logic
            if word_count > 10:
                # Long-form content: Use ad copy as signature
                self.logger.debug(f"Using ad copy as signature base (words: {word_count})")
                signature_base = normalized_copy
            else:
                # Short content: Use media URLs as signature
                media_urls = []
                for creative in ad_data.get("creatives", []):
                    for media_item in creative.get("media", []):
                        if url := media_item.get("url"):
                            # Clean URL by removing query parameters
                            base_url = url.split('?')[0] if '?' in url else url
                            media_urls.append(base_url)
                
                # Remove duplicates and sort
                unique_media_urls = sorted(set(media_urls))
                
                # Join URLs into a single string
                signature_base = ",".join(unique_media_urls)
                self.logger.debug(f"Using media URLs as signature base (count: {len(unique_media_urls)})")
            
            # Generate SHA256 hash
            if not signature_base:
                # Fallback to ad_archive_id if no content for signature
                signature_base = str(ad_data.get("ad_archive_id", "unknown"))
                self.logger.warning(f"No content for signature, using ad_archive_id: {signature_base}")
            
            # Generate SHA256 hash from signature base
            signature = hashlib.sha256(signature_base.encode('utf-8')).hexdigest()
            return signature
            
        except Exception as e:
            self.logger.error(f"Error generating content signature: {e}")
            # Fallback to ad_archive_id on error
            fallback = str(ad_data.get("ad_archive_id", "error"))
            return hashlib.sha256(fallback.encode('utf-8')).hexdigest()
    
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
        ad_groups = {}  # Signature -> list of ads with that signature
        
        # First pass: group identical ads (exact same content signature)
        for ad_data in ads_data:
            # Generate the content signature based on ad copy or media
            content_signature = self._generate_content_signature(ad_data)
            
            if content_signature not in ad_groups:
                ad_groups[content_signature] = []
                
            ad_groups[content_signature].append(ad_data)
        
        # Second pass: try to merge groups with similar content
        # This uses our creative comparison service for more sophisticated matching
        signatures = list(ad_groups.keys())
        merged_signatures = set()  # Signatures that have been merged into other groups
        
        # For each group
        for i, sig1 in enumerate(signatures):
            if sig1 in merged_signatures:
                continue
                
            # Compare with every other group
            for j in range(i + 1, len(signatures)):
                sig2 = signatures[j]
                if sig2 in merged_signatures:
                    continue
                
                # Check if representative ads from each group are similar
                if self._are_ad_groups_similar(ad_groups[sig1], ad_groups[sig2]):
                    # Merge groups
                    ad_groups[sig1].extend(ad_groups[sig2])
                    merged_signatures.add(sig2)
                    self.logger.info(f"Merged ad groups with signatures: {sig1[:8]} and {sig2[:8]}")
        
        # Remove merged groups
        for sig in merged_signatures:
            ad_groups.pop(sig, None)
            
        # Log grouping results
        self.logger.info(f"Grouped {len(ads_data)} ads into {len(ad_groups)} sets")
        for sig, ads in ad_groups.items():
            self.logger.debug(f"  Group {sig[:8]}: {len(ads)} ads")
            
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
        
        # Use creative comparison service to check similarity
        return self.creative_comparison_service.should_group_ads(ad1, ad2)
    
    def _find_or_create_ad_set(self, content_signature: str) -> Optional[AdSet]:
        """
        Find or create an AdSet with the given content signature
        
        Args:
            content_signature: Unique content signature for the ad set
            
        Returns:
            AdSet object or None if creation failed
        """
        try:
            # Try to find existing ad set
            ad_set = self.db.query(AdSet).filter(AdSet.content_signature == content_signature).first()
            
            if ad_set:
                return ad_set
                
            # Create new ad set
            ad_set = AdSet(
                content_signature=content_signature,
                variant_count=0  # Will be updated later
            )
            self.db.add(ad_set)
            self.db.flush()  # Get the ID without committing
            
            return ad_set
            
        except Exception as e:
            self.logger.error(f"Error finding/creating ad set: {e}")
            return None

    def transform_raw_data_to_enhanced_format(self, file_data_list: List[Dict]) -> Dict:
        """
        Transform raw data from Facebook Ads Library to the enhanced format
        
        Args:
            file_data_list: List of raw response data from Facebook Ads Library API
            
        Returns:
            Enhanced data structure matching frontend_payload_final.json format
        """
        try:
            # Base structure
            result = {
                "advertiser_info": {},
                "campaigns": []
            }
            
            if not file_data_list:
                self.logger.warning("Empty file_data_list provided to transform_raw_data_to_enhanced_format")
                return result
                
            # Extract all ads from all responses
            all_ads = []
            
            for file_data in file_data_list:
                try:
                    # Check if this is a valid response with ad_library_main
                    if not isinstance(file_data, dict):
                        self.logger.warning(f"Invalid file_data type: {type(file_data)}")
                        continue
                        
                    if "data" not in file_data or "ad_library_main" not in file_data["data"]:
                        self.logger.warning("Invalid response data structure")
                        continue
                        
                    # Extract edges from response
                    edges = file_data["data"]["ad_library_main"].get("search_results_connection", {}).get("edges", [])
                    
                    for edge in edges:
                        if "node" not in edge:
                            continue
                            
                        # Extract collated results (individual ads)
                        collated_results = edge["node"].get("collated_results", [])
                        
                        for ad_data in collated_results:
                            try:
                                # Build clean ad object
                                clean_ad = self.build_clean_ad_object(ad_data)
                                if clean_ad:
                                    all_ads.append(clean_ad)
                            except Exception as e:
                                self.logger.error(f"Error processing individual ad: {e}")
                                continue
                except Exception as e:
                    self.logger.error(f"Error processing file_data: {e}")
                    continue
            
            # Group ads by campaign
            campaigns_by_id = {}
            
            for ad_data in all_ads:
                try:
                    # Extract campaign info
                    meta = ad_data.get("meta", {})
                    campaign_id = meta.get("campaign_id", "unknown")
                    campaign_name = meta.get("campaign_name", "Unknown Campaign")
                    
                    if campaign_id not in campaigns_by_id:
                        campaigns_by_id[campaign_id] = {
                            "id": campaign_id,
                            "name": campaign_name,
                            "ads": []
                        }
                        
                    # Add ad to campaign
                    campaigns_by_id[campaign_id]["ads"].append(ad_data)
                    
                    # Extract advertiser info from first ad
                    if not result["advertiser_info"] and ad_data.get("meta"):
                        result["advertiser_info"] = {
                            "id": meta.get("page_id"),
                            "name": meta.get("page_name"),
                            "url": meta.get("page_url")
                        }
                except Exception as e:
                    self.logger.error(f"Error grouping ad by campaign: {e}")
                    continue
            
            # For each campaign, group ads into sets based on similarity
            for campaign_id, campaign in campaigns_by_id.items():
                try:
                    # Group ads by similarity
                    ad_groups = self._group_ads_into_sets(campaign["ads"])
                    
                    # Replace campaign's ads with grouped ads
                    # We'll keep all ads but organize them by set for the database
                    campaign["ad_groups"] = ad_groups
                except Exception as e:
                    self.logger.error(f"Error grouping ads for campaign {campaign_id}: {e}")
                    campaign["ad_groups"] = campaign["ads"]  # Fallback to original ads
                
            # Add campaigns to result
            result["campaigns"] = list(campaigns_by_id.values())
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error transforming raw data: {e}")
            return {"advertiser_info": {}, "campaigns": []}

    def save_enhanced_ads_to_database(self, enhanced_data: Dict) -> Dict:
        """
        Save the enhanced ad data to the database
        
        Args:
            enhanced_data: Enhanced ad data structure
            
        Returns:
            Dictionary with statistics about the operation
        """
        stats = {
            'total_processed': 0,
            'created': 0,
            'updated': 0,
            'errors': 0,
            'competitors_created': 0,
            'competitors_updated': 0,
            'campaigns_processed': 0
        }
        
        try:
            advertiser_info = enhanced_data.get("advertiser_info", {})
            campaigns = enhanced_data.get("campaigns", [])
            
            # Process each campaign
            for campaign in campaigns:
                stats['campaigns_processed'] += 1
                campaign_id = campaign.get("id") # Changed from campaign_id to id
                platforms = campaign.get("platforms", []) # This will be removed by the new _group_ads_into_sets
                
                # Process each ad in the campaign
                for ad_data in campaign.get("ads", []): # Changed from campaign.get("ads", []) to campaign.get("ad_groups", [])
                    try:
                        stats['total_processed'] += 1
                        
                        # Find or create competitor
                        competitor = self._find_or_create_competitor_from_advertiser(advertiser_info)
                        if competitor:
                            if hasattr(competitor, '_is_new'):
                                stats['competitors_created'] += 1
                            else:
                                stats['competitors_updated'] += 1
                            
                            # Create or update ad with enhanced data
                            ad, is_new = self._create_or_update_enhanced_ad(
                                ad_data, competitor.id, campaign_id, platforms, advertiser_info
                            )
                            
                            if is_new:
                                stats['created'] += 1
                            else:
                                stats['updated'] += 1
                        else:
                            stats['errors'] += 1
                            logger.error(f"Cannot save ad {ad_data.get('ad_archive_id', 'unknown')} - competitor not found/created")
                            
                    except Exception as e:
                        stats['errors'] += 1
                        logger.error(f"Error saving enhanced ad {ad_data.get('ad_archive_id', 'unknown')}: {e}")
            
            # Commit all changes
            self.db.commit()
            logger.info(f"Successfully saved enhanced ads data. Stats: {stats}")
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to commit enhanced database changes: {e}")
            stats['errors'] = stats['total_processed']
            stats['created'] = 0
            stats['updated'] = 0
        
        return stats
    
    def _find_or_create_competitor_from_advertiser(self, advertiser_info: Dict) -> Optional[Competitor]:
        """
        Find existing competitor from advertiser info or create a new one if needed
        
        Args:
            advertiser_info: Dictionary with advertiser information
            
        Returns:
            Competitor instance or None if creation failed
        """
        page_id = advertiser_info.get('id') 
        page_name = advertiser_info.get('name')
        page_url = advertiser_info.get('url')
        
        # If we don't have either a page_id or page_name, we can't proceed
        if not (page_id or page_name):
            logger.warning("Missing both page_id and page_name in advertiser info")
            return None
        
        try:
            # Try to find existing competitor by page_id if available
            existing_competitor = None
            if page_id:
                existing_competitor = self.db.query(Competitor).filter_by(page_id=page_id).first()
            
            # If not found by page_id but we have a name, try finding by name (fuzzy match)
            if not existing_competitor and page_name:
                existing_competitor = self.db.query(Competitor).filter(
                    Competitor.name.ilike(f"%{page_name}%")
                ).first()
            
            if existing_competitor:
                # Update competitor info
                if page_name:
                    existing_competitor.name = page_name
                if page_url:
                    existing_competitor.page_url = page_url
                if page_id and not existing_competitor.page_id:
                    existing_competitor.page_id = page_id
                existing_competitor.updated_at = datetime.utcnow()
                return existing_competitor
            
            # Create new competitor if allowed
            if page_name:  # At minimum we need a name
                new_competitor = Competitor(
                    name=page_name,
                    page_id=page_id,
                    page_url=page_url,
                    is_active=True,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                # Mark as new for stats tracking
                setattr(new_competitor, '_is_new', True)
                self.db.add(new_competitor)
                self.db.flush()  # Get the ID without committing
                logger.info(f"Created new competitor: {page_name} (ID: {new_competitor.id})")
                return new_competitor
                
            logger.warning(f"Insufficient data to create competitor: page_id={page_id}, page_name={page_name}")
            return None
            
        except Exception as e:
            logger.error(f"Error finding/creating competitor: {e}")
            return None
    
    def _create_or_update_enhanced_ad(self, ad_data: Dict, competitor_id: int, 
                                   campaign_id: str, platforms: List[str], 
                                   advertiser_info: Dict) -> Tuple[Optional[Ad], bool]:
        """
        Create or update an ad in the database with enhanced data
        
        Args:
            ad_data: Enhanced ad data
            competitor_id: ID of the competitor
            campaign_id: Campaign ID
            platforms: List of platforms the ad is running on
            advertiser_info: Advertiser information
            
        Returns:
            Tuple of (Ad object or None, is_new)
        """
        try:
            # Extract ad archive ID
            ad_archive_id = ad_data.get("ad_archive_id", "")
            
            if not ad_archive_id:
                self.logger.error("Missing ad_archive_id, cannot save ad")
                return None, False
            
            # Check if ad already exists
            ad = self.db.query(Ad).filter(Ad.ad_archive_id == ad_archive_id).first()
            is_new = False
            
            if not ad:
                # Create new ad
                ad = Ad(
                    ad_archive_id=ad_archive_id,
                    competitor_id=competitor_id,
                    date_found=datetime.now()
                )
                self.db.add(ad)
                is_new = True
            
            # Get ad_set_id from signature (may be None if we can't generate a signature)
            content_signature = self._generate_content_signature(ad_data)
            ad_set = None
            if content_signature:
                ad_set = self._find_or_create_ad_set(content_signature)
            
            # Link ad to ad set if available
            if ad_set:
                ad.ad_set_id = ad_set.id
            
            # Update ad with enhanced data
            ad.meta = ad_data.get("meta", {})
            ad.targeting = ad_data.get("targeting", {})
            ad.lead_form = ad_data.get("lead_form", {})
            ad.creatives = ad_data.get("creatives", [])
            
            # Update raw_data if not already set
            if not ad.raw_data:
                ad.raw_data = ad_data.get("raw_data")
            
            # Set duration_days if available in metadata
            meta = ad_data.get("meta", {})
            if "start_date" in meta:
                is_active = meta.get("is_active", False) # Assuming is_active is in meta
                ad.duration_days = self.calculate_duration_days(
                    meta.get("start_date"), 
                    meta.get("end_date"),
                    is_active
                )
            
            # Flush to get the ad ID
            self.db.flush()
            
            # If we have an ad set, update its metadata
            if ad_set:
                self._update_ad_set_metadata(ad_set.id)
            
            return ad, is_new
            
        except Exception as e:
            self.logger.error(f"Error creating/updating enhanced ad: {e}")
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