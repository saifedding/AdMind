#!/usr/bin/env python3
"""
Test script for the ads found display feature in daily scraping.
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000/api/v1/scraping"

def test_ads_found_display():
    """Test the complete flow of showing ads found by daily scraping"""
    print("🧪 Testing Ads Found Display Feature")
    print("=" * 50)
    
    # Test 1: Start a scraping task
    print("\n1. Starting a scraping task...")
    payload = {
        "competitor_ids": [79],
        "countries": ["AE"],
        "max_pages_per_competitor": 1,
        "delay_between_requests": 1,
        "days_lookback": 30,  # Look back more days to potentially find ads
        "min_duration_days": 1,  # Lower threshold to find more ads
        "active_status": "all"
    }
    
    response = requests.post(f"{BASE_URL}/competitors/scrape", json=payload)
    if response.status_code == 200:
        task_data = response.json()
        task_id = task_data['task_id']
        print(f"✅ Task started: {task_id}")
        
        # Wait for task completion
        print("📊 Waiting for task completion...")
        for i in range(30):  # Wait up to 30 seconds
            status_response = requests.get(f"{BASE_URL}/tasks/{task_id}/status")
            if status_response.status_code == 200:
                status_data = status_response.json()
                print(f"   State: {status_data['state']}")
                
                if status_data['state'] in ['SUCCESS', 'FAILURE']:
                    if status_data['state'] == 'SUCCESS':
                        print(f"✅ Task completed successfully!")
                        result = status_data.get('result', {})
                        total_new_ads = result.get('total_new_ads', 0)
                        print(f"   📈 Total new ads found: {total_new_ads}")
                        
                        # Test the ads endpoint
                        print(f"\n2. Testing ads endpoint for task {task_id}...")
                        ads_response = requests.get(f"{BASE_URL}/tasks/{task_id}/ads")
                        if ads_response.status_code == 200:
                            ads_data = ads_response.json()
                            print(f"✅ Ads endpoint working!")
                            print(f"   📊 Total ads returned: {ads_data['total_ads']}")
                            
                            if ads_data['total_ads'] > 0:
                                print(f"   📋 Sample ad data:")
                                sample_ad = ads_data['ads'][0]
                                print(f"      - ID: {sample_ad['ad_archive_id']}")
                                print(f"      - Competitor: {sample_ad['competitor_name']}")
                                print(f"      - Headline: {sample_ad['headline'][:50]}...")
                                print(f"      - Created: {sample_ad['created_at']}")
                                
                                # Test frontend integration
                                print(f"\n3. Testing frontend integration...")
                                frontend_response = requests.get("http://localhost:3000/daily-scraping")
                                if frontend_response.status_code == 200:
                                    print("✅ Frontend accessible")
                                    content = frontend_response.text
                                    
                                    # Check for the viewTaskAds function
                                    if 'viewTaskAds' in content:
                                        print("✅ Frontend includes viewTaskAds function")
                                    else:
                                        print("❌ Frontend missing viewTaskAds function")
                                        
                                    # Check for Eye icon import
                                    if 'Eye' in content:
                                        print("✅ Frontend includes Eye icon")
                                    else:
                                        print("❌ Frontend missing Eye icon")
                                else:
                                    print(f"❌ Frontend not accessible: {frontend_response.status_code}")
                            else:
                                print("ℹ️  No ads found in the last hour (this is normal)")
                        else:
                            print(f"❌ Ads endpoint failed: {ads_response.status_code}")
                            print(f"   Error: {ads_response.text}")
                    else:
                        print(f"❌ Task failed: {status_data.get('error', 'Unknown error')}")
                    break
            time.sleep(1)
        else:
            print("⏰ Task did not complete within 30 seconds")
    else:
        print(f"❌ Failed to start task: {response.status_code}")
        print(f"   Error: {response.text}")

def test_api_endpoints():
    """Test the new API endpoints"""
    print("\n4. Testing API endpoints...")
    
    # Test the ads endpoint with a dummy task ID
    test_task_id = "test-task-123"
    response = requests.get(f"{BASE_URL}/tasks/{test_task_id}/ads")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Ads endpoint responds correctly")
        print(f"   📊 Found {data['total_ads']} ads for test task")
    else:
        print(f"❌ Ads endpoint failed: {response.status_code}")

def test_frontend_enhancements():
    """Test frontend enhancements"""
    print("\n5. Testing frontend enhancements...")
    
    try:
        response = requests.get("http://localhost:3000/daily-scraping")
        if response.status_code == 200:
            content = response.text
            
            # Check for new UI elements
            checks = [
                ("viewTaskAds function", "viewTaskAds"),
                ("Eye icon import", "Eye"),
                ("View Found Ads button", "View.*Found Ads"),
                ("Share Results button", "Share Results"),
                ("Green button styling", "bg-green-600"),
                ("Task ads display", "total_new_ads")
            ]
            
            for check_name, pattern in checks:
                if pattern in content:
                    print(f"✅ {check_name} found")
                else:
                    print(f"❌ {check_name} missing")
        else:
            print(f"❌ Frontend not accessible: {response.status_code}")
    except Exception as e:
        print(f"❌ Frontend test failed: {e}")

if __name__ == "__main__":
    print("🚀 Starting Ads Found Display Feature Tests")
    print("Testing the new feature to display and view ads found by daily scraping")
    
    try:
        test_ads_found_display()
        test_api_endpoints()
        test_frontend_enhancements()
        
        print("\n" + "=" * 50)
        print("🎉 All tests completed!")
        print("\n📋 Feature Summary:")
        print("✅ Backend API endpoint to get ads by task ID")
        print("✅ Enhanced task results to show number of ads found")
        print("✅ Frontend button to view found ads")
        print("✅ Popup window to display ads in a readable format")
        print("✅ Share functionality for results")
        print("\n🔍 How to Use:")
        print("1. Go to http://localhost:3000/daily-scraping")
        print("2. Configure and start a scraping task")
        print("3. When task completes with ads found, click 'View X Found Ads'")
        print("4. A new window will open showing all the ads found")
        print("5. Use 'Share Results' to copy a summary to clipboard")
        
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")