#!/usr/bin/env python3

import requests
import json

def test_search_api():
    """Test the search API to verify page names are working"""
    try:
        response = requests.post('http://localhost:8000/api/v1/ads/library/search', 
            json={
                'query_string': 'damac',
                'countries': ['AE'],
                'active_status': 'active',
                'media_type': 'all',
                'max_pages': 1,
                'save_to_database': False
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f'✅ Search API working: Found {data["total_ads_found"]} ads')
            
            if data.get('ads_preview'):
                first_ad = data['ads_preview'][0]
                advertiser = first_ad.get('advertiser', 'Unknown')
                page_name = first_ad.get('meta', {}).get('page_name', 'Unknown')
                
                print(f'✅ Page names working:')
                print(f'   - Advertiser: "{advertiser}"')
                print(f'   - Page name: "{page_name}"')
                
                # Check if any page names are "Unknown"
                unknown_count = sum(1 for ad in data['ads_preview'] 
                                  if ad.get('advertiser') == 'Unknown' or 
                                     ad.get('meta', {}).get('page_name') == 'Unknown')
                
                if unknown_count == 0:
                    print(f'✅ All page names extracted successfully!')
                else:
                    print(f'⚠️  {unknown_count} ads have unknown page names')
            else:
                print('❌ No ads found in preview')
        else:
            print(f'❌ API Error: {response.status_code} - {response.text}')
            
    except Exception as e:
        print(f'❌ Test failed: {e}')

if __name__ == '__main__':
    test_search_api()