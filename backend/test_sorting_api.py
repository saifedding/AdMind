#!/usr/bin/env python3
"""
Test script to verify the sorting functionality works correctly.
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

def test_sorting_endpoint():
    """Test the /ads endpoint with different sorting parameters."""
    
    # Test cases for different sorting options
    test_cases = [
        {"sort_by": "created_at", "sort_order": "desc", "description": "Default: Created At (Newest First)"},
        {"sort_by": "created_at", "sort_order": "asc", "description": "Created At (Oldest First)"},
        {"sort_by": "date_found", "sort_order": "desc", "description": "Date Found (Newest First)"},
        {"sort_by": "duration_days", "sort_order": "desc", "description": "Duration (Longest Running)"},
        {"sort_by": "duration_days", "sort_order": "asc", "description": "Duration (Shortest Running)"},
        {"sort_by": "variant_count", "sort_order": "desc", "description": "Variant Count (Most Variants)"},
        {"sort_by": "overall_score", "sort_order": "desc", "description": "Overall Score (High to Low)"},
        {"sort_by": "hook_score", "sort_order": "desc", "description": "Hook Score (High to Low)"},
    ]
    
    print("Testing Ads API Sorting Functionality")
    print("=" * 50)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. Testing: {test_case['description']}")
        
        # Make API request
        params = {
            "page": 1,
            "page_size": 5,  # Small page size for testing
            "sort_by": test_case["sort_by"],
            "sort_order": test_case["sort_order"]
        }
        
        try:
            response = requests.get(f"{BASE_URL}/ads", params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✓ Status: {response.status_code}")
                print(f"   ✓ Total items: {data['pagination']['total_items']}")
                print(f"   ✓ Returned: {len(data['data'])} ads")
                
                # Show first few results to verify sorting
                if data['data']:
                    print(f"   ✓ First ad details:")
                    first_ad = data['data'][0]
                    if test_case["sort_by"] == "created_at":
                        print(f"     - Created: {first_ad.get('created_at', 'N/A')}")
                    elif test_case["sort_by"] == "date_found":
                        print(f"     - Date Found: {first_ad.get('date_found', 'N/A')}")
                    elif test_case["sort_by"] == "duration_days":
                        print(f"     - Duration Days: {first_ad.get('duration_days', 'N/A')}")
                    elif test_case["sort_by"] == "variant_count":
                        print(f"     - Variant Count: {first_ad.get('variant_count', 'N/A')}")
                    elif test_case["sort_by"] == "overall_score":
                        analysis = first_ad.get('analysis') or {}
                        print(f"     - Overall Score: {analysis.get('overall_score', 'N/A')}")
                    elif test_case["sort_by"] == "hook_score":
                        analysis = first_ad.get('analysis') or {}
                        print(f"     - Hook Score: {analysis.get('hook_score', 'N/A')}")
                else:
                    print("   ! No ads returned")
                    
            else:
                print(f"   ✗ Error: {response.status_code}")
                print(f"   ✗ Response: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"   ✗ Request failed: {e}")
    
    print("\n" + "=" * 50)
    print("Testing completed!")

if __name__ == "__main__":
    test_sorting_endpoint()