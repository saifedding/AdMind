#!/usr/bin/env python3
"""
Test script to verify the minimum duration filtering works correctly.
"""

import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_duration_filtering():
    """Test the /ads endpoint with minimum duration filtering."""
    
    print("Testing Minimum Duration Filtering")
    print("=" * 40)
    
    # Test cases for different minimum duration values
    test_cases = [
        {"min_duration_days": None, "description": "No duration filter"},
        {"min_duration_days": 1, "description": "Min 1 day (should show all)"},
        {"min_duration_days": 7, "description": "Min 7 days (1 week+)"},
        {"min_duration_days": 30, "description": "Min 30 days (1 month+)"},
        {"min_duration_days": 90, "description": "Min 90 days (3 months+)"},
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. Testing: {test_case['description']}")
        
        # Build parameters
        params = {
            "page": 1,
            "page_size": 10,
            "sort_by": "duration_days",
            "sort_order": "desc"
        }
        
        if test_case["min_duration_days"] is not None:
            params["min_duration_days"] = test_case["min_duration_days"]
        
        try:
            response = requests.get(f"{BASE_URL}/ads", params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✓ Status: {response.status_code}")
                print(f"   ✓ Total items: {data['pagination']['total_items']}")
                print(f"   ✓ Returned: {len(data['data'])} ads")
                
                # Check if filtering worked correctly
                if data['data']:
                    durations = []
                    for ad in data['data']:
                        duration = ad.get('duration_days')
                        if duration is not None:
                            durations.append(duration)
                    
                    if durations:
                        min_found = min(durations)
                        max_found = max(durations)
                        print(f"   ✓ Duration range found: {min_found} - {max_found} days")
                        
                        # Verify filtering worked
                        if test_case["min_duration_days"] is not None:
                            if min_found >= test_case["min_duration_days"]:
                                print(f"   ✓ Filter working: All ads >= {test_case['min_duration_days']} days")
                            else:
                                print(f"   ✗ Filter issue: Found ad with {min_found} days, expected >= {test_case['min_duration_days']}")
                    else:
                        print("   ! No duration data found in ads")
                else:
                    print("   ! No ads returned")
                    
            else:
                print(f"   ✗ Error: {response.status_code}")
                print(f"   ✗ Response: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"   ✗ Request failed: {e}")
    
    print("\n" + "=" * 40)
    print("Duration filtering test completed!")

if __name__ == "__main__":
    test_duration_filtering()