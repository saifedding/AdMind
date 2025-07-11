#!/usr/bin/env python3
"""
Ad Grouping Test Script
======================

This script tests the ad grouping mechanism with sample ad data and enhanced logging.
"""

import os
import sys
import json
import logging
from typing import List, Dict, Any
import hashlib
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("ad_grouping_test.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("ad_grouping_test")

# Sample image comparison function
def compare_images(url1: str, url2: str, cutoff: int = 5) -> tuple[bool, int]:
    """Mock image comparison using URL hashes as proxy for perceptual hashes"""
    if url1 == url2:
        logger.info(f"Exact URL match between {url1[:30]}... and {url2[:30]}...")
        return True, 0
    
    # Simulate perceptual hashing by using first 8 chars of URL hash
    hash1 = int(hashlib.md5(url1.encode()).hexdigest()[:8], 16)
    hash2 = int(hashlib.md5(url2.encode()).hexdigest()[:8], 16)
    
    # Calculate simulated difference
    diff = abs(hash1 - hash2) % 20  # Modulo to keep within reasonable range
    logger.info(f"Image comparison: hash diff = {diff} (cutoff: {cutoff})")
    
    return diff <= cutoff, diff

# Sample video comparison function
def compare_videos(url1: str, url2: str, threshold: float = 0.8) -> tuple[bool, float]:
    """Mock video comparison using URL similarity"""
    if url1 == url2:
        logger.info(f"Exact video URL match")
        return True, 1.0
    
    # Check common prefix (simulates matching content)
    common_len = 0
    for i, (c1, c2) in enumerate(zip(url1, url2)):
        if c1 == c2:
            common_len += 1
        else:
            break
    
    total_len = max(len(url1), len(url2))
    similarity = common_len / total_len if total_len > 0 else 0.0
    logger.info(f"Video comparison: similarity = {similarity:.2f} (threshold: {threshold})")
    
    return similarity >= threshold, similarity

def extract_media_urls(ad: Dict[str, Any]) -> Dict[str, List[str]]:
    """Extract image and video URLs from ad data"""
    result = {
        "images": [],
        "videos": []
    }
    
    # Direct media URL
    if ad.get("media_url"):
        media_type = ad.get("media_type", "Unknown")
        if media_type == "Image":
            result["images"].append(ad["media_url"])
        elif media_type == "Video":
            result["videos"].append(ad["media_url"])
    
    # Main image URLs
    if ad.get("main_image_urls"):
        result["images"].extend(ad["main_image_urls"])
    
    # Main video URLs
    if ad.get("main_video_urls"):
        result["videos"].extend(ad["main_video_urls"])
    
    # Extract from creatives
    for creative in ad.get("creatives", []):
        for media in creative.get("media", []):
            media_type = media.get("type", "Unknown")
            if "url" in media:
                if media_type.lower() == "image":
                    result["images"].append(media["url"])
                elif media_type.lower() == "video":
                    result["videos"].append(media["url"])
    
    return result

def are_ads_similar(ad1: Dict[str, Any], ad2: Dict[str, Any]) -> bool:
    """Determine if two ads are similar enough to be grouped"""
    ad1_id = ad1.get("id", "unknown")
    ad2_id = ad2.get("id", "unknown")
    logger.info(f"Comparing ads: {ad1_id} vs {ad2_id}")
    
    # Check exact same ad
    if ad1_id == ad2_id and ad1_id != "unknown":
        logger.info("Same ad ID - identical ads")
        return True
    
    # Check media type
    if ad1.get("media_type") != ad2.get("media_type"):
        logger.info(f"Different media types: {ad1.get('media_type')} vs {ad2.get('media_type')}")
        return False
    
    # Compare text content if available
    ad1_text = ""
    ad2_text = ""
    
    # Extract text from creatives
    for creative in ad1.get("creatives", []):
        if "body" in creative and creative["body"]:
            ad1_text = creative["body"]
            break
    
    for creative in ad2.get("creatives", []):
        if "body" in creative and creative["body"]:
            ad2_text = creative["body"]
            break
    
    # If both have significant text, compare
    if ad1_text and ad2_text and len(ad1_text) > 20 and len(ad2_text) > 20:
        logger.info("Both ads have significant text content")
        
        # Exact text match
        if ad1_text == ad2_text:
            logger.info("Text content is identical")
            return True
        
        # Calculate text similarity
        words1 = set(ad1_text.lower().split())
        words2 = set(ad2_text.lower().split())
        
        if words1 and words2:
            intersection = len(words1.intersection(words2))
            union = len(words1.union(words2))
            similarity = intersection / union if union > 0 else 0
            
            logger.info(f"Text similarity: {similarity:.2f} (threshold: 0.8)")
            
            if similarity >= 0.8:
                logger.info("Text similarity above threshold - ads are similar")
                return True
    
    # Compare media
    media1 = extract_media_urls(ad1)
    media2 = extract_media_urls(ad2)
    
    logger.info(f"Ad1 has {len(media1['images'])} images and {len(media1['videos'])} videos")
    logger.info(f"Ad2 has {len(media2['images'])} images and {len(media2['videos'])} videos")
    
    # Check for image similarity
    for img1 in media1["images"]:
        for img2 in media2["images"]:
            similar, diff = compare_images(img1, img2)
            if similar:
                logger.info(f"Found similar images (diff: {diff}) - ads are similar")
                return True
    
    # Check for video similarity
    for vid1 in media1["videos"]:
        for vid2 in media2["videos"]:
            similar, score = compare_videos(vid1, vid2)
            if similar:
                logger.info(f"Found similar videos (score: {score:.2f}) - ads are similar")
                return True
    
    logger.info("No similarity found between ads")
    return False

def group_ads(ads: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
    """Group similar ads together"""
    logger.info(f"Starting ad grouping for {len(ads)} ads")
    
    ad_groups = []
    processed_ads = set()
    
    for i, ad1 in enumerate(ads):
        ad1_id = ad1.get("id", f"unknown_{i}")
        
        if ad1_id in processed_ads:
            continue
        
        logger.info(f"Creating new group with ad {ad1_id}")
        new_group = [ad1]
        processed_ads.add(ad1_id)
        
        # Compare with all other unprocessed ads
        for j, ad2 in enumerate(ads):
            if j <= i:  # Skip previously processed ads and self
                continue
                
            ad2_id = ad2.get("id", f"unknown_{j}")
            if ad2_id in processed_ads:
                continue
            
            logger.info(f"Checking if ad {ad2_id} belongs in group with {ad1_id}")
            if are_ads_similar(ad1, ad2):
                logger.info(f"Adding ad {ad2_id} to group with {ad1_id}")
                new_group.append(ad2)
                processed_ads.add(ad2_id)
            else:
                logger.info(f"Ad {ad2_id} is different from {ad1_id}, not adding to group")
        
        ad_groups.append(new_group)
        logger.info(f"Completed group {len(ad_groups)}: {len(new_group)} ads")
    
    logger.info(f"Grouping complete: {len(ads)} ads organized into {len(ad_groups)} groups")
    return ad_groups

def main():
    """Main test function"""
    # Load sample ad data or create mock data
    sample_ads = [
        {
            "id": "ad1",
            "media_type": "Image",
            "media_url": "https://example.com/image1.jpg",
            "creatives": [
                {
                    "body": "Check out our amazing product with exclusive features!",
                    "media": [{"type": "Image", "url": "https://example.com/image1.jpg"}]
                }
            ]
        },
        {
            "id": "ad2",
            "media_type": "Image",
            "media_url": "https://example.com/image1.jpg?size=large",
            "creatives": [
                {
                    "body": "Check out our amazing product with exclusive features!",
                    "media": [{"type": "Image", "url": "https://example.com/image1.jpg?size=large"}]
                }
            ]
        },
        {
            "id": "ad3",
            "media_type": "Video",
            "media_url": "https://example.com/video1.mp4",
            "main_video_urls": ["https://example.com/video1.mp4"],
            "creatives": [
                {
                    "body": "Watch this demo of our newest product line!",
                    "media": [{"type": "Video", "url": "https://example.com/video1.mp4"}]
                }
            ]
        },
        {
            "id": "ad4",
            "media_type": "Video",
            "media_url": "https://example.com/video2.mp4",
            "main_video_urls": ["https://example.com/video2.mp4"],
            "creatives": [
                {
                    "body": "An entirely different message for a different product",
                    "media": [{"type": "Video", "url": "https://example.com/video2.mp4"}]
                }
            ]
        },
        {
            "id": "ad5",
            "media_type": "Image",
            "media_url": "https://example.com/different_image.jpg",
            "creatives": [
                {
                    "body": "Check out our amazing product with exclusive features!",
                    "media": [{"type": "Image", "url": "https://example.com/different_image.jpg"}]
                }
            ]
        }
    ]
    
    # Run the grouping
    logger.info("=== Starting Ad Grouping Test ===")
    ad_groups = group_ads(sample_ads)
    
    # Print results
    logger.info("\n=== Grouping Results ===")
    for i, group in enumerate(ad_groups):
        logger.info(f"Group {i+1}: {len(group)} ads")
        for ad in group:
            logger.info(f"  - Ad {ad['id']}: {ad.get('media_type')}, {ad.get('media_url')}")
    
    # Write results to file
    with open("ad_grouping_results.json", "w") as f:
        json.dump({"ad_groups": [
            [ad["id"] for ad in group] for group in ad_groups
        ]}, f, indent=2)
    
    logger.info("Test completed and results saved to ad_grouping_results.json")

if __name__ == "__main__":
    main() 