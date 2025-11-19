from sqlalchemy import Column, Integer, BigInteger, String, Text, DateTime, ForeignKey, JSON, Boolean, func, Float, ARRAY
from sqlalchemy.orm import relationship
from app.database import Base


class Ad(Base):
    __tablename__ = "ads"

    # Core identification fields
    id = Column(BigInteger, primary_key=True, index=True)
    competitor_id = Column(Integer, ForeignKey("competitors.id"), nullable=False, index=True)
    ad_archive_id = Column(String, unique=True, nullable=False, index=True)
    
    # Basic tracking fields
    date_found = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Duration field - calculated during scraping
    duration_days = Column(Integer, nullable=True, index=True)  # Number of days the ad has been running
    
    # User preferences
    is_favorite = Column(Boolean, default=False, nullable=False, index=True)  # Whether the ad is marked as favorite
    
    # Raw data from initial scrape
    raw_data = Column(JSON, nullable=True)
    
    # Foreign key to ad set
    ad_set_id = Column(Integer, ForeignKey("ad_sets.id"), nullable=True, index=True)
    
    # Relationships
    competitor = relationship("Competitor", back_populates="ads")
    analysis = relationship("AdAnalysis", uselist=False, back_populates="ad", cascade="all, delete-orphan")
    ad_set = relationship("AdSet", back_populates="ads", foreign_keys=[ad_set_id])
    
    # New structured fields for enhanced extraction
    meta = Column(JSON, nullable=True)
    targeting = Column(JSON, nullable=True)
    lead_form = Column(JSON, nullable=True)
    creatives = Column(JSON, nullable=True)

    def __repr__(self):
        return f"<Ad(id={self.id}, ad_archive_id='{self.ad_archive_id}')>"
    
    def to_dict(self):
        """Convert Ad instance to dictionary for JSON serialization"""
        date_found_iso = None
        if hasattr(self, 'date_found') and self.date_found is not None:
            date_found_iso = self.date_found.isoformat()
            
        created_at_iso = None
        if hasattr(self, 'created_at') and self.created_at is not None:
            created_at_iso = self.created_at.isoformat()
            
        updated_at_iso = None
        if hasattr(self, 'updated_at') and self.updated_at is not None:
            updated_at_iso = self.updated_at.isoformat()
        
        # Extract data from raw_data if available
        raw = self.raw_data or {}
        
        # If raw_data is empty or missing key fields, try to extract from creatives
        if (not raw or not raw.get("main_title")) and self.creatives and len(self.creatives) > 0:
            first_creative = self.creatives[0] if isinstance(self.creatives, list) else {}
            
            # Build extracted data from creative
            extracted = {
                "main_title": first_creative.get("headline") or first_creative.get("title"),
                "main_body_text": first_creative.get("body"),
                "main_caption": first_creative.get("caption"),
            }
            
            # Extract CTA
            cta = first_creative.get("cta", {})
            if isinstance(cta, dict):
                extracted["cta_text"] = cta.get("text")
                extracted["cta_type"] = cta.get("type")
            
            # Extract media URLs
            media_list = first_creative.get("media", [])
            if media_list:
                image_urls = [m.get("url") for m in media_list if m.get("type") == "Image"]
                video_urls = [m.get("url") for m in media_list if m.get("type") == "Video"]
                
                if image_urls:
                    extracted["main_image_urls"] = image_urls
                    extracted["media_type"] = "image"
                    extracted["media_url"] = image_urls[0]
                if video_urls:
                    extracted["main_video_urls"] = video_urls
                    if not extracted.get("media_type"):  # Prefer video if no image
                        extracted["media_type"] = "video"
                        extracted["media_url"] = video_urls[0]
            
            # Extract link
            link = first_creative.get("link", {})
            if isinstance(link, dict) and link.get("url"):
                extracted["main_link_url"] = link.get("url")
            
            # Merge with existing raw data (prefer creative data)
            raw = {**raw, **{k: v for k, v in extracted.items() if v is not None}}
        
        # Also extract from meta if available
        if self.meta:
            if not raw.get("page_name") and self.meta.get("page_name"):
                raw["page_name"] = self.meta.get("page_name")
            if not raw.get("page_id") and self.meta.get("page_id"):
                raw["page_id"] = self.meta.get("page_id")
            if not raw.get("cta_type") and self.meta.get("cta_type"):
                raw["cta_type"] = self.meta.get("cta_type")
                if not raw.get("cta_text"):
                    # Format CTA type as readable text
                    raw["cta_text"] = self.meta.get("cta_type", "").replace("_", " ").title()
            if not raw.get("start_date") and self.meta.get("start_date"):
                raw["start_date"] = self.meta.get("start_date")
            if not raw.get("end_date") and self.meta.get("end_date"):
                raw["end_date"] = self.meta.get("end_date")
            if not raw.get("is_active") and self.meta.get("is_active") is not None:
                raw["is_active"] = self.meta.get("is_active")
        
        # Extract from raw_data.snapshot if available (legacy Facebook format)
        if self.raw_data and isinstance(self.raw_data, dict):
            snapshot = self.raw_data.get("snapshot", {})
            if snapshot:
                # Extract body text
                if not raw.get("main_body_text") and snapshot.get("body", {}).get("text"):
                    raw["main_body_text"] = snapshot["body"]["text"]
                
                # Extract title
                if not raw.get("main_title") and snapshot.get("title"):
                    raw["main_title"] = snapshot["title"]
                
                # Extract caption
                if not raw.get("main_caption") and snapshot.get("caption"):
                    raw["main_caption"] = snapshot["caption"]
                
                # Extract CTA
                if not raw.get("cta_text") and snapshot.get("cta_text"):
                    raw["cta_text"] = snapshot["cta_text"]
                if not raw.get("cta_type") and snapshot.get("cta_type"):
                    raw["cta_type"] = snapshot["cta_type"]
                
                # Extract page info
                if not raw.get("page_name") and snapshot.get("page_name"):
                    raw["page_name"] = snapshot["page_name"]
                if not raw.get("page_profile_picture_url") and snapshot.get("page_profile_picture_url"):
                    raw["page_profile_picture_url"] = snapshot["page_profile_picture_url"]
                
                # Extract videos (only highest quality - HD preferred over SD)
                videos = snapshot.get("videos", [])
                if videos and not raw.get("main_video_urls"):
                    video_urls = []
                    for video in videos:
                        # Only get HD if available, otherwise SD - not both
                        url = video.get("video_hd_url")
                        if not url:
                            url = video.get("video_sd_url")
                        if url:
                            video_urls.append(url)
                    if video_urls:
                        raw["main_video_urls"] = video_urls
                        raw["media_type"] = "video"
                        raw["media_url"] = video_urls[0]
                
                # Extract images
                images = snapshot.get("images", [])
                if images and not raw.get("main_image_urls") and not raw.get("main_video_urls"):
                    image_urls = [img.get("original_image_url") or img.get("resized_image_url") for img in images]
                    image_urls = [url for url in image_urls if url]  # Filter out None values
                    if image_urls:
                        raw["main_image_urls"] = image_urls
                        raw["media_type"] = "image"
                        raw["media_url"] = image_urls[0]
        
        # Get competitor data
        competitor_data = None
        if hasattr(self, 'competitor') and self.competitor:
            competitor_data = {
                "id": self.competitor.id,
                "name": self.competitor.name,
                "page_id": self.competitor.page_id,
                "is_active": self.competitor.is_active
            }
        
        # Get analysis data
        analysis_data = None
        if hasattr(self, 'analysis') and self.analysis:
            analysis_data = {
                "id": self.analysis.id,
                "summary": self.analysis.summary,
                "hook_score": self.analysis.hook_score,
                "overall_score": self.analysis.overall_score,
                "confidence_score": self.analysis.confidence_score,
                "target_audience": self.analysis.target_audience,
                "content_themes": self.analysis.content_themes,
                "analysis_version": self.analysis.analysis_version,
                "created_at": self.analysis.created_at.isoformat() if self.analysis.created_at else None,
                "updated_at": self.analysis.updated_at.isoformat() if self.analysis.updated_at else None
            }
        
        # Build creatives array from raw_data if not already populated
        creatives_data = self.creatives if self.creatives else []
        
        # Handle cases where creatives might be a string (like " ") instead of a list
        if isinstance(creatives_data, str):
            creatives_data = []
        
        # If creatives is empty but we have data in raw_data, build a creative from it
        if not creatives_data or (isinstance(creatives_data, list) and len(creatives_data) == 0):
            # Check if we have media URLs extracted from raw data
            has_media = raw.get("main_image_urls") or raw.get("main_video_urls")
            has_content = raw.get("main_title") or raw.get("main_body_text")
            
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Ad {self.id}: Building creatives - has_media={bool(has_media)}, has_content={bool(has_content)}, video_urls={raw.get('main_video_urls')}, image_urls={raw.get('main_image_urls')}")
            
            if has_media or has_content:
                # Build a single creative from the extracted data
                media_list = []
                
                # Add videos first (preferred)
                if raw.get("main_video_urls"):
                    for video_url in raw.get("main_video_urls", []):
                        media_list.append({
                            "url": video_url,
                            "type": "Video"
                        })
                
                # Add images
                if raw.get("main_image_urls"):
                    for image_url in raw.get("main_image_urls", []):
                        media_list.append({
                            "url": image_url,
                            "type": "Image"
                        })
                
                creative = {
                    "id": f"{self.ad_archive_id}-0",
                    "title": raw.get("main_title"),
                    "body": raw.get("main_body_text"),
                    "caption": raw.get("main_caption"),
                    "link_url": None,
                    "link_description": None,
                    "media": media_list
                }
                
                creatives_data = [creative]
                logger.info(f"Ad {self.id}: Built creatives_data with {len(creatives_data)} creative(s), media count: {len(media_list)}")
        
        # Get ad_set data for date range
        ad_set_first_seen_date = None
        ad_set_last_seen_date = None
        ad_set_created_at = None
        variant_count = None
        
        if hasattr(self, 'ad_set') and self.ad_set:
            ad_set_first_seen_date = self.ad_set.first_seen_date.isoformat() if self.ad_set.first_seen_date else None
            ad_set_last_seen_date = self.ad_set.last_seen_date.isoformat() if self.ad_set.last_seen_date else None
            ad_set_created_at = self.ad_set.created_at.isoformat() if self.ad_set.created_at else None
            variant_count = self.ad_set.variant_count
            
        return {
            "id": self.id,
            "competitor_id": self.competitor_id,
            "competitor": competitor_data,
            "ad_archive_id": self.ad_archive_id,
            "ad_set_id": self.ad_set_id,
            "variant_count": variant_count,
            "ad_set_created_at": ad_set_created_at,
            "ad_set_first_seen_date": ad_set_first_seen_date,
            "ad_set_last_seen_date": ad_set_last_seen_date,
            "date_found": date_found_iso,
            "created_at": created_at_iso,
            "updated_at": updated_at_iso,
            "duration_days": self.duration_days,
            "is_favorite": self.is_favorite if self.is_favorite is not None else False,
            
            # Extract content from raw_data
            "ad_copy": raw.get("ad_copy"),
            "main_title": raw.get("main_title"),
            "main_body_text": raw.get("main_body_text"),
            "main_caption": raw.get("main_caption"),
            "media_type": raw.get("media_type"),
            "media_url": raw.get("media_url"),
            "main_image_urls": raw.get("main_image_urls", []),
            "main_video_urls": raw.get("main_video_urls", []),
            "page_name": raw.get("page_name"),
            "page_id": raw.get("page_id"),
            "page_profile_picture_url": raw.get("page_profile_picture_url"),
            "publisher_platform": raw.get("publisher_platform", []),
            "targeted_countries": raw.get("targeted_countries", []),
            "impressions_text": raw.get("impressions_text"),
            "spend": raw.get("spend"),
            "cta_text": raw.get("cta_text"),
            "cta_type": raw.get("cta_type"),
            "start_date": raw.get("start_date"),
            "end_date": raw.get("end_date"),
            "is_active": raw.get("is_active"),
            
            # Structured data
            "meta": self.meta or {},
            "targeting": self.targeting or {},
            "lead_form": self.lead_form or {},
            "creatives": creatives_data,
            
            # Analysis
            "analysis": analysis_data
        }
    
    def to_enhanced_format(self):
        """Convert to the new enhanced frontend format"""
        return {
            "ad_archive_id": self.ad_archive_id,
            "meta": self.meta,
            "targeting": self.targeting,
            "lead_form": self.lead_form,
            "creatives": self.creatives
        } 