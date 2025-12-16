#!/usr/bin/env python3
"""
Performance test script to measure API response times.
"""

import requests
import time
import statistics
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

def measure_response_time(url, params=None, iterations=5):
    """Measure average response time for an endpoint."""
    times = []
    
    for i in range(iterations):
        start_time = time.time()
        try:
            response = requests.get(url, params=params, timeout=30)
            end_time = time.time()
            
            if response.status_code == 200:
                response_time = (end_time - start_time) * 1000  # Convert to milliseconds
                times.append(response_time)
                print(f"  Iteration {i+1}: {response_time:.0f}ms")
            else:
                print(f"  Iteration {i+1}: Error {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"  Iteration {i+1}: Request failed - {e}")
    
    if times:
        avg_time = statistics.mean(times)
        min_time = min(times)
        max_time = max(times)
        return {
            'average': avg_time,
            'min': min_time,
            'max': max_time,
            'count': len(times)
        }
    return None

def test_ads_endpoint_performance():
    """Test the performance of the /ads endpoint with various scenarios."""
    
    print("🚀 Performance Testing - Ads API")
    print("=" * 50)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    test_cases = [
        {
            "name": "Basic Load (24 ads, default sort)",
            "params": {"page": 1, "page_size": 24, "sort_by": "created_at", "sort_order": "desc"}
        },
        {
            "name": "Large Page (50 ads)",
            "params": {"page": 1, "page_size": 50, "sort_by": "created_at", "sort_order": "desc"}
        },
        {
            "name": "Score Sorting (Overall Score)",
            "params": {"page": 1, "page_size": 24, "sort_by": "overall_score", "sort_order": "desc"}
        },
        {
            "name": "Duration Sorting",
            "params": {"page": 1, "page_size": 24, "sort_by": "duration_days", "sort_order": "desc"}
        },
        {
            "name": "Filtered by Competitor",
            "params": {"page": 1, "page_size": 24, "competitor_id": 1}
        },
        {
            "name": "Filtered by Active Status",
            "params": {"page": 1, "page_size": 24, "is_active": True}
        },
        {
            "name": "Filtered by Favorites",
            "params": {"page": 1, "page_size": 24, "is_favorite": True}
        },
        {
            "name": "Search Query",
            "params": {"page": 1, "page_size": 24, "search": "real estate"}
        },
        {
            "name": "Multiple Filters",
            "params": {
                "page": 1, 
                "page_size": 24, 
                "is_active": True, 
                "min_overall_score": 5,
                "sort_by": "overall_score",
                "sort_order": "desc"
            }
        }
    ]
    
    results = []
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"{i}. Testing: {test_case['name']}")
        
        result = measure_response_time(
            f"{BASE_URL}/ads", 
            params=test_case['params'],
            iterations=3  # Reduced iterations for faster testing
        )
        
        if result:
            results.append({
                'name': test_case['name'],
                'average': result['average'],
                'min': result['min'],
                'max': result['max']
            })
            
            print(f"  ✅ Average: {result['average']:.0f}ms (min: {result['min']:.0f}ms, max: {result['max']:.0f}ms)")
            
            # Performance assessment
            if result['average'] < 200:
                print(f"  🟢 Excellent performance!")
            elif result['average'] < 500:
                print(f"  🟡 Good performance")
            elif result['average'] < 1000:
                print(f"  🟠 Acceptable performance")
            else:
                print(f"  🔴 Needs optimization")
        else:
            print(f"  ❌ Test failed")
        
        print()
        time.sleep(0.5)  # Brief pause between tests
    
    # Summary
    print("📊 Performance Summary")
    print("-" * 30)
    
    if results:
        all_times = [r['average'] for r in results]
        overall_avg = statistics.mean(all_times)
        
        print(f"Overall Average: {overall_avg:.0f}ms")
        print(f"Best Performance: {min(all_times):.0f}ms")
        print(f"Worst Performance: {max(all_times):.0f}ms")
        print()
        
        # Performance targets
        excellent = sum(1 for t in all_times if t < 200)
        good = sum(1 for t in all_times if 200 <= t < 500)
        acceptable = sum(1 for t in all_times if 500 <= t < 1000)
        poor = sum(1 for t in all_times if t >= 1000)
        
        print("Performance Distribution:")
        print(f"  🟢 Excellent (<200ms): {excellent}/{len(results)}")
        print(f"  🟡 Good (200-500ms): {good}/{len(results)}")
        print(f"  🟠 Acceptable (500-1000ms): {acceptable}/{len(results)}")
        print(f"  🔴 Poor (>1000ms): {poor}/{len(results)}")
        
        if overall_avg < 300:
            print("\n🎉 Overall performance is excellent!")
        elif overall_avg < 600:
            print("\n👍 Overall performance is good!")
        else:
            print("\n⚠️  Performance needs improvement. Check the optimization guide.")
    
    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    test_ads_endpoint_performance()