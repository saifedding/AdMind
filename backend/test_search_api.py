#!/usr/bin/env python3
"""
Test script for the new Ad Library search functionality
"""

import requests
import json
import sys

def test_search_api():
    """Test the new search API endpoint"""
    
    # Test data
    base_url = "http://localhost:8000/api/v1"
    
    # Test 1: Keyword search
    print("🔍 Testing keyword search...")
    keyword_request = {
        "query_string": "real estate",
        "countries": ["AE"],
        "active_status": "active",
        "media_type": "all",
        "max_pages": 1,
        "save_to_database": False,  # Don't save during testing
        "min_duration_days": 7
    }
    
    try:
        response = requests.post(
            f"{base_url}/ads/library/search",
            json=keyword_request,
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Keyword search successful!")
            print(f"   Search type: {result['search_type']}")
            print(f"   Query: {result['query']}")
            print(f"   Countries: {result['countries']}")
            print(f"   Ads found: {result['total_ads_found']}")
            print(f"   Pages scraped: {result['pages_scraped']}")
            print(f"   Search time: {result['search_time']}")
            print(f"   Advertisers: {result['stats'].get('competitors_processed', 0)}")
            
            if result['ads_preview']:
                print(f"   Preview ads: {len(result['ads_preview'])}")
                for i, ad in enumerate(result['ads_preview'][:3]):
                    print(f"     {i+1}. {ad['advertiser']} - {ad['media_type']} - {'Active' if ad['is_active'] else 'Inactive'}")
        else:
            print(f"❌ Keyword search failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Keyword search error: {e}")
    
    print()
    
    # Test 2: Page search (using a known page ID)
    print("🔍 Testing page search...")
    page_request = {
        "page_id": "1404257349848075",  # Example page ID from the curl command
        "countries": ["AE"],
        "active_status": "active",
        "media_type": "all",
        "max_pages": 1,
        "save_to_database": False,
        "min_duration_days": None
    }
    
    try:
        response = requests.post(
            f"{base_url}/ads/library/search",
            json=page_request,
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Page search successful!")
            print(f"   Search type: {result['search_type']}")
            print(f"   Query: {result['query']}")
            print(f"   Countries: {result['countries']}")
            print(f"   Ads found: {result['total_ads_found']}")
            print(f"   Pages scraped: {result['pages_scraped']}")
            print(f"   Search time: {result['search_time']}")
            print(f"   Advertisers: {result['stats'].get('competitors_processed', 0)}")
            
            if result['ads_preview']:
                print(f"   Preview ads: {len(result['ads_preview'])}")
                for i, ad in enumerate(result['ads_preview'][:3]):
                    print(f"     {i+1}. {ad['advertiser']} - {ad['media_type']} - {'Active' if ad['is_active'] else 'Inactive'}")
        else:
            print(f"❌ Page search failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Page search error: {e}")

if __name__ == "__main__":
    print("🚀 Testing Ad Library Search API")
    print("=" * 50)
    
    # Check if backend is running
    try:
        response = requests.get("http://localhost:8000/docs", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running")
        else:
            print("❌ Backend is not responding correctly")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        print("Please start the backend with: cd backend && python -m uvicorn app.main:app --reload")
        sys.exit(1)
    
    print()
    test_search_api()
    print()
    print("🎉 Testing complete!")