#!/usr/bin/env python3
"""
Example scraper demonstrating how to use the Data Ingestion Service.

This is a template that external scraping scripts should follow.
The scraper's only job is to collect ad data and send it to the ingestion service.
All database logic and AI analysis is handled by the main application.
"""

import requests
import json
import time
from datetime import datetime
from typing import List, Dict, Any


class AdIngestionClient:
    """
    Simple client for interacting with the Data Ingestion Service.
    
    This client handles authentication and API communication,
    allowing scrapers to focus on data collection.
    """
    
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'X-API-Key': api_key,
            'Content-Type': 'application/json',
            'User-Agent': 'AdScraper/1.0'
        })
    
    def ingest_single_ad(self, ad_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ingest a single ad into the system.
        
        Args:
            ad_data: Dictionary containing ad information
            
        Returns:
            API response as dictionary
        """
        try:
            response = self.session.post(
                f"{self.base_url}/internal/ingest",
                json=ad_data,
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error ingesting ad: {e}")
            return {"success": False, "error": str(e)}
    
    def ingest_batch_ads(self, ads_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Ingest multiple ads in batch.
        
        Args:
            ads_data: List of ad dictionaries
            
        Returns:
            API response as dictionary
        """
        try:
            response = self.session.post(
                f"{self.base_url}/internal/ingest/batch",
                json=ads_data,
                timeout=60
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error in batch ingestion: {e}")
            return {"success": False, "error": str(e)}
    
    def get_ingestion_stats(self) -> Dict[str, Any]:
        """Get ingestion statistics."""
        try:
            response = self.session.get(
                f"{self.base_url}/internal/stats",
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error getting stats: {e}")
            return {"error": str(e)}
    
    def test_connection(self) -> bool:
        """Test if connection to ingestion service is working."""
        try:
            response = self.session.get(
                f"{self.base_url}/internal/health",
                timeout=10
            )
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False


def scrape_facebook_ads(page_id: str, competitor_name: str) -> List[Dict[str, Any]]:
    """
    Example scraper function that would collect Facebook ads.
    
    In a real implementation, this would use the Facebook Ad Library API
    or other scraping techniques to collect actual ad data.
    """
    print(f"🔍 Scraping ads for {competitor_name} (page_id: {page_id})")
    
    # Simulate scraping process
    time.sleep(1)
    
    # Example scraped data (would be real data from Facebook API)
    scraped_ads = [
        {
            "ad_archive_id": f"scraped_{page_id}_{int(time.time())}_1",
            "competitor": {
                "name": competitor_name,
                "page_id": page_id
            },
            "ad_copy": f"🏢 Experience luxury living in Dubai! New project by {competitor_name}. Book your viewing today.",
            "media_type": "video",
            "media_url": "https://example.com/video1.mp4",
            "landing_page_url": "https://example.com/property1",
            "page_name": competitor_name,
            "publisher_platform": ["FACEBOOK", "INSTAGRAM"],
            "impressions_text": "1,000-5,000",
            "cta_text": "Learn More",
            "cta_type": "LEARN_MORE",
            "raw_data": {
                "source": "facebook_ad_library",
                "scraped_at": datetime.utcnow().isoformat(),
                "scraper_version": "1.0"
            }
        },
        {
            "ad_archive_id": f"scraped_{page_id}_{int(time.time())}_2",
            "competitor": {
                "name": competitor_name,
                "page_id": page_id
            },
            "ad_copy": f"🏡 Discover premium properties in Dubai with {competitor_name}. Limited time offer!",
            "media_type": "image",
            "media_url": "https://example.com/image1.jpg",
            "landing_page_url": "https://example.com/property2",
            "page_name": competitor_name,
            "publisher_platform": ["FACEBOOK"],
            "impressions_text": "500-1,000",
            "cta_text": "Sign Up",
            "cta_type": "SIGN_UP",
            "raw_data": {
                "source": "facebook_ad_library",
                "scraped_at": datetime.utcnow().isoformat(),
                "scraper_version": "1.0"
            }
        }
    ]
    
    print(f"✅ Found {len(scraped_ads)} ads")
    return scraped_ads


def main():
    """
    Main scraper function demonstrating the integration pattern.
    
    This shows how external scrapers should be structured:
    1. Configure the ingestion client
    2. Scrape data from external sources
    3. Send data to ingestion service
    4. Handle responses appropriately
    """
    
    # Configuration
    API_BASE_URL = "http://localhost:8000/api/v1"
    API_KEY = "your-super-secret-key-change-this-in-production-internal"
    
    # Initialize ingestion client
    print("🚀 Starting Ad Scraper")
    print("=" * 50)
    
    client = AdIngestionClient(API_BASE_URL, API_KEY)
    
    # Test connection
    print("🔍 Testing connection to ingestion service...")
    if client.test_connection():
        print("✅ Connection successful")
    else:
        print("❌ Connection failed - check API key and service status")
        return
    
    # Competitors to scrape
    competitors = [
        {"name": "Emaar Properties", "page_id": "emaar_dubai_123"},
        {"name": "DAMAC Properties", "page_id": "damac_dubai_456"},
        {"name": "Dubai Properties", "page_id": "dubai_prop_789"}
    ]
    
    total_ads_scraped = 0
    total_ads_ingested = 0
    
    # Scrape ads for each competitor
    for competitor in competitors:
        print(f"\n📋 Processing: {competitor['name']}")
        print("-" * 40)
        
        # Scrape ads (this would be real scraping logic)
        ads_data = scrape_facebook_ads(competitor["page_id"], competitor["name"])
        total_ads_scraped += len(ads_data)
        
        # Ingest ads using batch method for efficiency
        if ads_data:
            result = client.ingest_batch_ads(ads_data)
            
            if result.get("successful", 0) > 0:
                print(f"✅ Ingested {result['successful']}/{result['total_ads']} ads")
                total_ads_ingested += result["successful"]
                
                if result.get("failed", 0) > 0:
                    print(f"⚠️  {result['failed']} ads failed to ingest")
            else:
                print(f"❌ Batch ingestion failed: {result.get('error', 'Unknown error')}")
        else:
            print("ℹ️  No ads found for this competitor")
    
    # Get final statistics
    print(f"\n📊 SCRAPING SUMMARY")
    print("=" * 50)
    print(f"Total ads scraped: {total_ads_scraped}")
    print(f"Total ads ingested: {total_ads_ingested}")
    
    # Show ingestion statistics
    print(f"\n📈 Current system statistics:")
    stats = client.get_ingestion_stats()
    if "error" not in stats:
        print(f"  Total ads in system: {stats.get('total_ads', 'N/A')}")
        print(f"  Total competitors: {stats.get('total_competitors', 'N/A')}")
        print(f"  Recent ads (24h): {stats.get('recent_ads_24h', 'N/A')}")
    
    print(f"\n🎉 Scraping completed! AI analysis tasks have been automatically triggered.")
    print(f"📝 Check the task monitoring endpoints to see analysis progress.")


if __name__ == "__main__":
    main() 