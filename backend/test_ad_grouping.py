#!/usr/bin/env python3
"""
Test script for the new ad grouping logic.
This demonstrates how the direct comparison approach works for 
placing new ads into existing AdSets.
"""

import sys
import logging
import json
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Ad, AdSet, Competitor
from app.services.enhanced_ad_extraction import EnhancedAdExtractionService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("test_ad_grouping")

# Sample ad data for testing
def create_sample_ad(ad_id, title, body_text, image_url=None, video_url=None):
    """Create a sample ad with the given parameters"""
    
    # Determine media type
    media_type = "unknown"
    if image_url and not video_url:
        media_type = "image"
    elif video_url and not image_url:
        media_type = "video"
    elif image_url and video_url:
        media_type = "carousel"
        
    # Create sample ad data
    ad_data = {
        "ad_archive_id": ad_id,
        "media_type": media_type,
        "meta": {
            "page_name": "Test Advertiser",
            "page_id": "123456789",
            "start_date": "2023-01-01",
            "end_date": None,
            "is_active": True
        },
        "creatives": [
            {
                "id": f"{ad_id}-0",
                "title": title,
                "body": body_text,
                "media": []
            }
        ]
    }
    
    # Add media URLs if provided
    if image_url:
        ad_data["main_image_urls"] = [image_url]
        ad_data["media_url"] = image_url
        ad_data["creatives"][0]["media"].append({
            "type": "image",
            "url": image_url
        })
        
    if video_url:
        ad_data["main_video_urls"] = [video_url]
        if not image_url:  # Only set media_url to video if no image
            ad_data["media_url"] = video_url
        ad_data["creatives"][0]["media"].append({
            "type": "video",
            "url": video_url
        })
    
    return ad_data

def main():
    """Run the ad grouping test"""
    # Connect to database
    db = next(get_db())
    
    try:
        # Create service
        extraction_service = EnhancedAdExtractionService(db)
        
        # First, find or create a test competitor
        competitor = db.query(Competitor).filter_by(name="Test Advertiser").first()
        if not competitor:
            competitor = Competitor(
                name="Test Advertiser",
                page_id="123456789",
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(competitor)
            db.flush()
            logger.info(f"Created test competitor: {competitor.name} (ID: {competitor.id})")
        
        # Generate unique IDs for our test ads to avoid conflicts
        test_id_prefix = f"test_{uuid.uuid4().hex[:8]}"
        
        # Create sample ads for testing
        ad1 = create_sample_ad(
            f"{test_id_prefix}_ad_1", 
            "First Ad Title", 
            "This is a test ad with some sample text.",
            image_url="https://example.com/test_image1.jpg"
        )
        
        # Similar ad with nearly identical text and same image
        ad2 = create_sample_ad(
            f"{test_id_prefix}_ad_2", 
            "First Ad Title", 
            "This is a test ad with some sample text!",  # Small difference
            image_url="https://example.com/test_image1.jpg"  # Same image
        )
        
        # Different ad with different text and image
        ad3 = create_sample_ad(
            f"{test_id_prefix}_ad_3", 
            "Completely Different Title", 
            "This ad has different content and should create a new group.",
            image_url="https://example.com/test_image2.jpg"  # Different image
        )
        
        # Step 1: Create the first ad (should create a new AdSet)
        logger.info("\n\n=== STEP 1: Creating first ad ===")
        ad1_obj, is_new1 = extraction_service._create_or_update_enhanced_ad(
            ad1, competitor.id, "test_campaign", ["facebook"], {"name": competitor.name}
        )
        
        if ad1_obj:
            logger.info(f"Ad 1 created: {ad1_obj.id}, is_new: {is_new1}, ad_set_id: {ad1_obj.ad_set_id}")
            
            # Step 2: Create similar ad (should be grouped with the first ad)
            logger.info("\n\n=== STEP 2: Creating similar ad ===")
            ad2_obj, is_new2 = extraction_service._create_or_update_enhanced_ad(
                ad2, competitor.id, "test_campaign", ["facebook"], {"name": competitor.name}
            )
            
            if ad2_obj:
                logger.info(f"Ad 2 created: {ad2_obj.id}, is_new: {is_new2}, ad_set_id: {ad2_obj.ad_set_id}")
                
                # Check if they're in the same AdSet
                if ad1_obj.ad_set_id == ad2_obj.ad_set_id:
                    logger.info("SUCCESS: Similar ads were grouped together!")
                else:
                    logger.warning("FAIL: Similar ads were not grouped together!")
                
                # Step 3: Create different ad (should create a new AdSet)
                logger.info("\n\n=== STEP 3: Creating different ad ===")
                ad3_obj, is_new3 = extraction_service._create_or_update_enhanced_ad(
                    ad3, competitor.id, "test_campaign", ["facebook"], {"name": competitor.name}
                )
                
                if ad3_obj:
                    logger.info(f"Ad 3 created: {ad3_obj.id}, is_new: {is_new3}, ad_set_id: {ad3_obj.ad_set_id}")
                    
                    # Check if it's in a different AdSet
                    if ad1_obj.ad_set_id != ad3_obj.ad_set_id:
                        logger.info("SUCCESS: Different ads were placed in different groups!")
                    else:
                        logger.warning("FAIL: Different ads were incorrectly grouped together!")
                    
                    # Get AdSet info
                    ad_sets = db.query(AdSet).filter(
                        AdSet.id.in_([ad1_obj.ad_set_id, ad3_obj.ad_set_id])
                    ).all()
                    for ad_set in ad_sets:
                        logger.info(f"AdSet {ad_set.id}: {ad_set.variant_count} variants, best_ad_id: {ad_set.best_ad_id}")
                else:
                    logger.error("Failed to create ad 3")
            else:
                logger.error("Failed to create ad 2")
        else:
            logger.error("Failed to create ad 1")
        
        # Commit changes
        db.commit()
        logger.info("Test completed successfully!")
        
    except Exception as e:
        logger.error(f"Error in test: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main() 