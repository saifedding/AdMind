import requests
import json
import csv
import time
import uuid
from urllib.parse import urlencode, quote
from datetime import datetime

# ==============================================================================
# SCRIPT CONFIGURATION
# ==============================================================================
#
# To keep this script working, you may need to update the session-related
# values below. You can get these by inspecting the network requests in your
# browser's developer tools when browsing the Facebook Ad Library.
#
# 1. Open the Ad Library in a new browser tab.
# 2. Open the Developer Tools (F12) and go to the "Network" tab.
# 3. Perform a search for an advertiser.
# 4. Find the 'graphql' request, right-click it, and copy the cookie string
#    and other relevant values like 'lsd' and 'jazoest'.
#
# ==============================================================================

# Configurable parameters
config = {
    # --- Ad search parameters ---
    'active_status': 'active',  # Options: 'active', 'inactive', 'all'
    'ad_type': 'ALL',  # Options: 'ALL', 'POLITICAL_AND_ISSUE_ADS', etc.
    'countries': ['AE'],  # Country codes, e.g., ['AE', 'US', 'GB']
    'search_type': 'page',  # Options: 'page', 'advertiser'
    'media_type': 'all',  # Options: 'all', 'image', 'video', 'carousel'
    'start_date': None,  # Format: 'YYYY-MM-DD' or None
    'end_date': None,  # Format: 'YYYY-MM-DD' or None
    'query_string': '',  # Search query
    'page_ids': [],  # Specific page IDs to search
    'view_all_page_id': '1591077094491398',  # The page ID being viewed
    'cursor': None,  # Will be updated automatically for pagination
    'first': 5,  # Number of results per page
    'is_targeted_country': False,

    # --- Session parameters ---
    'search_session_id': '2937f803-041c-481d-b565-81ae712d5209',
    'search_collation_token': 'e658a77b-bce9-4255-9f7d-4694ed051025',
    'enrich_session_id': f'c54459e7-a1e1-4229-abff-702b9e3d{uuid.uuid4().hex[:4]}',
    'lsd_token': 'AVq28ysAAt0',
    'jazoest': '2900',
    'cookie': 'datr=n14YaOmLyHCUO9eDBSPbd0bo; sb=n14YaN0pXid7MQ54q1q9-XHz; ps_l=1; ps_n=1; dpr=2.5; fr=1vnX3O3Y99uUSRWaj.AWchuA7IeOh24kEy8WvwbrIwUUScHnrL8m0ga2ev4Py-aNisJdM.BoaRgt..AAA.0.0.BoaRgt.AWcCsNYL2f427xwHLtWS3CN2SlU; wd=891x831',

    # --- Dynamic payload components ---
    # These are complex, JS-generated values from Facebook's internal API.
    # They may need to be updated if the script stops working.
    'search_payload_dyn': '7xeUmwlECdwn8K2Wmh0no6u5U4e1Fx-ewSAwHwNw9G2S2q0_EtxG4o0B-qbwgE1EEb87C1xwEwgo9oO0n24oaEd86a3a1YwBgao6C0Mo6i588Etw8WfK1LwPxe2GewbCXwJwmEtwse5o4q0HU1IEGdw46wbLwrU6C2-0VE6O1Fw59G2O1TwmU3ywo8',
    'search_payload_csr': 'htOh24lsOWjORb9uQAheC8KVpaGuHGF8GBx2UKp2qzVUiCBxm6GwTBwBwFBx216G15whrx6482TKEuzU8E6aUdU2qwgo8E7jwsE1BU2axy0RUkxC8w4dwTw10K0aswOU02yHyE07_h00iVE04IK06ofwbG00ymQ032q03TN1i0bQw35E0Gq09pw6Yg0OG',
    'search_payload_hsdp': 'ggPhf5icj4pbiO0KgG1awwwCpoaoKGCQb81lw8mq4nQ1kwyw2xo4t08uE33hWvN5eE-293Q4827wJwc-q0mm1qwQw8e0abDg1dE3pw6kw86UB08217w1la085w0JTw0Rzw0tk8',
    'search_payload_hblp': '03280oFw36o0OK0k6U1Ko0nqw2hEnw0Jvw2BE4e0se06ro0Bq02y20eCg0OW0WE15E1xUjw70wbm0XE5q7E0juwRw',

    # --- Pagination and delay settings ---
    'max_pages': 1,  # Maximum number of pages to fetch (set to None for unlimited)
    'delay_between_page_requests': 1,  # Delay in seconds between fetching pages
    'delay_between_enrich_requests': 2, # Delay in seconds between enriching ads

    # --- Output settings ---
    'output_file': 'facebook_ads_data_enhanced.csv',
    'save_json': True,  # Save raw JSON from the search and enrichment calls

    'enrich_payload_dyn': '7xeUmwlECdwn8K2Wmh0no6u5U4e1Fx-ewSAwHwNw9G2S2q0_EtxG4o0B-qbwgE1EEb87C1xwEwgo9oO0n24oaEd86a3a1YwBgao6C0Mo6i588Etw8WfK1LwPxe2GewbCXwJwmEtwse5o4q0HU1IEGdw46wbLwrU6C2-0VE6O1Fw59G2O1TwmU3ywo8',
    'enrich_payload_csr': 'hG5hBVHTvmWKKW9kyIDhAaAGmBmKFFiuHzFQdLSUrAG4FA4aBxC7HxCUeEaUbo7mbwwy8hCwjE8XwEwZx24ocU3XxyE2ZU8827wBxe6UpwhUnwdy3u0h-1AwpU0zq3G7o3Rw1-q3eFo09Oo04D200ES401cYw0hV802mAg04iy011fo0Aa0ma0c6w1Y-0PE',
    'enrich_payload_hsdp': 'ggEkw_5uOJqg9A2J1i2K5E9S6UrpqCAqw_w9acyCXV82iw2w8eQ1BBwdixoJ6ZxeiEydga87m360ZE18EdUe828w1hC641hwQw2qU2YWzbw1au0vy0xo0d_80rBw0mCo',
    'enrich_payload_hblp': '03680oPw3jU0hiBz80Q-0btw2Fo1bo0e5E6K08Hw5Uw2rU3gw0TMwpE2eg22wCwba3S0x83HwmU0C-0tC0aHwv8',
    'enrich_payload_fb_dtsg': 'NAfvEUM0b95UpqLSZvp0ZHIC-yBfoJKQMhpV4cGQR-mXlNjkHUlnj1w%3A17%3A1750148998',
}

def build_variables(config):
    """Build the variables JSON object from config"""
    variables = {
        "activeStatus": config['active_status'],
        "adType": config['ad_type'],
        "bylines": [],
        "collationToken": config['search_collation_token'],
        "contentLanguages": [],
        "countries": config['countries'],
        "cursor": config['cursor'],
        "excludedIDs": None,
        "first": config['first'],
        "isTargetedCountry": config['is_targeted_country'],
        "location": None,
        "mediaType": config['media_type'],
        "multiCountryFilterMode": None,
        "pageIDs": config['page_ids'],
        "potentialReachInput": None,
        "publisherPlatforms": [],
        "queryString": config['query_string'],
        "regions": None,
        "searchType": config['search_type'],
        "sessionID": config['search_session_id'],
        "sortData": None,
        "source": None,
        "startDate": config['start_date'],
        "v": "608791",
        "viewAllPageID": config['view_all_page_id']
    }
    return json.dumps(variables, separators=(',', ':'))

def build_dynamic_payload(config):
    """Build payload with dynamic variables while keeping original structure"""
    # Build the variables JSON
    variables = {
        "activeStatus": config['active_status'],
        "adType": config['ad_type'],
        "bylines": [],
        "collationToken": config['search_collation_token'],
        "contentLanguages": [],
        "countries": config['countries'],
        "cursor": config['cursor'],
        "excludedIDs": None,
        "first": config['first'],
        "isTargetedCountry": config['is_targeted_country'],
        "location": None,
        "mediaType": config['media_type'],
        "multiCountryFilterMode": None,
        "pageIDs": config['page_ids'],
        "potentialReachInput": None,
        "publisherPlatforms": [],
        "queryString": config['query_string'],
        "regions": None,
        "searchType": config['search_type'],
        "sessionID": config['search_session_id'],
        "sortData": None,
        "source": None,
        "startDate": config['start_date'],
        "v": "608791",
        "viewAllPageID": config['view_all_page_id']
    }
    
    # Convert to JSON and URL encode
    variables_json = json.dumps(variables, separators=(',', ':'))
    
    # Build the complete payload keeping original structure
    payload = (
        f"av=0&__aaid=0&__user=0&__a=1&__req=a&__hs=20275.HYP%3Acomet_plat_default_pkg.2.1...0&dpr=3&"
        f"__ccg=GOOD&__rev=1024475506&__s=oeivzd%3Aa1ohcs%3A7a3kxu&__hsi=7524059447383386224&"
        f"__dyn={config['search_payload_dyn']}&"
        f"__csr={config['search_payload_csr']}&"
        f"__hsdp={config['search_payload_hsdp']}&"
        f"__hblp={config['search_payload_hblp']}&"
        f"__comet_req=94&lsd={config['lsd_token']}&jazoest={config['jazoest']}&__spin_r=1024475506&__spin_b=trunk&__spin_t=1751831604&"
        f"__jssesw=1&fb_api_caller_class=RelayModern&fb_api_req_friendly_name=AdLibrarySearchPaginationQuery&"
        f"variables={quote(variables_json)}&server_timestamps=true&doc_id=24394279933540792"
    )
    
    return payload

def build_referer_url(config):
    """Build the referer URL based on config"""
    params = {
        'active_status': config['active_status'],
        'ad_type': 'all',
        'country': ','.join(config['countries']),
        'is_targeted_country': str(config['is_targeted_country']).lower(),
        'media_type': config['media_type'],
        'search_type': config['search_type'],
        'view_all_page_id': config['view_all_page_id']
    }
    
    if config['query_string']:
        params['q'] = config['query_string']
    
    query_string = urlencode(params)
    return f"https://www.facebook.com/ads/library/?{query_string}"

def build_enrich_variables(ad_row):
    """Build the variables JSON object for the enrichment call"""
    # The API seems to require a single country.
    country = ad_row.get('targeted_countries', 'DE').split(',')[0].strip()
    if not country:
        country = 'DE' # Default if no country is found

    variables = {
        "adArchiveID": ad_row.get('ad_archive_id'),
        "pageID": ad_row.get('page_id'),
        "country": country,
        "sessionID": config['enrich_session_id'],
        "source": None,
        "isAdNonPolitical": True,
        "isAdNotAAAEligible": False,
        "__relay_internal__pv__AdLibraryFinservGraphQLGKrelayprovider": True,
    }
    return json.dumps(variables)

def build_enrich_payload(variables_json):
    """Build the payload for the enrichment API call"""
    variables_encoded = quote(variables_json)
    payload = (
        f"av=0&__aaid=0&__user=0&__a=1&__req=k&"
        f"__hs=20274.HYP%3Acomet_plat_default_pkg.2.1...0&dpr=3&__ccg=GOOD&"
        f"__rev=1024465016&__s=qvzxd9%3Awl4usx%3Awj3js9&__hsi=7523555755601580308&"
        f"__dyn={config['enrich_payload_dyn']}&"
        f"__csr={config['enrich_payload_csr']}&"
        f"__hsdp={config['enrich_payload_hsdp']}&"
        f"__hblp={config['enrich_payload_hblp']}&"
        f"__comet_req=94&fb_dtsg={config['enrich_payload_fb_dtsg']}&"
        f"jazoest={config['jazoest']}&lsd={config['lsd_token']}&__spin_r=1024465016&__spin_b=trunk&"
        f"__spin_t=1751714329&__jssesw=1&fb_api_caller_class=RelayModern&"
        f"fb_api_req_friendly_name=AdLibraryAdDetailsV2Query&variables={variables_encoded}&"
        f"server_timestamps=true&doc_id=9733039173461088"
    )
    return payload

def build_enrich_referer_url(ad_row):
    """Build the referer URL for the enrichment call"""
    country = ad_row.get('targeted_countries', 'DE').split(',')[0].strip()
    if not country:
        country = 'DE'
    params = {
        'active_status': 'active',
        'ad_type': 'all',
        'country': country,
        'is_targeted_country': 'false',
        'media_type': 'all',
        'search_type': 'page',
        'view_all_page_id': ad_row.get('page_id')
    }
    query_string = urlencode(params)
    return f"https://www.facebook.com/ads/library/?{query_string}"

def fetch_ad_details(ad_row):
    """Fetch detailed data for a single ad."""
    url = "https://www.facebook.com/api/graphql/"
    variables_json = build_enrich_variables(ad_row)
    payload = build_enrich_payload(variables_json)
    referer_url = build_enrich_referer_url(ad_row)
    headers = {
        'authority': 'www.facebook.com',
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/x-www-form-urlencoded',
        'origin': 'https://www.facebook.com',
        'priority': 'u=1, i',
        'referer': referer_url,
        'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'sec-gpc': '1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'x-asbd-id': '359341',
        'x-fb-friendly-name': 'AdLibraryAdDetailsV2Query',
        'x-fb-lsd': config['lsd_token'],
        'Cookie': config['cookie']
    }
    response = None
    try:
        response = requests.post(url, headers=headers, data=payload)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Request error during enrichment for ad {ad_row.get('ad_archive_id')}: {e}")
        if response is not None:
            print(f"Status Code: {response.status_code}")
            print(f"Response Text: {response.text}")
        return None
    except json.JSONDecodeError as e:
        print(f"JSON decode error during enrichment for ad {ad_row.get('ad_archive_id')}: {e}")
        if response is not None:
            print(f"Response Text: {response.text}")
        return None

def extract_enrichment_data(response_data):
    """Extracts the relevant ad details from the enrichment response."""
    if not response_data or 'data' not in response_data:
        return {}
    try:
        ad_details = response_data['data']['ad_library_ad_details_v2']['ad_library_ad']
        return ad_details
    except KeyError:
        return response_data.get('data', {})

def extract_ad_data(collated_result):
    """Extract relevant data from a single ad result"""
    snapshot = collated_result.get('snapshot', {})
    
    # Extract basic info
    ad_data = {
        'ad_archive_id': collated_result.get('ad_archive_id', ''),
        'page_id': collated_result.get('page_id', ''),
        'page_name': snapshot.get('page_name', ''),
        'collation_id': collated_result.get('collation_id', ''),
        'collation_count': collated_result.get('collation_count', ''),
        'is_active': collated_result.get('is_active', ''),
        'start_date': collated_result.get('start_date', ''),
        'end_date': collated_result.get('end_date', ''),
        'currency': collated_result.get('currency', ''),
        'spend': collated_result.get('spend', ''),
        'impressions_text': collated_result.get('impressions_with_index', {}).get('impressions_text', ''),
        'impressions_index': collated_result.get('impressions_with_index', {}).get('impressions_index', ''),
        'publisher_platforms': ', '.join(collated_result.get('publisher_platform', [])),
        'display_format': snapshot.get('display_format', ''),
        'page_like_count': snapshot.get('page_like_count', ''),
        'page_categories': ', '.join(snapshot.get('page_categories', [])),
        'page_profile_uri': snapshot.get('page_profile_uri', ''),
        'page_profile_picture_url': snapshot.get('page_profile_picture_url', ''),
        'targeted_countries': ', '.join(collated_result.get('targeted_or_reached_countries', [])),
        'contains_sensitive_content': collated_result.get('contains_sensitive_content', ''),
        'contains_digital_created_media': collated_result.get('contains_digital_created_media', ''),
    }
    
    # Extract main ad content details
    ad_data['main_title'] = snapshot.get('title', '')
    ad_data['main_body_text'] = snapshot.get('body', {}).get('text', '')
    ad_data['main_caption'] = snapshot.get('caption', '')
    ad_data['main_cta_text'] = snapshot.get('cta_text', '')
    ad_data['main_cta_type'] = snapshot.get('cta_type', '')
    ad_data['main_link_url'] = snapshot.get('link_url', '')
    ad_data['main_link_description'] = snapshot.get('link_description', '')
    
    # Detect main ad media type
    main_has_images = bool(snapshot.get('images', []))
    main_has_videos = bool(snapshot.get('videos', []))
    main_has_cards = bool(snapshot.get('cards', []))
    
    if main_has_cards:
        ad_data['main_media_type'] = 'carousel'
    elif main_has_videos:
        ad_data['main_media_type'] = 'video'
    elif main_has_images:
        ad_data['main_media_type'] = 'image'
    else:
        ad_data['main_media_type'] = 'text'
    
    # Extract card data (for carousel ads) with ALL detailed content
    cards = snapshot.get('cards', [])
    if cards:
        card_details = []
        card_bodies = []
        card_titles = []
        card_captions = []
        card_cta_texts = []
        card_cta_types = []
        card_urls = []
        card_descriptions = []
        
        # All image URL types
        card_original_image_urls = []
        card_resized_image_urls = []
        card_watermarked_resized_image_urls = []
        
        # All video URL types
        card_video_hd_urls = []
        card_video_sd_urls = []
        card_video_preview_urls = []
        card_watermarked_video_hd_urls = []
        card_watermarked_video_sd_urls = []
        
        # Media type detection
        card_media_types = []
        card_image_crops = []
        
        # Complete card data extraction
        all_card_data = []
        
        for i, card in enumerate(cards):
            # Basic card text content
            card_bodies.append(card.get('body', ''))
            card_titles.append(card.get('title', ''))
            card_captions.append(card.get('caption', ''))
            card_cta_texts.append(card.get('cta_text', ''))
            card_cta_types.append(card.get('cta_type', ''))
            card_urls.append(card.get('link_url', ''))
            card_descriptions.append(card.get('link_description', ''))
            
            # All image URL variants
            card_original_image_urls.append(card.get('original_image_url', ''))
            card_resized_image_urls.append(card.get('resized_image_url', ''))
            card_watermarked_resized_image_urls.append(card.get('watermarked_resized_image_url', ''))
            
            # All video URL variants
            card_video_hd_urls.append(card.get('video_hd_url', ''))
            card_video_sd_urls.append(card.get('video_sd_url', ''))
            card_video_preview_urls.append(card.get('video_preview_image_url', ''))
            card_watermarked_video_hd_urls.append(card.get('watermarked_video_hd_url', ''))
            card_watermarked_video_sd_urls.append(card.get('watermarked_video_sd_url', ''))
            
            # Media type detection
            has_image = bool(card.get('original_image_url') or card.get('resized_image_url'))
            has_video = bool(card.get('video_hd_url') or card.get('video_sd_url'))
            
            if has_video:
                media_type = 'video'
            elif has_image:
                media_type = 'image'
            else:
                media_type = 'text'
            
            card_media_types.append(media_type)
            
            # Image crops data
            image_crops = card.get('image_crops', [])
            card_image_crops.append(str(image_crops) if image_crops else '')
            
            # Complete card data as JSON-like structure
            card_complete_data = {
                'card_number': i + 1,
                'body': card.get('body', ''),
                'title': card.get('title', ''),
                'caption': card.get('caption', ''),
                'cta_text': card.get('cta_text', ''),
                'cta_type': card.get('cta_type', ''),
                'link_url': card.get('link_url', ''),
                'link_description': card.get('link_description', ''),
                'media_type': media_type,
                'original_image_url': card.get('original_image_url', ''),
                'resized_image_url': card.get('resized_image_url', ''),
                'watermarked_resized_image_url': card.get('watermarked_resized_image_url', ''),
                'video_hd_url': card.get('video_hd_url', ''),
                'video_sd_url': card.get('video_sd_url', ''),
                'video_preview_image_url': card.get('video_preview_image_url', ''),
                'watermarked_video_hd_url': card.get('watermarked_video_hd_url', ''),
                'watermarked_video_sd_url': card.get('watermarked_video_sd_url', ''),
                'image_crops': str(image_crops) if image_crops else ''
            }
            all_card_data.append(str(card_complete_data))
            
            # Enhanced card summary with all content
            card_summary_parts = []
            if card.get('title'):
                card_summary_parts.append(f"Title: '{card.get('title')}'")
            if card.get('body'):
                card_summary_parts.append(f"Body: '{card.get('body')}'")
            if card.get('caption'):
                card_summary_parts.append(f"Caption: '{card.get('caption')}'")
            if card.get('cta_text'):
                card_summary_parts.append(f"CTA: '{card.get('cta_text')}' ({card.get('cta_type', '')})")
            if card.get('link_url'):
                card_summary_parts.append(f"URL: {card.get('link_url')}")
            if card.get('link_description'):
                card_summary_parts.append(f"Description: '{card.get('link_description')}'")
            
            card_summary_parts.append(f"Media: {media_type}")
            
            card_summary = f"Card {i+1}: {' | '.join(card_summary_parts)}"
            card_details.append(card_summary)
        
        ad_data['card_count'] = len(cards)
        ad_data['card_bodies'] = ' | '.join(card_bodies)
        ad_data['card_titles'] = ' | '.join(card_titles)
        ad_data['card_captions'] = ' | '.join(card_captions)
        ad_data['card_cta_texts'] = ' | '.join(card_cta_texts)
        ad_data['card_cta_types'] = ' | '.join(card_cta_types)
        ad_data['card_urls'] = ' | '.join(card_urls)
        ad_data['card_descriptions'] = ' | '.join(card_descriptions)
        
        # All image URL types
        ad_data['card_original_image_urls'] = ' | '.join([url for url in card_original_image_urls if url])
        ad_data['card_resized_image_urls'] = ' | '.join([url for url in card_resized_image_urls if url])
        ad_data['card_watermarked_resized_image_urls'] = ' | '.join([url for url in card_watermarked_resized_image_urls if url])
        
        # All video URL types
        ad_data['card_video_hd_urls'] = ' | '.join([url for url in card_video_hd_urls if url])
        ad_data['card_video_sd_urls'] = ' | '.join([url for url in card_video_sd_urls if url])
        ad_data['card_video_preview_urls'] = ' | '.join([url for url in card_video_preview_urls if url])
        ad_data['card_watermarked_video_hd_urls'] = ' | '.join([url for url in card_watermarked_video_hd_urls if url])
        ad_data['card_watermarked_video_sd_urls'] = ' | '.join([url for url in card_watermarked_video_sd_urls if url])
        
        # Media types and metadata
        ad_data['card_media_types'] = ' | '.join(card_media_types)
        ad_data['card_image_crops'] = ' | '.join([crop for crop in card_image_crops if crop])
        
        # Complete card data and summaries
        ad_data['card_complete_data'] = ' || '.join(all_card_data)
        ad_data['card_details_summary'] = ' || '.join(card_details)
        
        # Card statistics
        image_cards = sum(1 for mt in card_media_types if mt == 'image')
        video_cards = sum(1 for mt in card_media_types if mt == 'video')
        text_cards = sum(1 for mt in card_media_types if mt == 'text')
        
        ad_data['card_stats'] = f"Total: {len(cards)} | Images: {image_cards} | Videos: {video_cards} | Text: {text_cards}"
        
    else:
        ad_data['card_count'] = 0
        ad_data['card_bodies'] = ''
        ad_data['card_titles'] = ''
        ad_data['card_captions'] = ''
        ad_data['card_cta_texts'] = ''
        ad_data['card_cta_types'] = ''
        ad_data['card_urls'] = ''
        ad_data['card_descriptions'] = ''
        ad_data['card_original_image_urls'] = ''
        ad_data['card_resized_image_urls'] = ''
        ad_data['card_watermarked_resized_image_urls'] = ''
        ad_data['card_video_hd_urls'] = ''
        ad_data['card_video_sd_urls'] = ''
        ad_data['card_video_preview_urls'] = ''
        ad_data['card_watermarked_video_hd_urls'] = ''
        ad_data['card_watermarked_video_sd_urls'] = ''
        ad_data['card_media_types'] = ''
        ad_data['card_image_crops'] = ''
        ad_data['card_complete_data'] = ''
        ad_data['card_details_summary'] = ''
        ad_data['card_stats'] = ''
    
    # Extract main image URLs
    images = snapshot.get('images', [])
    main_image_urls = []
    main_image_resized_urls = []
    for img in images:
        if img.get('original_image_url'):
            main_image_urls.append(img.get('original_image_url'))
        if img.get('resized_image_url'):
            main_image_resized_urls.append(img.get('resized_image_url'))
    
    ad_data['main_image_urls'] = ' | '.join(main_image_urls)
    ad_data['main_image_resized_urls'] = ' | '.join(main_image_resized_urls)
    
    # Extract main video URLs
    videos = snapshot.get('videos', [])
    main_video_hd_urls = []
    main_video_sd_urls = []
    main_video_preview_urls = []
    for video in videos:
        if video.get('video_hd_url'):
            main_video_hd_urls.append(video.get('video_hd_url'))
        if video.get('video_sd_url'):
            main_video_sd_urls.append(video.get('video_sd_url'))
        if video.get('video_preview_image_url'):
            main_video_preview_urls.append(video.get('video_preview_image_url'))
    
    ad_data['main_video_hd_urls'] = ' | '.join(main_video_hd_urls)
    ad_data['main_video_sd_urls'] = ' | '.join(main_video_sd_urls)
    ad_data['main_video_preview_urls'] = ' | '.join(main_video_preview_urls)
    
    # Extract extra content (additional texts, images, videos)
    extra_texts = snapshot.get('extra_texts', [])
    extra_text_content = []
    for text_obj in extra_texts:
        if text_obj.get('text'):
            extra_text_content.append(text_obj.get('text'))
    ad_data['extra_texts'] = ' | '.join(extra_text_content)
    
    extra_links = snapshot.get('extra_links', [])
    ad_data['extra_links'] = ' | '.join(extra_links)
    
    extra_images = snapshot.get('extra_images', [])
    extra_image_urls = []
    for img in extra_images:
        if img.get('original_image_url'):
            extra_image_urls.append(img.get('original_image_url'))
    ad_data['extra_image_urls'] = ' | '.join(extra_image_urls)
    
    extra_videos = snapshot.get('extra_videos', [])
    extra_video_urls = []
    for video in extra_videos:
        if video.get('video_hd_url'):
            extra_video_urls.append(video.get('video_hd_url'))
    ad_data['extra_video_urls'] = ' | '.join(extra_video_urls)
    
    # Create comprehensive content summary
    content_parts = []
    content_parts.append(f"MEDIA TYPE: {ad_data['main_media_type']}")
    
    if ad_data['main_title']:
        content_parts.append(f"TITLE: {ad_data['main_title']}")
    if ad_data['main_body_text']:
        content_parts.append(f"BODY: {ad_data['main_body_text']}")
    if ad_data['main_caption']:
        content_parts.append(f"CAPTION: {ad_data['main_caption']}")
    if ad_data['main_cta_text']:
        content_parts.append(f"CTA: {ad_data['main_cta_text']} ({ad_data['main_cta_type']})")
    if ad_data['card_count'] > 0:
        content_parts.append(f"CARDS: {ad_data['card_stats']}")
    if ad_data['extra_texts']:
        extra_count = len([text for text in ad_data['extra_texts'].split(' | ') if text])
        content_parts.append(f"EXTRA TEXTS: {extra_count} additional texts")
    
    ad_data['content_summary'] = ' | '.join(content_parts)
    
    # Media summary
    media_parts = []
    if ad_data['main_image_urls']:
        media_parts.append(f"Main Images: {len(ad_data['main_image_urls'].split(' | '))}")
    if ad_data['main_video_hd_urls']:
        media_parts.append(f"Main Videos: {len(ad_data['main_video_hd_urls'].split(' | '))}")
    if ad_data['card_original_image_urls']:
        media_parts.append(f"Card Images: {len([url for url in ad_data['card_original_image_urls'].split(' | ') if url])}")
    if ad_data['card_video_hd_urls']:
        media_parts.append(f"Card Videos: {len([url for url in ad_data['card_video_hd_urls'].split(' | ') if url])}")
    if ad_data['card_watermarked_resized_image_urls']:
        media_parts.append(f"Watermarked Images: {len([url for url in ad_data['card_watermarked_resized_image_urls'].split(' | ') if url])}")
    if ad_data['extra_image_urls']:
        media_parts.append(f"Extra Images: {len([url for url in ad_data['extra_image_urls'].split(' | ') if url])}")
    if ad_data['extra_video_urls']:
        media_parts.append(f"Extra Videos: {len([url for url in ad_data['extra_video_urls'].split(' | ') if url])}")
    
    ad_data['media_summary'] = ' | '.join(media_parts)
    
    # Convert timestamps to readable dates
    if ad_data['start_date']:
        try:
            ad_data['start_date_readable'] = datetime.fromtimestamp(int(ad_data['start_date'])).strftime('%Y-%m-%d %H:%M:%S')
        except:
            ad_data['start_date_readable'] = ''
    else:
        ad_data['start_date_readable'] = ''
        
    if ad_data['end_date']:
        try:
            ad_data['end_date_readable'] = datetime.fromtimestamp(int(ad_data['end_date'])).strftime('%Y-%m-%d %H:%M:%S')
        except:
            ad_data['end_date_readable'] = ''
    else:
        ad_data['end_date_readable'] = ''
    
    return ad_data

def fetch_ads_page(config):
    """Fetch a single page of ads data"""
    url = "https://www.facebook.com/api/graphql/"
    
    payload = build_dynamic_payload(config)
    headers = {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/x-www-form-urlencoded',
        'origin': 'https://www.facebook.com',
        'priority': 'u=1, i',
        'referer': build_referer_url(config),
        'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
        'sec-ch-ua-full-version-list': '"Not)A;Brand";v="8.0.0.0", "Chromium";v="138.0.0.0", "Brave";v="138.0.0.0"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-model': '""',
        'sec-ch-ua-platform': '"Windows"',
        'sec-ch-ua-platform-version': '"19.0.0"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'sec-gpc': '1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'x-asbd-id': '359341',
        'x-fb-friendly-name': 'AdLibrarySearchPaginationQuery',
        'x-fb-lsd': config['lsd_token'],
        'Cookie': config['cookie']
    }
    
    response = None
    try:
        response = requests.post(url, headers=headers, data=payload)
        response.raise_for_status()
        
        data = response.json()
        return data
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        if response is not None:
            print(f"Status Code: {response.status_code}")
            print(f"Response Text: {response.text}")
        return None
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        if response is not None:
            print(f"Response Text: {response.text}")
        return None

def save_to_csv(all_ads_data, filename):
    """Save ads data to CSV file"""
    if not all_ads_data:
        print("No data to save to CSV")
        return
    
    # Get all unique field names
    fieldnames = set()
    for ad in all_ads_data:
        fieldnames.update(ad.keys())
    
    fieldnames = sorted(list(fieldnames))
    
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_ads_data)
    
    print(f"Saved {len(all_ads_data)} ads to {filename}")

def main():
    """Main function to fetch all pages of ads and save to CSV"""
    all_ads_data = []
    all_search_json_responses = []
    page_num = 1
    
    print(f"Starting Facebook Ads data collection and enrichment...")
    print(f"Target: {config['view_all_page_id']}")
    print(f"Countries: {config['countries']}")
    print(f"Max pages: {config['max_pages'] or 'Unlimited'}")
    print("-" * 50)
    
    while True:
        print(f"Fetching page {page_num}...")
        
        # Fetch current page
        response_data = fetch_ads_page(config)
        
        if response_data is None:
            print("Failed to fetch data. Stopping.")
            break
        
        # We will append the response data here. The enrichment data will be added to it later.
        if config['save_json']:
            all_search_json_responses.append(response_data)
        
        # Extract ads data
        try:
            search_results = response_data['data']['ad_library_main']['search_results_connection']
            edges = search_results.get('edges', [])
            page_info = search_results.get('page_info', {})
            
            # Process each edge
            ads_in_page = 0
            for edge in edges:
                node = edge.get('node', {})
                collated_results = node.get('collated_results', [])
                
                for collated_result in collated_results:
                    ad_data = extract_ad_data(collated_result)
                    ad_data['page_number'] = page_num  # Add page number for reference
                    
                    # --- Start Enrichment Process ---
                    print(f"  Enriching ad {ad_data.get('ad_archive_id')}...")
                    enrich_response = fetch_ad_details(ad_data)
                    
                    if enrich_response:
                        # Inject the raw enrichment response into the search result object
                        if config['save_json']:
                            collated_result['enrichment_response'] = enrich_response
                        
                        enrichment_data = extract_enrichment_data(enrich_response)
                        prefixed_enrichment_data = {f"enrich_{k}": str(v) for k, v in enrichment_data.items()}
                        ad_data.update(prefixed_enrichment_data)
                    
                    all_ads_data.append(ad_data)
                    ads_in_page += 1

                    # Delay between enrichment requests
                    if config['delay_between_enrich_requests'] > 0:
                        time.sleep(config['delay_between_enrich_requests'])
                    # --- End Enrichment Process ---

            print(f"Page {page_num}: Found and processed {ads_in_page} ads")
            
            # Check if there's a next page
            has_next_page = page_info.get('has_next_page', False)
            end_cursor = page_info.get('end_cursor')
            
            if not has_next_page:
                print("No more pages available. Finished.")
                break
            
            if config['max_pages'] and page_num >= config['max_pages']:
                print(f"Reached maximum pages limit ({config['max_pages']}). Stopping.")
                break
            
            # Update cursor for next page
            config['cursor'] = end_cursor
            page_num += 1
            
            # Delay between requests
            if config['delay_between_page_requests'] > 0:
                print(f"Waiting {config['delay_between_page_requests']} seconds before next page...")
                time.sleep(config['delay_between_page_requests'])
                
        except KeyError as e:
            print(f"Error parsing response data: {e}")
            print("Response structure might have changed.")
            break
        except Exception as e:
            print(f"Unexpected error: {e}")
            break
    
    # Save results
    print("-" * 50)
    print(f"Collection complete!")
    print(f"Total ads collected: {len(all_ads_data)}")
    print(f"Total pages processed: {page_num}")
    
    if all_ads_data:
        # Save to CSV
        save_to_csv(all_ads_data, config['output_file'])
        
        # Save JSON responses if requested
        if config['save_json'] and all_search_json_responses:
            json_filename = config['output_file'].replace('.csv', '_raw_responses.json')
            with open(json_filename, 'w', encoding='utf-8') as f:
                json.dump(all_search_json_responses, f, indent=2, ensure_ascii=False)
            print(f"Saved combined raw JSON responses to {json_filename}")

    else:
        print("No ads data collected.")

if __name__ == "__main__":
    main() 