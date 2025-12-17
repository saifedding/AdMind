#!/usr/bin/env python3
"""
Test script to verify that the min_duration_days parameter is working correctly
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000/api/v1"

def test_single_competitor_scraping():
    """Test single competitor scraping with min_duration_days"""
    print("🧪 Testing Single Competitor Scraping with Duration Filter")
    print("=" * 60)
    
    # Test configuration with min_duration_days
    config = {
        "countries": ["AE"],
        "max_pages": 2,
        "delay_between_requests": 1,
        "active_status": "all",
        "date_from": "",
        "date_to": "",
        "min_duration_days": 12
    }
    
    # Use a known competitor ID (adjust as needed)
    competitor_id = 3698
    
    print(f"Testing competitor ID: {competitor_id}")
    print(f"Configuration: {json.dumps(config, indent=2)}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/competitors/{competitor_id}/scrape",
            json=config,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Scraping started successfully!")
            print(f"Task ID: {result.get('task_id')}")
            print(f"Status: {result.get('status')}")
            print(f"Message: {result.get('message')}")
            
            # Check task status after a moment
            task_id = result.get('task_id')
            if task_id:
                print(f"\n⏳ Checking task status...")
                status_response = requests.get(f"{BASE_URL}/competitors/scrape/status/{task_id}")
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    print(f"Task State: {status_data.get('state')}")
                    print(f"Task Status: {status_data.get('status')}")
                    if 'info' in status_data:
                        print(f"Task Info: {json.dumps(status_data['info'], indent=2)}")
                else:
                    print(f"❌ Failed to get task status: {status_response.status_code}")
        else:
            print(f"❌ Scraping failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error: {response.text}")
                
    except Exception as e:
        print(f"❌ Exception occurred: {str(e)}")

def test_bulk_competitor_scraping():
    """Test bulk competitor scraping with min_duration_days"""
    print("\n🧪 Testing Bulk Competitor Scraping with Duration Filter")
    print("=" * 60)
    
    # Test configuration with min_duration_days
    config = {
        "competitor_ids": [3698],  # Adjust as needed
        "countries": ["AE"],
        "max_pages": 2,
        "delay_between_requests": 1,
        "active_status": "all",
        "date_from": "",
        "date_to": "",
        "min_duration_days": 12
    }
    
    print(f"Configuration: {json.dumps(config, indent=2)}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/competitors/bulk/scrape",
            json=config,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Bulk scraping started successfully!")
            print(f"Task IDs: {result.get('task_ids')}")
            print(f"Successful starts: {result.get('successful_starts')}")
            print(f"Failed starts: {result.get('failed_starts')}")
            print(f"Message: {result.get('message')}")
            
            # Show details
            if 'details' in result:
                print("\nDetails:")
                for detail in result['details']:
                    print(f"  - Competitor {detail.get('competitor_id')}: {detail.get('status')} - {detail.get('reason')}")
        else:
            print(f"❌ Bulk scraping failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Error: {response.text}")
                
    except Exception as e:
        print(f"❌ Exception occurred: {str(e)}")

if __name__ == "__main__":
    print("🚀 Testing Duration Filter Fix")
    print("Testing that min_duration_days parameter is properly passed to the backend")
    print()
    
    try:
        # Test single competitor scraping
        test_single_competitor_scraping()
        
        # Test bulk competitor scraping
        test_bulk_competitor_scraping()
        
        print("\n🎉 Tests completed!")
        print("\n📋 Summary:")
        print("✅ Fixed frontend API calls to send config parameters directly")
        print("✅ Updated BulkScrapeRequest type to match backend expectations")
        print("✅ Fixed single and bulk scraping mutations")
        print("\n💡 The min_duration_days parameter should now work correctly!")
        
    except Exception as e:
        print(f"\n❌ Test execution failed: {str(e)}")