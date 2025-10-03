import requests
import json
import logging
from typing import Dict, Optional, List
from sqlalchemy.orm import Session
from app.models import Ad

logger = logging.getLogger(__name__)


class MediaRefreshService:
    """Service to refresh media URLs from Facebook Ad Library"""
    
    def __init__(self, db: Session):
        self.db = db
        self.session = self._create_session()
    
    def _create_session(self) -> requests.Session:
        """Create a requests session with Facebook cookies and headers"""
        session = requests.Session()
        
        # Set headers - using same as scraper
        session.headers.update({
            'authority': 'www.facebook.com',
            'accept': '*/*',
            'accept-language': 'en-US,en;q=0.9',
            'content-type': 'application/x-www-form-urlencoded',
            'origin': 'https://www.facebook.com',
            'priority': 'u=1, i',
            'referer': 'https://www.facebook.com/ads/library/',
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
        })
        
        # Set cookies - using same cookie format as scraper
        self.cookie_string = 'datr=n14YaOmLyHCUO9eDBSPbd0bo; sb=n14YaN0pXid7MQ54q1q9-XHz; ps_l=1; ps_n=1; dpr=2.5; fr=1vnX3O3Y99uUSRWaj.AWchuA7IeOh24kEy8WvwbrIwUUScHnrL8m0ga2ev4Py-aNisJdM.BoaRgt..AAA.0.0.BoaRgt.AWcCsNYL2f427xwHLtWS3CN2SlU; wd=891x831'
        self.lsd_token = 'AVq28ysAAt0'
        self.jazoest = '2900'
        
        return session
    
    def extract_urls_from_ad_data(self, ad_data: Dict) -> Dict[str, List[str]]:
        """Extract all URLs from Facebook ad data"""
        urls = {
            'video_urls': [],
            'image_urls': [],
            'link_urls': [],
            'profile_urls': []
        }
        
        try:
            snapshot = ad_data.get('snapshot', {})
            
            # Extract page profile URLs (but NOT profile picture - that's the company logo)
            if snapshot.get('page_profile_uri'):
                urls['profile_urls'].append(snapshot['page_profile_uri'])
            # DO NOT extract page_profile_picture_url - it's just the company logo, not ad creative
            
            # Extract from cards - PREFER HIGH QUALITY ONLY (actual ad creatives)
            cards = snapshot.get('cards', [])
            for card in cards:
                # Video URLs - prefer HD over SD
                if card.get('video_hd_url'):
                    urls['video_urls'].append(card['video_hd_url'])
                elif card.get('video_sd_url'):
                    urls['video_urls'].append(card['video_sd_url'])
                # Only add watermarked if no regular version exists
                elif card.get('watermarked_video_hd_url'):
                    urls['video_urls'].append(card['watermarked_video_hd_url'])
                elif card.get('watermarked_video_sd_url'):
                    urls['video_urls'].append(card['watermarked_video_sd_url'])
                
                if card.get('video_preview_image_url'):
                    urls['image_urls'].append(card['video_preview_image_url'])
                
                # Image URLs - prefer ORIGINAL over resized
                if card.get('original_image_url'):
                    urls['image_urls'].append(card['original_image_url'])
                elif card.get('resized_image_url'):
                    urls['image_urls'].append(card['resized_image_url'])
                # Only add watermarked if no regular version exists
                elif card.get('watermarked_resized_image_url'):
                    urls['image_urls'].append(card['watermarked_resized_image_url'])
                
                # Link URLs
                if card.get('link_url'):
                    urls['link_urls'].append(card['link_url'])
            
            # Extract extra images - PREFER HIGH QUALITY
            extra_images = snapshot.get('extra_images', [])
            for img in extra_images:
                # Prefer original over resized
                if img.get('original_image_url'):
                    urls['image_urls'].append(img['original_image_url'])
                elif img.get('resized_image_url'):
                    urls['image_urls'].append(img['resized_image_url'])
                elif img.get('watermarked_resized_image_url'):
                    urls['image_urls'].append(img['watermarked_resized_image_url'])
            
            # Extract extra links
            extra_links = snapshot.get('extra_links', [])
            for link in extra_links:
                if link and isinstance(link, str):
                    urls['link_urls'].append(link)
            
            # Remove duplicates
            for key in urls:
                urls[key] = list(set(urls[key]))
        
        except Exception as e:
            logger.error(f"Error extracting URLs from ad data: {e}")
        
        return urls
    
    def fetch_ad_from_facebook(self, ad_archive_id: str, page_id: Optional[str] = None) -> Optional[Dict]:
        """Fetch ad data from Facebook Ad Library - tries multiple methods
        
        Args:
            ad_archive_id: The ad archive ID to fetch
            page_id: Optional page ID to help with the search
            
        Returns:
            Ad data dict or None
        """
        # Method 1: Try direct deeplink search (most reliable for specific ads)
        logger.info(f"Method 1: Trying deeplink search for ad {ad_archive_id}...")
        ad_data = self._fetch_ad_by_deeplink(ad_archive_id)
        if ad_data:
            return ad_data
        
        # Method 2: Try keyword search with ALL status
        logger.info(f"Method 2: Trying keyword search with ALL status for ad {ad_archive_id}...")
        ad_data = self._fetch_ad_by_keyword(ad_archive_id, active_status="ALL")
        if ad_data:
            return ad_data
        
        # Method 3: Try with page ID if available
        if page_id:
            logger.info(f"Method 3: Trying page search for ad {ad_archive_id} on page {page_id}...")
            ad_data = self._fetch_ad_by_page(ad_archive_id, page_id)
            if ad_data:
                return ad_data
        
        logger.warning(f"All methods failed to find ad data for {ad_archive_id}")
        return None
    
    def _fetch_ad_by_deeplink(self, ad_archive_id: str) -> Optional[Dict]:
        """Fetch ad using direct deeplink method (most reliable)"""
        try:
            import uuid
            import urllib.parse
            
            session_id = str(uuid.uuid4())
            collation_token = str(uuid.uuid4())
            
            # Use deeplinkAdID for direct ad lookup
            variables = {
                "activeStatus": "ALL",
                "adType": "ALL",
                "bylines": [],
                "collationToken": collation_token,
                "contentLanguages": [],
                "countries": [],
                "cursor": None,
                "deeplinkAdID": ad_archive_id,  # Direct ad ID lookup
                "excludedIDs": [],
                "first": 30,
                "hasDeeplinkAdID": True,  # Enable deeplink mode
                "isTargetedCountry": False,
                "location": None,
                "mediaType": "ALL",
                "multiCountryFilterMode": None,
                "pageIDs": [],
                "potentialReachInput": [],
                "publisherPlatforms": [],
                "queryString": "",
                "regions": [],
                "searchType": "KEYWORD_UNORDERED",
                "sessionID": session_id,
                "sortData": None,
                "source": None,
                "startDate": None,
                "v": "608791",
                "viewAllPageID": "0"
            }
            
            variables_json = json.dumps(variables, separators=(',', ':'))
            
            payload = (
                f"av=0&__aaid=0&__user=0&__a=1&__req=a&__hs=20275.HYP%3Acomet_plat_default_pkg.2.1...0&dpr=3&"
                f"__ccg=GOOD&__rev=1024475506&__s=oeivzd%3Aa1ohcs%3A7a3kxu&__hsi=7524059447383386224&"
                f"__dyn=7xeUmwlECdwn8K2Wmh0no6u5U4e1Fx-ewSAwHwNw9G2S2q0_EtxG4o0B-qbwgE1EEb87C1xwEwgo9oO0n24oaEd86a3a1YwBgao6C0Mo6i588Etw8WfK1LwPxe2GewbCXwJwmEtwse5o4q0HU1IEGdw46wbLwrU6C2-0VE6O1Fw59G2O1TwmU3ywo8&"
                f"__csr=htOh24lsOWjORb9uQAheC8KVpaGuHGF8GBx2UKp2qzVUiCBxm6GwTBwBwFBx216G15whrx6482TKEuzU8E6aUdU2qwgo8E7jwsE1BU2axy0RUkxC8w4dwTw10K0aswOU02yHyE07_h00iVE04IK06ofwbG00ymQ032q03TN1i0bQw35E0Gq09pw6Yg0OG&"
                f"__comet_req=94&lsd={self.lsd_token}&jazoest={self.jazoest}&__spin_r=1024475506&__spin_b=trunk&__spin_t=1751831604&"
                f"__jssesw=1&fb_api_caller_class=RelayModern&fb_api_req_friendly_name=AdLibrarySearchPaginationQuery&"
                f"variables={urllib.parse.quote(variables_json)}&server_timestamps=true&doc_id=24394279933540792"
            )
            
            headers = self.session.headers.copy()
            headers['Cookie'] = self.cookie_string
            headers['x-fb-lsd'] = self.lsd_token
            headers['x-fb-friendly-name'] = 'AdLibrarySearchPaginationQuery'
            headers['referer'] = f'https://www.facebook.com/ads/library/?id={ad_archive_id}'
            
            response = self.session.post(
                'https://www.facebook.com/api/graphql/',
                headers=headers,
                data=payload
            )
            
            if response.status_code != 200:
                logger.debug(f"Deeplink search returned HTTP {response.status_code}")
                return None
            
            logger.info(f"Deeplink search returned {len(response.text)} bytes, parsing...")
            result = self._parse_facebook_response(response.text, ad_archive_id)
            if not result:
                logger.info(f"Deeplink search: No matching ad found in response")
            return result
            
        except Exception as e:
            logger.debug(f"Deeplink search error: {e}")
            return None
    
    def _fetch_ad_by_keyword(self, ad_archive_id: str, active_status: str = "ALL") -> Optional[Dict]:
        """Fetch ad using keyword search"""
        try:
            import uuid
            import urllib.parse
            
            session_id = str(uuid.uuid4())
            collation_token = str(uuid.uuid4())
            
            variables = {
                "activeStatus": active_status,
                "adType": "ALL",
                "bylines": [],
                "collationToken": collation_token,
                "contentLanguages": [],
                "countries": [],
                "cursor": None,
                "deeplinkAdID": None,
                "excludedIDs": [],
                "first": 30,
                "hasDeeplinkAdID": False,
                "isTargetedCountry": False,
                "location": None,
                "mediaType": "ALL",
                "multiCountryFilterMode": None,
                "pageIDs": [],
                "potentialReachInput": [],
                "publisherPlatforms": [],
                "queryString": ad_archive_id,
                "regions": [],
                "searchType": "KEYWORD_UNORDERED",
                "sessionID": session_id,
                "sortData": None,
                "source": None,
                "startDate": None,
                "v": "608791",
                "viewAllPageID": "0"
            }
            
            variables_json = json.dumps(variables, separators=(',', ':'))
            
            payload = (
                f"av=0&__aaid=0&__user=0&__a=1&__req=a&__hs=20275.HYP%3Acomet_plat_default_pkg.2.1...0&dpr=3&"
                f"__ccg=GOOD&__rev=1024475506&__s=oeivzd%3Aa1ohcs%3A7a3kxu&__hsi=7524059447383386224&"
                f"__dyn=7xeUmwlECdwn8K2Wmh0no6u5U4e1Fx-ewSAwHwNw9G2S2q0_EtxG4o0B-qbwgE1EEb87C1xwEwgo9oO0n24oaEd86a3a1YwBgao6C0Mo6i588Etw8WfK1LwPxe2GewbCXwJwmEtwse5o4q0HU1IEGdw46wbLwrU6C2-0VE6O1Fw59G2O1TwmU3ywo8&"
                f"__csr=htOh24lsOWjORb9uQAheC8KVpaGuHGF8GBx2UKp2qzVUiCBxm6GwTBwBwFBx216G15whrx6482TKEuzU8E6aUdU2qwgo8E7jwsE1BU2axy0RUkxC8w4dwTw10K0aswOU02yHyE07_h00iVE04IK06ofwbG00ymQ032q03TN1i0bQw35E0Gq09pw6Yg0OG&"
                f"__comet_req=94&lsd={self.lsd_token}&jazoest={self.jazoest}&__spin_r=1024475506&__spin_b=trunk&__spin_t=1751831604&"
                f"__jssesw=1&fb_api_caller_class=RelayModern&fb_api_req_friendly_name=AdLibrarySearchPaginationQuery&"
                f"variables={urllib.parse.quote(variables_json)}&server_timestamps=true&doc_id=24394279933540792"
            )
            
            headers = self.session.headers.copy()
            headers['Cookie'] = self.cookie_string
            headers['x-fb-lsd'] = self.lsd_token
            headers['x-fb-friendly-name'] = 'AdLibrarySearchPaginationQuery'
            headers['referer'] = f'https://www.facebook.com/ads/library/?active_status={active_status.lower()}&ad_type=all&country=ALL&q={ad_archive_id}&search_type=keyword_unordered'
            
            response = self.session.post(
                'https://www.facebook.com/api/graphql/',
                headers=headers,
                data=payload
            )
            
            if response.status_code != 200:
                logger.debug(f"Keyword search returned HTTP {response.status_code}")
                return None
            
            logger.info(f"Keyword search returned {len(response.text)} bytes, parsing...")
            result = self._parse_facebook_response(response.text, ad_archive_id)
            if not result:
                logger.info(f"Keyword search: No matching ad found in response")
            return result
            
        except Exception as e:
            logger.debug(f"Keyword search error: {e}")
            return None
    
    def _fetch_ad_by_page(self, ad_archive_id: str, page_id: str) -> Optional[Dict]:
        """Fetch ad by searching within a specific page"""
        try:
            import uuid
            import urllib.parse
            
            session_id = str(uuid.uuid4())
            collation_token = str(uuid.uuid4())
            
            variables = {
                "activeStatus": "ALL",
                "adType": "ALL",
                "bylines": [],
                "collationToken": collation_token,
                "contentLanguages": [],
                "countries": [],
                "cursor": None,
                "deeplinkAdID": None,
                "excludedIDs": [],
                "first": 30,
                "hasDeeplinkAdID": False,
                "isTargetedCountry": False,
                "location": None,
                "mediaType": "ALL",
                "multiCountryFilterMode": None,
                "pageIDs": [page_id],
                "potentialReachInput": [],
                "publisherPlatforms": [],
                "queryString": "",
                "regions": [],
                "searchType": "PAGE",
                "sessionID": session_id,
                "sortData": None,
                "source": None,
                "startDate": None,
                "v": "608791",
                "viewAllPageID": page_id
            }
            
            variables_json = json.dumps(variables, separators=(',', ':'))
            
            payload = (
                f"av=0&__aaid=0&__user=0&__a=1&__req=a&__hs=20275.HYP%3Acomet_plat_default_pkg.2.1...0&dpr=3&"
                f"__ccg=GOOD&__rev=1024475506&__s=oeivzd%3Aa1ohcs%3A7a3kxu&__hsi=7524059447383386224&"
                f"__dyn=7xeUmwlECdwn8K2Wmh0no6u5U4e1Fx-ewSAwHwNw9G2S2q0_EtxG4o0B-qbwgE1EEb87C1xwEwgo9oO0n24oaEd86a3a1YwBgao6C0Mo6i588Etw8WfK1LwPxe2GewbCXwJwmEtwse5o4q0HU1IEGdw46wbLwrU6C2-0VE6O1Fw59G2O1TwmU3ywo8&"
                f"__csr=htOh24lsOWjORb9uQAheC8KVpaGuHGF8GBx2UKp2qzVUiCBxm6GwTBwBwFBx216G15whrx6482TKEuzU8E6aUdU2qwgo8E7jwsE1BU2axy0RUkxC8w4dwTw10K0aswOU02yHyE07_h00iVE04IK06ofwbG00ymQ032q03TN1i0bQw35E0Gq09pw6Yg0OG&"
                f"__comet_req=94&lsd={self.lsd_token}&jazoest={self.jazoest}&__spin_r=1024475506&__spin_b=trunk&__spin_t=1751831604&"
                f"__jssesw=1&fb_api_caller_class=RelayModern&fb_api_req_friendly_name=AdLibrarySearchPaginationQuery&"
                f"variables={urllib.parse.quote(variables_json)}&server_timestamps=true&doc_id=24394279933540792"
            )
            
            headers = self.session.headers.copy()
            headers['Cookie'] = self.cookie_string
            headers['x-fb-lsd'] = self.lsd_token
            headers['x-fb-friendly-name'] = 'AdLibrarySearchPaginationQuery'
            headers['referer'] = f'https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&view_all_page_id={page_id}&search_type=page'
            
            response = self.session.post(
                'https://www.facebook.com/api/graphql/',
                headers=headers,
                data=payload
            )
            
            if response.status_code != 200:
                logger.debug(f"Page search returned HTTP {response.status_code}")
                return None
            
            logger.info(f"Page search returned {len(response.text)} bytes, parsing...")
            result = self._parse_facebook_response(response.text, ad_archive_id)
            if not result:
                logger.info(f"Page search: No matching ad found in response")
            return result
            
        except Exception as e:
            logger.debug(f"Page search error: {e}")
            return None
    
    def _parse_facebook_response(self, response_text: str, target_ad_id: str) -> Optional[Dict]:
        """Parse Facebook GraphQL response and find the target ad"""
        try:
            # Try to parse as single JSON first
            try:
                data_obj = json.loads(response_text)
                ad_data = self._extract_ad_from_data(data_obj, target_ad_id)
                if ad_data:
                    return ad_data
            except json.JSONDecodeError:
                pass
            
            # Parse response - it may return multiple JSON objects separated by newlines
            for line in response_text.split('\n'):
                line = line.strip()
                if not line:
                    continue
                    
                try:
                    data_obj = json.loads(line)
                    ad_data = self._extract_ad_from_data(data_obj, target_ad_id)
                    if ad_data:
                        return ad_data
                except json.JSONDecodeError:
                    continue
            
            return None
            
        except Exception as e:
            logger.debug(f"Error parsing response: {e}")
            return None
    
    def _extract_ad_from_data(self, data_obj: Dict, target_ad_id: str) -> Optional[Dict]:
        """Extract ad data from parsed JSON object"""
        try:
            # Look for the search results in the response
            if 'data' in data_obj and 'ad_library_main' in data_obj.get('data', {}):
                search_conn = data_obj['data']['ad_library_main'].get('search_results_connection')
                if not search_conn:
                    logger.info("No search_results_connection found in response")
                    return None
                    
                edges = search_conn.get('edges', [])
                logger.info(f"Found {len(edges)} edge(s) in search results")
                
                if not edges:
                    logger.info("No edges found - Facebook returned empty results")
                    return None
                
                for edge in edges:
                    node = edge.get('node', {})
                    collated_results = node.get('collated_results', [])
                    logger.info(f"Edge has {len(collated_results)} collated result(s)")
                    
                    # Find the ad with matching archive ID
                    for ad_data in collated_results:
                        ad_id = ad_data.get('ad_archive_id')
                        logger.info(f"Comparing: Facebook ad {ad_id} vs target {target_ad_id}")
                        if ad_id == target_ad_id:
                            logger.info(f"Found exact match for ad {target_ad_id}")
                            return ad_data
                    
                    # If searching by page, return the first result that matches
                    if collated_results:
                        # Check if any result matches
                        for ad_data in collated_results:
                            if ad_data.get('ad_archive_id') == target_ad_id:
                                return ad_data
            
            return None
            
        except Exception as e:
            logger.debug(f"Error extracting ad from data: {e}")
            return None
    
    def refresh_ad_media_from_facebook(self, ad_id: int) -> Dict:
        """Refresh media URLs for a specific ad"""
        try:
            # Get ad from database
            ad = self.db.query(Ad).filter(Ad.id == ad_id).first()
            
            if not ad:
                return {'success': False, 'error': 'Ad not found'}
            
            ad_archive_id = ad.ad_archive_id
            
            # Try to get page_id from the ad's competitor relationship
            page_id = None
            if ad.competitor and hasattr(ad.competitor, 'page_id'):
                page_id = ad.competitor.page_id
                logger.info(f"Refreshing media for ad {ad_id} (archive_id: {ad_archive_id}, page_id: {page_id})")
            else:
                logger.info(f"Refreshing media for ad {ad_id} (archive_id: {ad_archive_id})")
            
            # Fetch fresh data from Facebook with optional page_id
            ad_data = self.fetch_ad_from_facebook(ad_archive_id, page_id=page_id)
            
            if not ad_data:
                return {
                    'success': False, 
                    'error': f'Ad {ad_archive_id} not found in Facebook Ad Library. The ad may have been deleted or is no longer available.'
                }
            
            # Extract URLs
            urls = self.extract_urls_from_ad_data(ad_data)
            
            # Get old URLs from creatives
            old_creatives = ad.creatives or {}
            old_media_url = None
            
            # Handle both dict and list formats for creatives
            if isinstance(old_creatives, dict):
                if old_creatives.get('media') and isinstance(old_creatives['media'], list) and len(old_creatives['media']) > 0:
                    old_media_url = old_creatives['media'][0].get('url') if isinstance(old_creatives['media'][0], dict) else None
                old_text = old_creatives.get('text', '')
                old_cta = old_creatives.get('cta', '')
            elif isinstance(old_creatives, list) and len(old_creatives) > 0:
                # If creatives is a list, get first creative
                first_creative = old_creatives[0]
                if isinstance(first_creative, dict) and first_creative.get('media'):
                    media_list = first_creative['media']
                    if isinstance(media_list, list) and len(media_list) > 0:
                        old_media_url = media_list[0].get('url') if isinstance(media_list[0], dict) else None
                old_text = first_creative.get('body', '') if isinstance(first_creative, dict) else ''
                old_cta = first_creative.get('cta', {}).get('text', '') if isinstance(first_creative, dict) else ''
            else:
                old_text = ''
                old_cta = ''
            
            # Update creatives with fresh URLs - MUST be a list format to match system
            media_list = []
            
            # Add videos first
            for video_url in urls['video_urls']:
                media_list.append({
                    'type': 'Video',
                    'url': video_url
                })
            
            # Then images
            for image_url in urls['image_urls']:
                media_list.append({
                    'type': 'Image',
                    'url': image_url
                })
            
            # Build creatives in LIST format (not dict) to match database structure
            new_creatives = [{
                'id': f"creative_{i}",
                'media': [media] if media else [],
                'body': old_text,
                'cta': {'text': old_cta} if old_cta else None,
                'title': '',
                'caption': ''
            } for i, media in enumerate(media_list)]
            
            # If no media, create at least one creative with text
            if not new_creatives and old_text:
                new_creatives = [{
                    'id': 'creative_0',
                    'media': [],
                    'body': old_text,
                    'cta': {'text': old_cta} if old_cta else None,
                    'title': '',
                    'caption': ''
                }]
            
            # Update the ad
            ad.creatives = new_creatives
            ad.raw_data = ad_data  # Update raw data too
            
            self.db.commit()
            
            new_media_url = media_list[0]['url'] if media_list else None
            
            logger.info(f"Successfully refreshed media for ad {ad_id}")
            
            return {
                'success': True,
                'old_media_url': old_media_url,
                'new_media_url': new_media_url,
                'total_urls': len(urls['video_urls']) + len(urls['image_urls'])
            }
        
        except Exception as e:
            logger.error(f"Error refreshing ad {ad_id}: {e}")
            self.db.rollback()
            return {'success': False, 'error': str(e)}
    
    def refresh_multiple_ads(self, ad_ids: List[int]) -> Dict:
        """Refresh media URLs for multiple ads"""
        results = {
            'total': len(ad_ids),
            'successful': 0,
            'failed': 0,
            'details': []
        }
        
        for ad_id in ad_ids:
            result = self.refresh_ad_media_from_facebook(ad_id)
            
            if result['success']:
                results['successful'] += 1
            else:
                results['failed'] += 1
            
            results['details'].append({
                'ad_id': ad_id,
                **result
            })
        
        return results
