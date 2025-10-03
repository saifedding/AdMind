#!/usr/bin/env python3
"""
Test script to verify media refresh service with recent ads
"""
import requests
import sys

API_BASE = "http://localhost:8000/api/v1"

# Test with the most recent ad
RECENT_AD_ID = 34767  # From our query: created 2025-10-02 15:05:07
OLD_AD_ID = 34701     # The one that's failing

def test_refresh(ad_id: int, description: str):
    """Test refreshing a specific ad"""
    print(f"\n{'='*60}")
    print(f"Testing: {description}")
    print(f"Ad ID: {ad_id}")
    print(f"{'='*60}")
    
    url = f"{API_BASE}/ads/{ad_id}/refresh-media"
    
    try:
        print(f"POST {url}")
        response = requests.post(url, timeout=30)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ SUCCESS!")
            print(f"Response: {data}")
        else:
            print("❌ FAILED!")
            print(f"Response: {response.text[:500]}")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")

def main():
    print("Media Refresh Service Test")
    print("Testing with different ads to diagnose the issue")
    
    # Test 1: Recent ad
    test_refresh(RECENT_AD_ID, "Most Recent Ad (34767 - created Oct 2, 2025 15:05)")
    
    # Test 2: Old ad (the one that's failing)
    test_refresh(OLD_AD_ID, "Older Ad (34701 - created Oct 2, 2025 07:29)")
    
    print(f"\n{'='*60}")
    print("Test Complete!")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
