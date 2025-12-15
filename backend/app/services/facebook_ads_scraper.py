import requests
import json
import csv
import time
import uuid
import os
from urllib.parse import urlencode
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import re
import urllib.parse

from app.models import Ad, Competitor
from app.database import get_db
from app.services.enhanced_ad_extraction import EnhancedAdExtractionService

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
# Set logging level for specific modules
logging.getLogger('app.services.creative_comparison_service').setLevel(logging.INFO)
logging.getLogger('app.services.enhanced_ad_extraction').setLevel(logging.INFO)


class FacebookAdsScraperConfig:
    """
    Configuration class for Facebook Ads scraper.
    
    To keep this script working, you may need to update the session-related
    values below. You can get these by inspecting the network requests in your
    browser's developer tools when browsing the Facebook Ad Library.
    
    1. Open the Ad Library in a new browser tab.
    2. Open the Developer Tools (F12) and go to the "Network" tab.
    3. Perform a search for an advertiser.
    4. Find a 'graphql' request, right-click it, and copy the cookie string
       and other relevant values like 'lsd' and 'jazoest'.
    """
    
    def __init__(
        self,
        # --- Search parameters ---
        active_status: str = 'active',
        ad_type: str = 'ALL',
        countries: List[str] = None,
        search_type: str = 'page',
        media_type: str = 'all',
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        query_string: str = '',
        page_ids: List[str] = None,
        view_all_page_id: str = '1591077094491398',
        cursor: Optional[str] = None,
        first: int = 30,
        is_targeted_country: bool = False,
        
        # --- Session parameters ---
        session_id: str = '2937f803-041c-481d-b565-81ae712d5209',
        collation_token: str = str(uuid.uuid4()),  # Random UUID for collation token
        lsd_token: str = 'AVq28ysAAt0',
        jazoest: str = '2900',
        cookie: str = 'datr=n14YaOmLyHCUO9eDBSPbd0bo; sb=n14YaN0pXid7MQ54q1q9-XHz; ps_l=1; ps_n=1; dpr=2.5; fr=1vnX3O3Y99uUSRWaj.AWchuA7IeOh24kEy8WvwbrIwUUScHnrL8m0ga2ev4Py-aNisJdM.BoaRgt..AAA.0.0.BoaRgt.AWcCsNYL2f427xwHLtWS3CN2SlU; wd=891x831',

        # --- Dynamic payload components (may need updating) ---
        search_payload_dyn: str = '7xeUmwlECdwn8K2Wmh0no6u5U4e1Fx-ewSAwHwNw9G2S2q0_EtxG4o0B-qbwgE1EEb87C1xwEwgo9oO0n24oaEd86a3a1YwBgao6C0Mo6i588Etw8WfK1LwPxe2GewbCXwJwmEtwse5o4q0HU1IEGdw46wbLwrU6C2-0VE6O1Fw59G2O1TwmU3ywo8',
        search_payload_csr: str = 'htOh24lsOWjORb9uQAheC8KVpaGuHGF8GBx2UKp2qzVUiCBxm6GwTBwBwFBx216G15whrx6482TKEuzU8E6aUdU2qwgo8E7jwsE1BU2axy0RUkxC8w4dwTw10K0aswOU02yHyE07_h00iVE04IK06ofwbG00ymQ032q03TN1i0bQw35E0Gq09pw6Yg0OG',
        search_payload_hsdp: str = 'ggPhf5icj4pbiO0KgG1awwwCpoaoKGCQb81lw8mq4nQ1kwyw2xo4t08uE33hWvN5eE-293Q4827wJwc-q0mm1qwQw8e0abDg1dE3pw6kw86UB08217w1la085w0JTw0Rzw0tk8',
        search_payload_hblp: str = '03280oFw36o0OK0k6U1Ko0nqw2hEnw0Jvw2BE4e0se06ro0Bq02y20eCg0OW0WE15E1xUjw70wbm0XE5q7E0juwRw',

        # --- General settings ---
        max_pages: Optional[int] = 1,
        delay_between_requests: int = 1,
        save_json: bool = False
    ):
        # Search parameters
        self.active_status = active_status
        self.ad_type = ad_type
        
        # Handle 'ALL' countries special value
        if countries and 'ALL' in countries:
            # When 'ALL' is specified, use all supported countries
            self.countries = ['AE', 'US', 'GB', 'SA', 'EG', 'DE', 'FR', 'CA', 'AU']
        else:
            self.countries = countries or ['AE']
        
        self.search_type = search_type
        self.media_type = media_type
        self.start_date = start_date
        self.end_date = end_date
        self.query_string = query_string
        self.page_ids = page_ids or []
        self.view_all_page_id = view_all_page_id
        self.cursor = cursor
        self.first = first
        self.is_targeted_country = is_targeted_country
        
        # Session parameters
        self.session_id = session_id
        self.collation_token = collation_token or str(uuid.uuid4())
        self.lsd_token = lsd_token
        self.jazoest = jazoest
        self.cookie = cookie
        
        # Dynamic payload components
        self.search_payload_dyn = search_payload_dyn
        self.search_payload_csr = search_payload_csr
        self.search_payload_hsdp = search_payload_hsdp
        self.search_payload_hblp = search_payload_hblp

        # General settings
        self.max_pages = max_pages
        self.delay_between_requests = delay_between_requests
        self.save_json = save_json
        
        # Hardcoded headers (only user-agent and other static values)
        self.headers = {
            'authority': 'www.facebook.com',
            'accept': '*/*',
            'accept-language': 'en-US,en;q=0.9',
            'content-type': 'application/x-www-form-urlencoded',
            'origin': 'https://www.facebook.com',
            'priority': 'u=1, i',
            'referer': 'https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=US&sort_data[direction]=desc&sort_data[mode]=relevancy_monthly_grouped&search_type=page&media_type=all',
            'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'sec-gpc': '1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
            'x-asbd-id': '359341',
            'x-fb-friendly-name': 'AdLibrarySearchPaginationQuery'
        }


class FacebookAdsScraperService:
    """Service for scraping Facebook Ads Library data"""
    
    def __init__(self, db: Session, min_duration_days: Optional[int] = None):
        self.db = db
        self.enhanced_extractor = EnhancedAdExtractionService(db, min_duration_days)

    def build_variables(self, config: FacebookAdsScraperConfig) -> str:
        """Build the variables JSON object from config"""
        variables = {
            "activeStatus": config.active_status,
            "adType": config.ad_type,
            "bylines": [],
            "collationToken": config.collation_token,
            "contentLanguages": [],
            "countries": config.countries,
            "cursor": config.cursor,
            "excludedIDs": None,
            "first": config.first,
            "isTargetedCountry": config.is_targeted_country,
            "location": None,
            "mediaType": config.media_type,
            "multiCountryFilterMode": None,
            "pageIDs": config.page_ids,
            "potentialReachInput": None,
            "publisherPlatforms": [],
            "queryString": config.query_string,
            "regions": None,
            "searchType": config.search_type,
            "sessionID": config.session_id,
            "sortData": None,
            "source": None,
            "startDate": config.start_date,
            "v": "608791",
            "viewAllPageID": config.view_all_page_id
        }
        return json.dumps(variables, separators=(',', ':'))

    def build_dynamic_payload(self, config: FacebookAdsScraperConfig) -> str:
        """Build payload with dynamic variables while keeping original structure"""
        variables_json = self.build_variables(config)
        
        payload = (
            f"av=0&__aaid=0&__user=0&__a=1&__req=a&__hs=20275.HYP%3Acomet_plat_default_pkg.2.1...0&dpr=3&"
            f"__ccg=GOOD&__rev=1024475506&__s=oeivzd%3Aa1ohcs%3A7a3kxu&__hsi=7524059447383386224&"
            f"__dyn={config.search_payload_dyn}&"
            f"__csr={config.search_payload_csr}&"
            f"__hsdp={config.search_payload_hsdp}&"
            f"__hblp={config.search_payload_hblp}&"
            f"__comet_req=94&lsd={config.lsd_token}&jazoest={config.jazoest}&__spin_r=1024475506&__spin_b=trunk&__spin_t=1751831604&"
            f"__jssesw=1&fb_api_caller_class=RelayModern&fb_api_req_friendly_name=AdLibrarySearchPaginationQuery&"
            f"variables={urllib.parse.quote(variables_json)}&server_timestamps=true&doc_id=24394279933540792"
        )
        return payload

    def build_referer_url(self, config: FacebookAdsScraperConfig) -> str:
        """Build the referer URL based on config"""
        params = {
            'active_status': config.active_status,
            'ad_type': 'all',
            'country': ','.join(config.countries),
            'is_targeted_country': str(config.is_targeted_country).lower(),
            'media_type': config.media_type,
            'search_type': config.search_type,
            'view_all_page_id': config.view_all_page_id
        }
        
        if config.query_string:
            params['q'] = config.query_string
        
        query_string = urlencode(params)
        return f"https://www.facebook.com/ads/library/?{query_string}"

    def fetch_ads_page(self, config: FacebookAdsScraperConfig) -> Optional[Dict]:
        """
        Fetch a single page of ads data using the Facebook Ads Library API
        
        Args:
            config: Scraper configuration
            
        Returns:
            Dictionary containing the response data
        """
        url = "https://www.facebook.com/api/graphql/"
        
        payload = self.build_dynamic_payload(config)
        
        headers = config.headers.copy()
        headers['referer'] = self.build_referer_url(config)
        headers['Cookie'] = config.cookie
        headers['x-fb-lsd'] = config.lsd_token
        
        try:
            response = requests.post(url, headers=headers, data=payload)
            response.raise_for_status()
            
            data = response.json()
            return data
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error: {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            logger.error(f"Response text that failed to parse: {response.text[:1000]}")
            return None

    def scrape_ads(self, config: FacebookAdsScraperConfig) -> Tuple[List[Dict], List[Dict], Dict, Dict]:
        """
        Scrape Facebook Ads and process them with enhanced extraction
        
        Args:
            config: Scraper configuration
        
        Returns:
            Tuple of (all_ads_data, all_json_responses, enhanced_data, stats)
        """
        logger.info(f"Starting data collection for {config.view_all_page_id} using enhanced extraction")
        
        try:
            all_json_responses = []
            page_count = 0
            enhanced_data = {}  # Initialize enhanced_data to avoid reference errors
            
            stats = {
                "total_processed": 0,
                "created": 0,
                "updated": 0,
                "errors": 0,
                'competitors_created': 0,
                'competitors_updated': 0,
                'campaigns_processed': 0
            }
            
            while True:
                page_count += 1
                if config.max_pages and page_count > config.max_pages:
                    logger.info(f"Reached max pages limit of {config.max_pages}.")
                    break

                logger.info(f"Scraping page {page_count}")
                
                response_data = self.fetch_ads_page(config)

                if not response_data:
                    logger.warning(f"No response data on page {page_count}. Stopping scrape.")
                    break
                
                all_json_responses.append(response_data)
                
                try:
                    # Check if response contains errors instead of data
                    if 'errors' in response_data:
                        error_details = response_data['errors'][0] if response_data['errors'] else {}
                        error_msg = error_details.get('message', 'Unknown Facebook API error')
                        error_code = error_details.get('code', 'N/A')
                        logger.error(f"Facebook API Error on page {page_count}: {error_msg} (Code: {error_code})")
                        logger.error(f"This might be due to invalid search parameters, rate limiting, or Facebook server issues.")
                        stats['errors'] += 1
                        break
                    
                    search_results = response_data['data']['ad_library_main']['search_results_connection']
                    edges = search_results.get('edges', [])
                    page_info = search_results.get('page_info', {})

                    if not edges:
                        logger.info("No ads found on this page. Stopping scrape.")
                        break
                    
                    logger.info(f"Page {page_count}: Found {len(edges)} ad groups. Processing with enhanced extraction.")

                    enhanced_data, _ = self.enhanced_extractor.process_raw_responses([response_data])
                    
                    extraction_stats = self.enhanced_extractor.save_enhanced_ads_to_database(enhanced_data)
                    
                    # Map the returned stats to our expected format
                    stats['total_processed'] += extraction_stats.get('total_ads_processed', 0)
                    stats['created'] += extraction_stats.get('new_ads_created', 0)
                    stats['updated'] += extraction_stats.get('existing_ads_updated', 0)
                    stats['errors'] += extraction_stats.get('errors', 0)
                    stats['competitors_updated'] += extraction_stats.get('competitors_processed', 0)
                    
                    has_next_page = page_info.get('has_next_page', False)
                    end_cursor = page_info.get('end_cursor')

                    if not has_next_page:
                        logger.info("No more pages available. Finished.")
                        break
                    
                    config.cursor = end_cursor
                    
                    if config.delay_between_requests > 0:
                        logger.info(f"Waiting {config.delay_between_requests} seconds...")
                        time.sleep(config.delay_between_requests)

                except (KeyError, TypeError) as e:
                    logger.error(f"Error parsing response data on page {page_count}: {e}")
                    logger.error(f"Response data that caused error: {response_data}")
                    stats['errors'] += 1
                    break
            
            logger.info(f"Scraping complete. Final stats: {stats}")
            return [], all_json_responses, enhanced_data, stats
        
        except Exception as e:
            logger.error(f"Error in ads scraping: {str(e)}")
            raise 