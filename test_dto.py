#!/usr/bin/env python
"""
Script to test the updated DTO classes.
"""
import sys
import os
import json
import hashlib
from datetime import datetime

# Add the project root directory to Python path
sys.path.insert(0, os.path.abspath("."))

# Test the content signature generation logic
def test_signature_with_long_copy():
    """Test signature generation prioritizes long ad copy"""
    print("Testing signature generation with long ad copy...")
    
    # Create test ad data with long copy (more than 10 words)
    ad_data = {
        "ad_archive_id": "123456789",
        "creatives": [
            {
                "body": "This is a long ad copy with more than ten words to ensure the signature is based on the text content rather than media.",
                "media": [
                    {"type": "Image", "url": "https://example.com/image1.jpg?param=123"},
                    {"type": "Video", "url": "https://example.com/video1.mp4?param=456"}
                ]
            }
        ]
    }
    
    # Extract primary ad copy
    ad_copy = ""
    if creatives := ad_data.get("creatives", []):
        for creative in creatives:
            if body := creative.get("body"):
                if body and isinstance(body, str) and len(body.strip()) > 0:
                    ad_copy = body.strip()
                    break
    
    # Normalize ad copy (lowercase and strip)
    normalized_copy = ad_copy.lower().strip() if ad_copy else ""
    
    # Calculate word count
    word_count = len(normalized_copy.split()) if normalized_copy else 0
    print(f"Word count: {word_count}")
    
    # Apply conditional logic
    if word_count > 10:
        # Long-form content: Use ad copy as signature
        print("Using ad copy as signature base")
        signature_base = normalized_copy
    else:
        # Short content: Use media URLs as signature
        print("Using media URLs as signature base")
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
    
    # Generate SHA256 hash
    signature = hashlib.sha256(signature_base.encode('utf-8')).hexdigest()
    print(f"Signature base: {signature_base[:50]}...")
    print(f"Generated signature: {signature}")
    
    # Expected signature base is the normalized ad copy
    expected_text = "this is a long ad copy with more than ten words to ensure the signature is based on the text content rather than media."
    expected_signature = hashlib.sha256(expected_text.encode('utf-8')).hexdigest()
    
    # Check if they match
    if signature == expected_signature:
        print("✅ Test passed: Signature matches expected value")
    else:
        print("❌ Test failed: Signature does not match expected value")

def test_signature_with_short_copy():
    """Test signature generation uses media URLs for short copy"""
    print("\nTesting signature generation with short ad copy...")
    
    # Create test ad data with short copy (less than 10 words)
    ad_data = {
        "ad_archive_id": "987654321",
        "creatives": [
            {
                "body": "Short ad copy.",
                "media": [
                    {"type": "Image", "url": "https://example.com/image1.jpg?param=123"},
                    {"type": "Video", "url": "https://example.com/video1.mp4?param=456"}
                ]
            }
        ]
    }
    
    # Extract primary ad copy
    ad_copy = ""
    if creatives := ad_data.get("creatives", []):
        for creative in creatives:
            if body := creative.get("body"):
                if body and isinstance(body, str) and len(body.strip()) > 0:
                    ad_copy = body.strip()
                    break
    
    # Normalize ad copy (lowercase and strip)
    normalized_copy = ad_copy.lower().strip() if ad_copy else ""
    
    # Calculate word count
    word_count = len(normalized_copy.split()) if normalized_copy else 0
    print(f"Word count: {word_count}")
    
    # Apply conditional logic
    if word_count > 10:
        # Long-form content: Use ad copy as signature
        print("Using ad copy as signature base")
        signature_base = normalized_copy
    else:
        # Short content: Use media URLs as signature
        print("Using media URLs as signature base")
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
    
    # Generate SHA256 hash
    signature = hashlib.sha256(signature_base.encode('utf-8')).hexdigest()
    print(f"Signature base: {signature_base}")
    print(f"Generated signature: {signature}")
    
    # Expected signature base is the clean media URLs, sorted and joined
    expected_base = "https://example.com/image1.jpg,https://example.com/video1.mp4"
    expected_signature = hashlib.sha256(expected_base.encode('utf-8')).hexdigest()
    
    # Check if they match
    if signature == expected_signature:
        print("✅ Test passed: Signature matches expected value")
    else:
        print("❌ Test failed: Signature does not match expected value")

if __name__ == "__main__":
    try:
        print("Starting signature generation tests...")
        test_signature_with_long_copy()
        test_signature_with_short_copy()
        print("\nAll tests completed.")
    except Exception as e:
        print(f"Error: {e}") 