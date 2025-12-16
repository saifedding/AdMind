#!/usr/bin/env python3

import time
import requests
import json
from statistics import mean, median

def test_frontend_simulation():
    """
    Simulate the exact request that the frontend makes, including headers
    """
    
    url = "http://localhost:8000/api/v1/ads"
    params = {
        "page": 1,
        "page_size": 24,
        "sort_by": "created_at",
        "sort_order": "desc"
    }
    
    # Exact headers that the frontend sends
    headers = {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        "sec-ch-ua": '"Brave";v="143", "Chromium";v="143", "Not A(Brand)";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "sec-gpc": "1"
    }
    
    print("🔍 Frontend Simulation Test")
    print(f"URL: {url}")
    print(f"Params: {params}")
    print(f"Headers: {len(headers)} headers")
    print("-" * 60)
    
    response_times = []
    response_sizes = []
    
    # Run multiple tests
    for i in range(10):
        print(f"Test {i+1}/10: ", end="", flush=True)
        
        start_time = time.time()
        try:
            response = requests.get(
                url, 
                params=params, 
                headers=headers, 
                timeout=30
            )
            end_time = time.time()
            
            response_time = (end_time - start_time) * 1000  # Convert to milliseconds
            response_times.append(response_time)
            
            if response.status_code == 200:
                data = response.json()
                response_size = len(response.content)
                response_sizes.append(response_size)
                
                total_items = data.get('pagination', {}).get('total_items', 0)
                returned_items = len(data.get('data', []))
                
                print(f"{response_time:.0f}ms ✅ ({response_size/1024:.1f}KB, {returned_items}/{total_items} items)")
                
                # Analyze first response in detail
                if i == 0:
                    print(f"   📊 First response analysis:")
                    print(f"   - Response size: {response_size/1024:.1f} KB")
                    print(f"   - Items returned: {returned_items}")
                    print(f"   - Avg size per item: {response_size/returned_items/1024:.2f} KB")
                    
                    # Check for heavy fields
                    if data.get('data') and len(data['data']) > 0:
                        first_ad = data['data'][0]
                        heavy_fields = []
                        
                        for field, value in first_ad.items():
                            if isinstance(value, (dict, list)):
                                field_size = len(json.dumps(value))
                                if field_size > 1000:  # > 1KB
                                    heavy_fields.append(f"{field}: {field_size/1024:.1f}KB")
                        
                        if heavy_fields:
                            print(f"   - Heavy fields: {', '.join(heavy_fields)}")
                
            else:
                print(f"{response_time:.0f}ms ❌ (HTTP {response.status_code})")
                
        except Exception as e:
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            print(f"{response_time:.0f}ms ❌ (Error: {str(e)})")
            response_times.append(response_time)
    
    print("-" * 60)
    print("📊 Performance Results:")
    print(f"Average: {mean(response_times):.0f}ms")
    print(f"Median:  {median(response_times):.0f}ms")
    print(f"Min:     {min(response_times):.0f}ms")
    print(f"Max:     {max(response_times):.0f}ms")
    
    if response_sizes:
        print(f"Avg Response Size: {mean(response_sizes)/1024:.1f} KB")
    
    # Performance analysis
    avg_time = mean(response_times)
    if avg_time < 100:
        print("🟢 Performance: EXCELLENT (< 100ms)")
    elif avg_time < 500:
        print("🟡 Performance: GOOD (100ms - 500ms)")
    elif avg_time < 2000:
        print("🟠 Performance: SLOW (500ms - 2s)")
    else:
        print("🔴 Performance: VERY SLOW (> 2s)")
    
    # Compare with frontend timing
    print("\n🔍 Frontend vs Backend Comparison:")
    print(f"Backend (this test): {avg_time:.0f}ms")
    print(f"Frontend (browser):  ~3500ms")
    print(f"Difference:          {3500 - avg_time:.0f}ms")
    
    if 3500 - avg_time > 2000:
        print("\n💡 Analysis: The delay is NOT in the backend!")
        print("   Likely causes:")
        print("   - Browser CORS preflight requests")
        print("   - Frontend JavaScript processing")
        print("   - React component rendering")
        print("   - Network latency/throttling")
        print("   - Browser DevTools overhead")
    
    return avg_time

def test_different_page_sizes():
    """Test different page sizes to see if it's data volume related"""
    
    print("\n🔍 Testing Different Page Sizes")
    print("-" * 40)
    
    page_sizes = [1, 5, 10, 24, 50, 100]
    
    for page_size in page_sizes:
        start_time = time.time()
        try:
            response = requests.get(
                "http://localhost:8000/api/v1/ads",
                params={"page": 1, "page_size": page_size, "sort_by": "created_at", "sort_order": "desc"},
                headers={"content-type": "application/json"},
                timeout=30
            )
            end_time = time.time()
            
            response_time = (end_time - start_time) * 1000
            
            if response.status_code == 200:
                data = response.json()
                response_size = len(response.content)
                returned_items = len(data.get('data', []))
                
                print(f"Page size {page_size:3d}: {response_time:6.0f}ms ({response_size/1024:5.1f}KB, {returned_items} items)")
            else:
                print(f"Page size {page_size:3d}: {response_time:6.0f}ms ❌ (HTTP {response.status_code})")
                
        except Exception as e:
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            print(f"Page size {page_size:3d}: {response_time:6.0f}ms ❌ (Error: {str(e)})")

if __name__ == "__main__":
    test_frontend_simulation()
    test_different_page_sizes()