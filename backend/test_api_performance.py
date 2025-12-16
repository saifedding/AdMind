#!/usr/bin/env python3

import time
import requests
import json
from statistics import mean, median

def test_api_performance():
    """Test the performance of the ads API endpoint"""
    
    url = "http://localhost:8000/api/v1/ads"
    params = {
        "page": 1,
        "page_size": 24,
        "sort_by": "created_at",
        "sort_order": "desc"
    }
    
    headers = {
        "accept": "*/*",
        "content-type": "application/json"
    }
    
    print("🔍 Testing API Performance...")
    print(f"URL: {url}")
    print(f"Params: {params}")
    print("-" * 50)
    
    response_times = []
    
    # Run 5 tests to get average performance
    for i in range(5):
        print(f"Test {i+1}/5: ", end="", flush=True)
        
        start_time = time.time()
        try:
            response = requests.get(url, params=params, headers=headers, timeout=30)
            end_time = time.time()
            
            response_time = (end_time - start_time) * 1000  # Convert to milliseconds
            response_times.append(response_time)
            
            if response.status_code == 200:
                data = response.json()
                total_items = data.get('pagination', {}).get('total_items', 0)
                returned_items = len(data.get('data', []))
                print(f"{response_time:.0f}ms ✅ (returned {returned_items}/{total_items} items)")
            else:
                print(f"{response_time:.0f}ms ❌ (HTTP {response.status_code})")
                
        except Exception as e:
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            print(f"{response_time:.0f}ms ❌ (Error: {str(e)})")
            response_times.append(response_time)
    
    print("-" * 50)
    print("📊 Performance Results:")
    print(f"Average: {mean(response_times):.0f}ms")
    print(f"Median:  {median(response_times):.0f}ms")
    print(f"Min:     {min(response_times):.0f}ms")
    print(f"Max:     {max(response_times):.0f}ms")
    
    avg_time = mean(response_times)
    if avg_time < 500:
        print("🟢 Performance: EXCELLENT (< 500ms)")
    elif avg_time < 1000:
        print("🟡 Performance: GOOD (500ms - 1s)")
    elif avg_time < 2000:
        print("🟠 Performance: SLOW (1s - 2s)")
    else:
        print("🔴 Performance: VERY SLOW (> 2s)")
    
    return avg_time

if __name__ == "__main__":
    test_api_performance()