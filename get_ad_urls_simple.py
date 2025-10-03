import requests
import json
import sys

def extract_ad_urls(data, ad_id):
    """Extract URLs from the ad with matching archive ID"""
    urls = {
        'video_urls': [],
        'image_urls': [],
        'link_urls': [],
        'profile_urls': []
    }
    
    try:
        # Navigate to collation results
        ad_cards = data.get('data', {}).get('ad_library_main', {}).get('collation_results', {}).get('ad_cards', [])
        
        for result in ad_cards:
            # Only process the ad with matching archive ID
            if result.get('ad_archive_id') != ad_id:
                continue
                
            snapshot = result.get('snapshot', {})
            
            # Extract page profile URLs
            if snapshot.get('page_profile_uri'):
                urls['profile_urls'].append(snapshot['page_profile_uri'])
            if snapshot.get('page_profile_picture_url'):
                urls['image_urls'].append(snapshot['page_profile_picture_url'])
            
            # Extract from cards
            cards = snapshot.get('cards', [])
            for card in cards:
                # Video URLs
                for key in ['video_hd_url', 'video_sd_url', 'watermarked_video_hd_url', 'watermarked_video_sd_url']:
                    if card.get(key):
                        urls['video_urls'].append(card[key])
                
                if card.get('video_preview_image_url'):
                    urls['image_urls'].append(card['video_preview_image_url'])
                
                # Image URLs
                for key in ['original_image_url', 'resized_image_url', 'watermarked_resized_image_url']:
                    if card.get(key):
                        urls['image_urls'].append(card[key])
                
                # Link URLs
                if card.get('link_url'):
                    urls['link_urls'].append(card['link_url'])
            
            # Extract extra images
            extra_images = snapshot.get('extra_images', [])
            for img in extra_images:
                for key in ['original_image_url', 'resized_image_url', 'watermarked_resized_image_url']:
                    if img.get(key):
                        urls['image_urls'].append(img[key])
            
            # Extract extra links
            extra_links = snapshot.get('extra_links', [])
            for link in extra_links:
                urls['link_urls'].append(link)
        
        # Remove duplicates
        for key in urls:
            urls[key] = list(set(urls[key]))
            
    except Exception as e:
        print(f"Error parsing JSON: {e}")
    
    return urls


def get_collation_id_from_url_id(session, url_id):
    """Get the collation group ID by querying with the URL ID"""
    search_variables = {
        "adType": "ALL",
        "activeStatus": "active",
        "audienceTimeframe": "LAST_7_DAYS",
        "bylines": [],
        "collationToken": None,
        "contentLanguages": [],
        "countries": ["AE"],
        "country": "AE",
        "deeplinkAdID": url_id,
        "isAboutTab": False,
        "isAudienceTab": False,
        "isLandingPage": False,
        "isTargetedCountry": False,
        "hasDeeplinkAdID": False,
        "location": None,
        "mediaType": "all",
        "multiCountryFilterMode": None,
        "pageIDs": [],
        "potentialReachInput": None,
        "publisherPlatforms": [],
        "queryString": "",
        "regions": None,
        "searchType": "page",
        "sessionID": "46780b7e-d885-4199-a60a-0970605b4bb7",
        "source": None,
        "sortData": None,
        "startDate": None,
        "fetchPageInfo": True,
        "fetchSharedDisclaimers": True,
        "viewAllPageID": "1591077094491398",
        "v": "50a00f"
    }
    
    search_data = {
        'av': '61580814203263',
        '__aaid': '0',
        '__user': '61580814203263',
        '__a': '1',
        '__req': '1',
        '__hs': '20364.HYP:comet_plat_default_pkg.2.1...0',
        'dpr': '3',
        '__ccg': 'GOOD',
        '__rev': '1027945430',
        '__s': 'jek5gm:xxczjj:bn7q6v',
        '__hsi': '7556912769966221381',
        '__dyn': '7xe6E5q9zo5ObwKBAg5S1Dxu13wqovzEeUaUco38wCwfW7oqx609vCyU4a0qa2O1Vwooa8462m0nS4oaEd86a3a0EA2C0iK1Axi2a7o2uK1LwPxe2GewbCXw8y0zEnwhE0Caazo11E2XU6-1FwLweq1Iwqo1iqwIwtU5K0UE620ui',
        '__hsdp': 's88W82tzKUDx9F28rgGt10BSFp9A449yZ1m11xPDxC4EeUpwjt2o0K1waW0J85acyUy11wno8E1Wo2FxKbw1tRwAw2R81HoR0IwRg0jrw4Yw',
        '__sjsp': 's88W82tzKUDx9F28rgGt10BSFp9A449yZ1m11xPDxC4EeUpwjt2o0K1waW0J85acwlE5S2a0uC0GoryU0nto980Ji0qSdgb8dk04SU1f8',
        '__comet_req': '94',
        'fb_dtsg': 'NAfslA9GRm6jdMlcK3o28uSnuQjjve406jWFP2BpLgwwK3mnOmtwbxw:15:1754989240',
        'jazoest': '25672',
        'lsd': 'Zsr1ngZWH9B_nGtAAx9D6A',
        '__spin_r': '1027945430',
        '__spin_b': 'trunk',
        '__spin_t': '1759480864',
        '__jssesw': '1',
        'fb_api_caller_class': 'RelayModern',
        'fb_api_req_friendly_name': 'AdLibraryFoundationRootQuery',
        'variables': json.dumps(search_variables),
        'server_timestamps': 'true',
        'doc_id': '24886996877558880'
    }
    
    print("Searching for collation group ID...")
    response = session.post('https://www.facebook.com/api/graphql/', data=search_data)
    
    if response.status_code != 200:
        print(f"Error in search: HTTP {response.status_code}")
        return None, None
    
    # Parse response to get collation_id
    collation_id = None
    ad_archive_id = None
    
    for line in response.text.split('\n'):
        line = line.strip()
        if not line:
            continue
        try:
            data_obj = json.loads(line)
            if 'data' in data_obj and 'ad_library_main' in data_obj.get('data', {}):
                search_results = data_obj['data']['ad_library_main'].get('search_results_connection', {}).get('edges', [])
                for edge in search_results:
                    for result in edge.get('node', {}).get('collated_results', []):
                        # Store first result's info
                        if not collation_id:
                            collation_id = result.get('collation_id')
                            ad_archive_id = result.get('ad_archive_id')
                        # But if we find exact match, prefer it
                        if result.get('ad_archive_id') == url_id:
                            collation_id = result.get('collation_id')
                            ad_archive_id = result.get('ad_archive_id')
                            break
                    if ad_archive_id == url_id:
                        break
            if collation_id:
                break
        except json.JSONDecodeError:
            continue
    
    return collation_id, ad_archive_id


def main(ad_id):
    # Session setup
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        'authority': 'www.facebook.com',
        'method': 'POST',
        'path': '/api/graphql/',
        'scheme': 'https',
        'accept': '*/*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'no-cache',
        'origin': 'https://www.facebook.com',
        'pragma': 'no-cache',
        'priority': 'u=1, i',
        'referer': f'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=AE&id={ad_id}&is_targeted_country=false&media_type=all&search_type=page&view_all_page_id=129923153845537',
        'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
        'sec-ch-ua-full-version-list': '"Chromium";v="140.0.0.0", "Not=A?Brand";v="24.0.0.0", "Google Chrome";v="140.0.0.0"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-model': '""',
        'sec-ch-ua-platform': '"Windows"',
        'sec-ch-ua-platform-version': '"19.0.0"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'sec-gpc': '1',
        'x-asbd-id': '359341',
        'x-fb-friendly-name': 'AdLibraryAdCollationDetailsQuery',
        'x-fb-lsd': 'Q6hTAiYWGpUdtSXgpeCRY8'
    })
    
    # Add cookies
    cookies = {
        'datr': 'yAGbaCWPi6zOT7VQESkXSWuK',
        'sb': 'yAGbaJ_fQt16AW7XW_XmEvbO',
        'ps_l': '1',
        'ps_n': '1',
        'dpr': '2.5',
        'c_user': '100093971889068',
        'b_user': '61563565160857',
        'i_user': '61580814203263',
        'presence': 'EDvF3EtimeF1759477748EuserFA21B93971889068A2EstateFDutF0CEchF_7bCC',
        'fr': '1p2qfDEgIcJZ9tNfY.AWeJTbTtvN6sBgH7qZcdyhLSTa-obOkMHeg9PHTvJuA6lFeKZf0.Bo34Xh..AAA.0.0.Bo34Xh.AWeA-BR_uhR6vkZ5Q-sftBZvb6s',
        'xs': '15%3A95G58UMOGxRf8w%3A2%3A1754989240%3A-1%3A-1%3ATIYKeXaudJhjMw%3AAcVBpprRghTo2-6DLg6rXJwYjg7vZjpuNGUncnVq_a5S',
        'wd': '505x831'
    }
    session.cookies.update(cookies)
    
    print(f"Fetching ad data for ID: {ad_id}")
    
    # Store the original ad_id we're looking for
    original_ad_id = ad_id
    
    # Get collation ID
    collation_id, actual_ad_id = get_collation_id_from_url_id(session, ad_id)
    
    if not collation_id:
        print(f"Could not find collation group for ad ID: {ad_id}")
        print("The ad might not be active or the ID might be incorrect.")
        return
    
    print(f"Found collation group ID: {collation_id}")
    if actual_ad_id:
        print(f"Found related ad in collation group: {actual_ad_id}")
    
    # Use original ad_id for extraction
    ad_id = original_ad_id
    
    print(f"Fetching detailed ad data...")
    
    # Use collation details query
    variables = {
        "collationGroupID": collation_id,
        "forwardCursor": None,
        "backwardCursor": None,
        "activeStatus": "ACTIVE",
        "adType": "ALL",
        "bylines": [],
        "countries": ["AE"],
        "location": None,
        "potentialReach": [],
        "publisherPlatforms": [],
        "regions": [],
        "sessionID": "46780b7e-d885-4199-a60a-0970605b4bb7",
        "startDate": None
    }
    
    data = {
        'av': '61580814203263',
        '__aaid': '0',
        '__user': '61580814203263',
        '__a': '1',
        '__req': 'm',
        '__hs': '20364.HYP:comet_plat_default_pkg.2.1...0',
        'dpr': '3',
        '__ccg': 'GOOD',
        '__rev': '1027945430',
        '__s': 'elyomn:fhf190:szc2ru',
        '__hsi': '7556917128977200959',
        '__dyn': '7xeUmwlECdwn8K2Wmh0no6u5U4e1Fx-ewSAwHwNw9G2S2q0_EtxG4o0B-qbwgE1EEb87C1xwEwgo9oO0n24oaEd86a3a1YwBgao6C0Mo6i588Etw8WfK1LwPxe2GewbCXwJwmE2eUlwhE2Lw6OyES0gq0K-1LwqobU3Cwr86C1nwf6Eb87u1rwGwbu1ww7Aw',
        '__hsdp': 'gSy0AcerCOx5F28CVml5AGh10BSFp9BaVA9gHgkg46bx3DxCbCBxF1C4WG1dQ9xXg1TE3vo2KwgU721iAhL4Oedy-2nxm15wywSw6OwaC6UK05ko2bo980Ji0qSdgb8dk0b6w2581f804z60exw0Sfw',
        '__sjsp': 'gSy0AcerCOx5F28CVml5AGh10BSFp9BaVA9gHgkg46bx3DxCbCBxF1C4WG1dQ9xXg1TE3vo2KwgU721iAhL48wtU9u5o4m2a3q0ra0GoryU0nto980Ji0qSdgb8dk04SU1f8',
        '__comet_req': '94',
        'fb_dtsg': 'NAfusJHUYT7nzaFokvfGXO_53KwY3Ki1Bg4A4xuqBG6qyJsTsZMevdw:15:1754989240',
        'jazoest': '25626',
        'lsd': 'Q6hTAiYWGpUdtSXgpeCRY8',
        '__spin_r': '1027945430',
        '__spin_b': 'trunk',
        '__spin_t': '1759481879',
        '__jssesw': '1',
        'fb_api_caller_class': 'RelayModern',
        'fb_api_req_friendly_name': 'AdLibraryAdCollationDetailsQuery',
        'variables': json.dumps(variables),
        'server_timestamps': 'true',
        'doc_id': '25028148233463350'
    }
    
    # Make the request
    response = session.post('https://www.facebook.com/api/graphql/', data=data)
    
    if response.status_code != 200:
        print(f"Error: HTTP {response.status_code}")
        return
    
    # Parse response
    parsed_data = None
    for line in response.text.split('\n'):
        line = line.strip()
        if not line:
            continue
        try:
            data_obj = json.loads(line)
            if 'data' in data_obj and 'ad_library_main' in data_obj.get('data', {}):
                if 'collation_results' in data_obj['data']['ad_library_main']:
                    parsed_data = data_obj
                    break
        except json.JSONDecodeError:
            continue
    
    if not parsed_data:
        print("Could not find ad data in response")
        return
    
    # Debug: Show which ads are in the response
    ad_cards = parsed_data.get('data', {}).get('ad_library_main', {}).get('collation_results', {}).get('ad_cards', [])
    print(f"\nFound {len(ad_cards)} ad(s) in collation group:")
    for card in ad_cards:
        print(f"  - ad_archive_id: {card.get('ad_archive_id')}")
    
    # Extract URLs - try exact match first
    extracted_urls = extract_ad_urls(parsed_data, ad_id)
    
    # Check if ad was found
    total_urls = sum(len(v) for v in extracted_urls.values())
    if total_urls == 0:
        # If exact match not found, extract from first ad in collation group
        print(f"\nExact ad ID {ad_id} not found in collation group.")
        if ad_cards:
            print(f"Extracting URLs from ad {ad_cards[0].get('ad_archive_id')} in the same collation group...")
            extracted_urls = extract_ad_urls(parsed_data, ad_cards[0].get('ad_archive_id'))
            ad_id = ad_cards[0].get('ad_archive_id')
            total_urls = sum(len(v) for v in extracted_urls.values())
        
        if total_urls == 0:
            print(f"\nNo URLs found.")
            print("Please verify the ad ID is correct and the ad is active.")
            return
    
    # Display results
    print(f"\n=== AD URLS FOR ID: {ad_id} ===")
    
    if extracted_urls['video_urls']:
        print(f"\n--- VIDEO URLS ({len(extracted_urls['video_urls'])}) ---")
        for url in extracted_urls['video_urls']:
            print(url)
    
    if extracted_urls['image_urls']:
        print(f"\n--- IMAGE URLS ({len(extracted_urls['image_urls'])}) ---")
        for url in extracted_urls['image_urls']:
            print(url)
    
    if extracted_urls['link_urls']:
        print(f"\n--- LINK URLS ({len(extracted_urls['link_urls'])}) ---")
        for url in extracted_urls['link_urls']:
            print(url)
    
    if extracted_urls['profile_urls']:
        print(f"\n--- PROFILE URLS ({len(extracted_urls['profile_urls'])}) ---")
        for url in extracted_urls['profile_urls']:
            print(url)
    
    # Save to JSON file
    output_file = f"ad_urls_{ad_id}.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(extracted_urls, f, indent=2, ensure_ascii=False)
    print(f"\nResults saved to: {output_file}")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python get_ad_urls_simple.py <ad_id>")
        print("Example: python get_ad_urls_simple.py 31103441552603633")
        sys.exit(1)
    
    ad_id = sys.argv[1]
    main(ad_id)
