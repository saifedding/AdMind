import json
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models import Ad, Competitor
from app.database import get_db

logger = logging.getLogger(__name__)


class EnhancedAdExtractionService:
    """Service for enhanced ad data extraction matching frontend_payload_final.json format"""
    
    EXTRACTION_VERSION = "1.0.0"
    
    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger(__name__)
    
    def convert_timestamp_to_date(self, ts: Any) -> Optional[str]:
        """Converts a UNIX timestamp to a 'YYYY-MM-DD' formatted string."""
        if not ts: 
            return None
        try:
            return datetime.fromtimestamp(ts).strftime('%Y-%m-%d')
        except (ValueError, TypeError):
            return None
    
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
        body_data = creative_data.get("body")
        body = (body_data.get("text") or "").strip() if isinstance(body_data, dict) else (body_data or "").strip()
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
        
        ad_object = {
            "ad_archive_id": ad_data.get("ad_archive_id"),
            "meta": {
                "is_active": ad_data.get("is_active", False),
                "cta_type": snapshot.get("cta_type"),
                "display_format": snapshot.get("display_format"),
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
    
    def transform_raw_data_to_enhanced_format(self, file_data_list: List[Dict]) -> Dict:
        """
        Main function to process raw JSON responses and transform them into
        clean, frontend-ready payload matching frontend_payload_final.json
        """
        campaigns = {}
        advertiser_info = {}
        
        for data in file_data_list:
            edges = (data.get("data", {})
                    .get("ad_library_main", {})
                    .get("search_results_connection", {})
                    .get("edges", []))
            
            if not edges:
                continue
            
            # Extract advertiser info from first ad if not already set
            if not advertiser_info:
                try:
                    first_ad = edges[0]['node']['collated_results'][0]
                    advertiser_info = {
                        "page_id": first_ad.get("page_id"),
                        "page_name": first_ad.get("page_name"),
                        "page_url": first_ad.get("snapshot", {}).get("page_profile_uri"),
                        "page_likes": first_ad.get("snapshot", {}).get("page_like_count"),
                        "page_profile_picture": first_ad.get("snapshot", {}).get("page_profile_picture_url"),
                    }
                except (IndexError, KeyError) as e:
                    logger.warning(f"Could not extract advertiser info: {e}")
            
            # Process each ad variation
            for edge in edges:
                for ad_variation_data in edge.get("node", {}).get("collated_results", []):
                    campaign_id = ad_variation_data.get("collation_id")
                    if not campaign_id:
                        continue
                    
                    # Initialize campaign if not exists
                    if campaign_id not in campaigns:
                        campaigns[campaign_id] = {
                            "campaign_id": campaign_id,
                            "platforms": set(),
                            "ads": {}
                        }
                    
                    # Add platforms
                    for platform in ad_variation_data.get("publisher_platform", []):
                        campaigns[campaign_id]["platforms"].add(platform)
                    
                    # Process individual ad
                    ad_archive_id = ad_variation_data.get("ad_archive_id")
                    if ad_archive_id not in campaigns[campaign_id]["ads"]:
                        clean_ad = self.build_clean_ad_object(ad_variation_data)
                        if clean_ad:
                            # Add date information to meta
                            clean_ad["meta"]["start_date"] = self.convert_timestamp_to_date(
                                ad_variation_data.get("start_date")
                            )
                            clean_ad["meta"]["end_date"] = self.convert_timestamp_to_date(
                                ad_variation_data.get("end_date")
                            )
                            
                            campaigns[campaign_id]["ads"][ad_archive_id] = clean_ad
        
        # Finalize campaigns structure
        final_campaigns = []
        for cid, camp_data in campaigns.items():
            camp_data["platforms"] = sorted(list(camp_data["platforms"]))
            camp_data["ads"] = list(camp_data["ads"].values())
            final_campaigns.append(camp_data)
        
        return {
            "advertiser_info": advertiser_info, 
            "campaigns": final_campaigns
        }
    
    def save_enhanced_ads_to_database(self, enhanced_data: Dict) -> Dict:
        """
        Save enhanced ads data to database using the new Ad model structure
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
                campaign_id = campaign.get("campaign_id")
                platforms = campaign.get("platforms", [])
                
                # Process each ad in the campaign
                for ad_data in campaign.get("ads", []):
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
        """Find existing competitor from advertiser info (no longer creates new ones)"""
        page_id = advertiser_info.get('page_id')
        page_name = advertiser_info.get('page_name')
        page_url = advertiser_info.get('page_url')

        if not page_id or not page_name:
            logger.warning("Missing page_id or page_name in advertiser info")
            return None
        
        # Try to find existing competitor
        existing_competitor = self.db.query(Competitor).filter_by(page_id=page_id).first()
        
        if existing_competitor:
            # Update competitor info
            existing_competitor.name = page_name
            existing_competitor.page_url = page_url
            existing_competitor.updated_at = datetime.utcnow()
            return existing_competitor
        
        # No longer create new competitors
        logger.info(f"Competitor not found with page_id: {page_id}, skipping")
        return None
    
    def _create_or_update_enhanced_ad(self, ad_data: Dict, competitor_id: int, 
                                     campaign_id: str, platforms: List[str], 
                                     advertiser_info: Dict) -> Tuple[Ad, bool]:
        """
        Creates a new ad or updates an existing one based on the enhanced data.
        The 'campaign_id' and 'platforms' are currently for logging/future use
        and are not directly saved to the Ad model.
        """
        ad_archive_id = ad_data.get("ad_archive_id")
        session = self.db
        
        # Try to find an existing ad
        existing_ad = session.query(Ad).filter(Ad.ad_archive_id == ad_archive_id).first()
        
        # Prepare the data for insertion/update
        db_data = {
            "competitor_id": competitor_id,
            "ad_archive_id": ad_archive_id,
            "meta": ad_data.get("meta"),
            "targeting": ad_data.get("targeting"),
            "lead_form": ad_data.get("lead_form"),
            "creatives": ad_data.get("creatives"),
            "raw_data": ad_data,
        }
        
        if existing_ad:
            # Update existing ad
            for key, value in db_data.items():
                setattr(existing_ad, key, value)
            
            self.logger.info(f"Updating enhanced ad: {ad_archive_id}")
            created = False
        else:
            # Create new ad
            db_data["date_found"] = datetime.now()
            existing_ad = Ad(**db_data)
            self.db.add(existing_ad)
            self.logger.info(f"Creating new enhanced ad: {ad_archive_id}")
            created = True
        
        return existing_ad, created
    
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