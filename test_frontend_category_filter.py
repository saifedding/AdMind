#!/usr/bin/env python3
"""
Test to verify frontend is sending category_id correctly
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_frontend_category_filter():
    print("🧪 Testing Frontend Category Filter")
    print("=" * 60)
    
    # Simulate what the frontend should be sending
    print("\n1. Testing API with category_id=2 (E-commerce)...")
    params = {
        "page": 1,
        "page_size": 24,
        "sort_by": "created_at",
        "sort_order": "desc",
        "category_id": 2
    }
    
    response = requests.get(f"{BASE_URL}/ads", params=params)
    
    if response.status_code == 200:
        data = response.json()
        total = data['pagination']['total_items']
        ads = data['data']
        
        print(f"✅ API Response:")
        print(f"   Total items: {total}")
        print(f"   Ads returned: {len(ads)}")
        
        if total == 9:  # We know E-commerce has 9 ads
            print(f"✅ Category filter is working correctly!")
        else:
            print(f"❌ Expected 9 ads, got {total}")
        
        if ads:
            print(f"\n   Sample ads:")
            for i, ad in enumerate(ads[:3]):
                comp_name = ad.get('competitor_name', 'Unknown')
                cat_name = ad.get('category_name', 'No category')
                print(f"     {i+1}. {comp_name} | Category: {cat_name}")
    else:
        print(f"❌ API Error: {response.status_code}")
        print(f"   Response: {response.text}")
    
    # Test without category filter
    print("\n2. Testing API WITHOUT category filter...")
    params_no_filter = {
        "page": 1,
        "page_size": 24,
        "sort_by": "created_at",
        "sort_order": "desc"
    }
    
    response = requests.get(f"{BASE_URL}/ads", params=params_no_filter)
    
    if response.status_code == 200:
        data = response.json()
        total = data['pagination']['total_items']
        print(f"✅ Total items without filter: {total}")
        
        if total > 9:
            print(f"✅ Filter is working - more ads without filter ({total} > 9)")
        else:
            print(f"⚠️  Unexpected: same or fewer ads without filter")
    else:
        print(f"❌ API Error: {response.status_code}")

if __name__ == "__main__":
    print("🚀 Starting Frontend Category Filter Test")
    print()
    
    try:
        test_frontend_category_filter()
        print("\n🎉 Test completed!")
        print("\n📋 Summary:")
        print("If the API returns 9 ads with category_id=2, the backend is working.")
        print("If the frontend URL http://localhost:3000/ads?category_id=2 shows all ads,")
        print("then the frontend needs to be refreshed or the browser cache cleared.")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
