#!/usr/bin/env python3
"""
Enhanced Video Comparison Test
=============================

This script tests the enhanced multi-factor video comparison in CreativeComparisonService.
"""

import sys
import json
import logging
from typing import Dict, List, Any, Optional
import concurrent.futures
import hashlib

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("video_comparison_test.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("video_comparison_test")

# Mock the database session
class MockSession:
    def __init__(self):
        pass
    
    def query(self, *args):
        return self
    
    def filter(self, *args):
        return self
    
    def first(self):
        return None

# Simplified version of CreativeComparisonService for testing
class TestCreativeComparisonService:
    def __init__(self):
        self.logger = logger
    
    # Mock image comparison function
    def compare_images(self, url1: str, url2: str, cutoff: int = 5) -> tuple[bool, int]:
        """Mock image comparison"""
        if url1 == url2:
            self.logger.info(f"Exact URL match between thumbnail images")
            return True, 0
        
        # Simulate perceptual hashing
        hash1 = int(hashlib.md5(url1.encode()).hexdigest()[:8], 16)
        hash2 = int(hashlib.md5(url2.encode()).hexdigest()[:8], 16)
        
        # Calculate simulated difference
        diff = abs(hash1 - hash2) % 20  # Modulo to keep within reasonable range
        self.logger.info(f"Image comparison: hash diff = {diff} (cutoff: {cutoff})")
        
        return diff <= cutoff, diff
    
    # Mock video comparison function
    def compare_videos(self, url1: str, url2: str, samples: int = 6, hash_cutoff: int = 6, 
                       similarity_threshold: float = 0.8) -> tuple[bool, float]:
        """Mock video comparison"""
        if url1 == url2:
            self.logger.info(f"Exact video URL match")
            return True, 1.0
        
        # Simulate frame comparison with URL similarity
        common_len = 0
        for i, (c1, c2) in enumerate(zip(url1, url2)):
            if c1 == c2:
                common_len += 1
            else:
                break
        
        total_len = max(len(url1), len(url2))
        similarity = common_len / total_len if total_len > 0 else 0.0
        self.logger.info(f"Video comparison: similarity = {similarity:.2f} (threshold: {similarity_threshold})")
        
        return similarity >= similarity_threshold, similarity
    
    # Extract functions from CreativeComparisonService
    def _extract_hq_video_url(self, creative: Dict) -> Optional[str]:
        """Extract high-quality video URL from creative"""
        # Check for video_hd_url in creative
        if creative.get("video_hd_url"):
            return creative["video_hd_url"]
            
        # Check in media list for high-quality video
        for media in creative.get("media", []):
            if media.get("type", "").lower() == "video" and media.get("url"):
                # If there's a "quality" indicator, check for HD
                if media.get("quality", "").lower() in ["hd", "high"]:
                    return media["url"]
        
        # If no explicit HQ URL, return the first video URL found
        for media in creative.get("media", []):
            if media.get("type", "").lower() == "video" and media.get("url"):
                return media["url"]
        
        return None
    
    def _extract_thumbnail_url(self, creative: Dict) -> Optional[str]:
        """Extract video thumbnail URL from creative"""
        # Check for explicit thumbnail
        if creative.get("video_preview_image_url"):
            return creative["video_preview_image_url"]
            
        # Check in main_image_urls if available
        if creative.get("main_image_urls") and len(creative["main_image_urls"]) > 0:
            return creative["main_image_urls"][0]
            
        # Check in media list for thumbnail or preview image
        for media in creative.get("media", []):
            if media.get("type", "").lower() == "image" and media.get("url"):
                if media.get("role", "").lower() in ["thumbnail", "preview"]:
                    return media["url"]
        
        # If no explicit thumbnail, return the first image URL found
        for media in creative.get("media", []):
            if media.get("type", "").lower() == "image" and media.get("url"):
                return media["url"]
        
        return None
    
    def _extract_lq_video_url(self, creative: Dict) -> Optional[str]:
        """Extract low-quality video URL from creative for frame sampling"""
        # Check for video_sd_url in creative
        if creative.get("video_sd_url"):
            return creative["video_sd_url"]
            
        # Check in main_video_urls if available
        if creative.get("main_video_urls") and len(creative["main_video_urls"]) > 1:
            # Often the second URL is the low-quality stream in Facebook ads
            return creative["main_video_urls"][1]
        elif creative.get("main_video_urls") and len(creative["main_video_urls"]) > 0:
            return creative["main_video_urls"][0]
            
        # Check in media list for low-quality video
        for media in creative.get("media", []):
            if media.get("type", "").lower() == "video" and media.get("url"):
                # If there's a "quality" indicator, check for SD/low
                if media.get("quality", "").lower() in ["sd", "low"]:
                    return media["url"]
        
        # If no specific LQ URL, use the HQ URL as fallback
        return self._extract_hq_video_url(creative)
    
    # Enhanced video comparison method
    def compare_ad_videos(
        self,
        creative1: Dict,
        creative2: Dict,
        samples: int = 6,
        hash_cutoff: int = 6,
        similarity_threshold: float = 0.9
    ) -> tuple[bool, float, str]:
        """
        Multi-factor video comparison using various video sources from ad creatives.
        Implements a fast-path system similar to group_ads.py:
        1. HQ URL match -> 2. Thumbnail comparison -> 3. LQ Stream comparison
        """
        self.logger.info("Performing multi-factor video comparison")
        
        # 1. High-quality video URL match (fastest check)
        hq_url1 = self._extract_hq_video_url(creative1)
        hq_url2 = self._extract_hq_video_url(creative2)
        
        if hq_url1 and hq_url2:
            self.logger.info(f"HQ URLs: {hq_url1[:30]}... and {hq_url2[:30]}...")
            
            if hq_url1 == hq_url2:
                self.logger.info("Videos match via exact high-quality URL match")
                return True, 1.0, "url"
        else:
            self.logger.info("One or both HQ URLs are missing")
        
        # 2. Thumbnail comparison (second fastest)
        thumbnail_url1 = self._extract_thumbnail_url(creative1)
        thumbnail_url2 = self._extract_thumbnail_url(creative2)
        
        if thumbnail_url1 and thumbnail_url2:
            self.logger.info(f"Thumbnails: {thumbnail_url1[:30]}... and {thumbnail_url2[:30]}...")
            similar, diff = self.compare_images(thumbnail_url1, thumbnail_url2)
            
            if similar:
                similarity = 1.0 - (diff / 10.0) if diff is not None else 0.8
                self.logger.info(f"Videos match via thumbnail comparison (diff: {diff}, similarity: {similarity:.2f})")
                return True, similarity, "thumbnail"
            else:
                self.logger.info(f"Thumbnails are different (diff: {diff})")
        else:
            self.logger.info("One or both thumbnails are missing")
        
        # 3. Low-quality video stream comparison (most expensive, but most thorough)
        lq_url1 = self._extract_lq_video_url(creative1)
        lq_url2 = self._extract_lq_video_url(creative2)
        
        if lq_url1 and lq_url2:
            self.logger.info(f"LQ URLs: {lq_url1[:30]}... and {lq_url2[:30]}...")
            similar, score = self.compare_videos(lq_url1, lq_url2, samples, hash_cutoff, similarity_threshold)
            
            if similar:
                self.logger.info(f"Videos match via frame sampling (score: {score:.2f})")
                return True, score, "frames"
            else:
                self.logger.info(f"Video frames are different (score: {score:.2f})")
        else:
            self.logger.info("One or both LQ URLs are missing")
        
        # No match found through any method
        return False, 0.0, "none"

def create_sample_creatives():
    """Create sample ad creatives for testing"""
    
    # Case 1: Identical HQ URLs
    creative1 = {
        "id": "creative1",
        "media": [
            {"type": "Video", "url": "https://example.com/video1_hq.mp4", "quality": "high"},
            {"type": "Image", "url": "https://example.com/thumb1.jpg", "role": "thumbnail"}
        ],
        "main_video_urls": ["https://example.com/video1_hq.mp4", "https://example.com/video1_lq.mp4"],
        "main_image_urls": ["https://example.com/thumb1.jpg"]
    }
    
    creative2 = {
        "id": "creative2",
        "media": [
            {"type": "Video", "url": "https://example.com/video1_hq.mp4", "quality": "high"},
            {"type": "Image", "url": "https://example.com/thumb2.jpg", "role": "thumbnail"}
        ],
        "main_video_urls": ["https://example.com/video1_hq.mp4", "https://example.com/video1_lq.mp4"],
        "main_image_urls": ["https://example.com/thumb2.jpg"]
    }
    
    # Case 2: Different HQ URLs but identical thumbnails
    creative3 = {
        "id": "creative3",
        "media": [
            {"type": "Video", "url": "https://example.com/video2_hq.mp4", "quality": "high"},
            {"type": "Image", "url": "https://example.com/thumb3.jpg", "role": "thumbnail"}
        ],
        "main_video_urls": ["https://example.com/video2_hq.mp4", "https://example.com/video2_lq.mp4"],
        "main_image_urls": ["https://example.com/thumb3.jpg"]
    }
    
    creative4 = {
        "id": "creative4",
        "media": [
            {"type": "Video", "url": "https://example.com/video3_hq.mp4", "quality": "high"},
            {"type": "Image", "url": "https://example.com/thumb3.jpg", "role": "thumbnail"}
        ],
        "main_video_urls": ["https://example.com/video3_hq.mp4", "https://example.com/video3_lq.mp4"],
        "main_image_urls": ["https://example.com/thumb3.jpg"]
    }
    
    # Case 3: Different HQ URLs, different thumbnails, but similar LQ streams
    creative5 = {
        "id": "creative5",
        "media": [
            {"type": "Video", "url": "https://example.com/video4_hq.mp4", "quality": "high"},
            {"type": "Image", "url": "https://example.com/thumb4.jpg", "role": "thumbnail"}
        ],
        "main_video_urls": ["https://example.com/video4_hq.mp4", "https://example.com/shared_content_lq.mp4"],
        "main_image_urls": ["https://example.com/thumb4.jpg"]
    }
    
    creative6 = {
        "id": "creative6",
        "media": [
            {"type": "Video", "url": "https://example.com/video5_hq.mp4", "quality": "high"},
            {"type": "Image", "url": "https://example.com/thumb5.jpg", "role": "thumbnail"}
        ],
        "main_video_urls": ["https://example.com/video5_hq.mp4", "https://example.com/shared_content_lq.mp4"],
        "main_image_urls": ["https://example.com/thumb5.jpg"]
    }
    
    # Case 4: Completely different videos
    creative7 = {
        "id": "creative7",
        "media": [
            {"type": "Video", "url": "https://example.com/video6_hq.mp4", "quality": "high"},
            {"type": "Image", "url": "https://example.com/thumb6.jpg", "role": "thumbnail"}
        ],
        "main_video_urls": ["https://example.com/video6_hq.mp4", "https://example.com/video6_lq.mp4"],
        "main_image_urls": ["https://example.com/thumb6.jpg"]
    }
    
    creative8 = {
        "id": "creative8",
        "media": [
            {"type": "Video", "url": "https://example.com/completely_different_hq.mp4", "quality": "high"},
            {"type": "Image", "url": "https://example.com/completely_different_thumb.jpg", "role": "thumbnail"}
        ],
        "main_video_urls": ["https://example.com/completely_different_hq.mp4", "https://example.com/completely_different_lq.mp4"],
        "main_image_urls": ["https://example.com/completely_different_thumb.jpg"]
    }
    
    return [
        (creative1, creative2, "HQ URL Match"),
        (creative3, creative4, "Thumbnail Match"),
        (creative5, creative6, "LQ Stream Match"),
        (creative7, creative8, "No Match")
    ]

def main():
    """Test the enhanced video comparison"""
    logger.info("=== Testing Enhanced Multi-Factor Video Comparison ===")
    
    # Initialize the comparison service
    comparison_service = TestCreativeComparisonService()
    
    # Get sample creatives
    creative_pairs = create_sample_creatives()
    
    # Run comparison tests
    results = []
    
    for creative1, creative2, test_case in creative_pairs:
        logger.info(f"\n--- Test Case: {test_case} ---")
        logger.info(f"Comparing creative {creative1['id']} with {creative2['id']}")
        
        # Run the multi-factor comparison
        is_similar, score, match_type = comparison_service.compare_ad_videos(creative1, creative2)
        
        # Store results
        result = {
            "test_case": test_case,
            "creative1_id": creative1["id"],
            "creative2_id": creative2["id"],
            "is_similar": is_similar,
            "similarity_score": score,
            "match_type": match_type
        }
        results.append(result)
        
        # Log result
        logger.info(f"Result: {'Similar' if is_similar else 'Different'}, " +
                    f"Score: {score:.2f}, Match Type: {match_type}")
    
    # Write results to file
    with open("video_comparison_results.json", "w") as f:
        json.dump({"results": results}, f, indent=2)
    
    logger.info("\n=== Summary of Results ===")
    for result in results:
        logger.info(f"{result['test_case']}: " +
                    f"{'Similar' if result['is_similar'] else 'Different'} " +
                    f"({result['match_type']} match, score: {result['similarity_score']:.2f})")
    
    logger.info("\nTest completed and results saved to video_comparison_results.json")

if __name__ == "__main__":
    main() 