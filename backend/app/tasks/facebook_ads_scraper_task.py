from celery import current_task
from sqlalchemy.orm import Session
from datetime import datetime
import logging
from typing import Dict, List, Optional
import json

from app.celery_worker import celery_app
from app.database import get_db
from app.services.facebook_ads_scraper import FacebookAdsScraperService, FacebookAdsScraperConfig

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="facebook_ads_scraper.scrape_ads")
def scrape_facebook_ads_task(
    self,
    config: Dict = None,
    view_all_page_id: str = None,
    countries: List[str] = None,
    max_pages: int = 10,
    delay_between_requests: int = 1
):
    """
    Celery task for scraping Facebook Ads Library data
    
    Args:
        config: Optional dictionary with scraper configuration
        view_all_page_id: Page ID to scrape ads from
        countries: List of country codes to search in
        max_pages: Maximum number of pages to scrape
        delay_between_requests: Delay between requests in seconds
    """
    task_id = current_task.request.id
    logger.info(f"Starting Facebook Ads scraping task: {task_id}")

    # Get database session
    db = next(get_db())

    try:
        # Create scraper service
        scraper = FacebookAdsScraperService(db)
        # Create configuration
        scraper_config = FacebookAdsScraperConfig(
            view_all_page_id=view_all_page_id or (config.get('view_all_page_id') if config else None),
            countries=countries or (config.get('countries') if config else None),
            max_pages=max_pages,
            delay_between_requests=delay_between_requests
        )
        # Update config with any additional parameters
        if config:
            for key, value in config.items():
                if hasattr(scraper_config, key) and key not in ['view_all_page_id', 'countries', 'max_pages', 'delay_between_requests']:
                    setattr(scraper_config, key, value)
        # Scrape ads
        all_ads_data, all_json_responses, enhanced_data, stats = scraper.scrape_ads(scraper_config)
        # Save to database if requested
        if scraper_config.save_json and all_json_responses:
            # Save raw JSON responses to file
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"facebook_ads_{scraper_config.view_all_page_id}_{timestamp}.json"
            with open(filename, "w") as f:
                json.dump(all_json_responses, f)
            logger.info(f"Saved raw JSON responses to {filename}")
        
        # Return stats
        return {
            "task_id": task_id,
            "stats": stats,
            "config": {
                "view_all_page_id": scraper_config.view_all_page_id,
                "countries": scraper_config.countries,
                "max_pages": scraper_config.max_pages
            },
            "enhanced_data_summary": {
                "advertiser_info": enhanced_data.get("advertiser_info", {}),
                "campaigns_count": len(enhanced_data.get("campaigns", [])),
                "total_ads": sum(len(c.get("ads", [])) for c in enhanced_data.get("campaigns", []))
            }
        }
    except Exception as e:
        logger.error(f"Error in Facebook Ads scraping task: {str(e)}")
        raise
    finally:
        db.close()


@celery_app.task(bind=True, name="facebook_ads_scraper.scrape_competitor_ads")
def scrape_competitor_ads_task(
    self,
    competitor_page_id: str,
    countries: List[str] = None,
    max_pages: int = 5,
    delay_between_requests: int = 1,
    active_status: str = "ALL",
    ad_type: str = "ALL",
    media_type: str = "ALL",
    save_json: bool = False
):
    """
    Celery task for scraping ads from a specific competitor page
    
    Args:
        competitor_page_id: Facebook page ID of the competitor
        countries: List of country codes to search in
        max_pages: Maximum number of pages to scrape
        delay_between_requests: Delay between requests in seconds
        active_status: Filter by ad status (ALL, ACTIVE, INACTIVE)
        ad_type: Filter by ad type (ALL, POLITICAL_AND_ISSUE_ADS, etc.)
        media_type: Filter by media type (ALL, VIDEO, IMAGE, etc.)
        save_json: Whether to save raw JSON responses to file
    """
    task_id = self.request.id
    logger.info(f"Starting competitor ads scraping task: {task_id} for page ID: {competitor_page_id}")
    
    # Get database session
    db = next(get_db())
    
    try:
        # Create scraper service
        scraper_service = FacebookAdsScraperService(db)
        
        # Create scraper configuration for specific competitor
        scraper_config = FacebookAdsScraperConfig(
            view_all_page_id=competitor_page_id,
            countries=countries or ['AE'],
            max_pages=max_pages,
            delay_between_requests=delay_between_requests,
            search_type='page',  # Ensure we're searching by page
            active_status=active_status,
            ad_type=ad_type,
            media_type=media_type,
            save_json=save_json
            )
            
        # Scrape ads
        all_ads_data, all_json_responses, enhanced_data, stats = scraper_service.scrape_ads(scraper_config)
            
        # Save raw JSON responses to file if requested
        if save_json and all_json_responses:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"facebook_ads_competitor_{competitor_page_id}_{timestamp}.json"
            with open(filename, "w") as f:
                json.dump(all_json_responses, f)
            logger.info(f"Saved raw JSON responses to {filename}")

        # Prepare final results
        results = {
            'success': True,
            'competitor_page_id': competitor_page_id,
            'total_ads_scraped': stats.get('total_processed', 0),
            'database_stats': stats,
            'completion_time': datetime.utcnow().isoformat(),
            'task_id': task_id,
            'enhanced_data_summary': {
                "advertiser_info": enhanced_data.get("advertiser_info", {}),
                "campaigns_count": len(enhanced_data.get("campaigns", [])),
                "total_ads": sum(len(c.get("ads", [])) for c in enhanced_data.get("campaigns", []))
            }
        }
        logger.info(f"Competitor ads scraping task completed successfully. Results: {results}")
        return results
    except Exception as e:
        logger.error(f"Error in competitor ads scraping task: {str(e)}")
        db.rollback()
        return {
            'success': False,
            'error': str(e),
            'competitor_page_id': competitor_page_id,
            'task_id': task_id,
            'completion_time': datetime.utcnow().isoformat()
        }
    finally:
        db.commit()
        db.close()


@celery_app.task(bind=True, name="facebook_ads_scraper.get_task_status")
def get_facebook_ads_task_status(self, task_id: str):
    """
    Get the status of a Facebook Ads scraping task
    
    Args:
        task_id: ID of the task to check
    """
    try:
        # Get task result
        task_result = celery_app.AsyncResult(task_id)
        
        if task_result.state == 'PENDING':
            response = {
                'task_id': task_id,
                'state': task_result.state,
                'status': 'Task is waiting to be processed'
            }
        elif task_result.state == 'PROGRESS':
            response = {
                'task_id': task_id,
                'state': task_result.state,
                'progress': task_result.info
            }
        elif task_result.state == 'SUCCESS':
            response = {
                'task_id': task_id,
                'state': task_result.state,
                'result': task_result.result
            }
        else:
            # Task failed
            response = {
                'task_id': task_id,
                'state': task_result.state,
                'error': str(task_result.info)
            }
        
        return response
        
    except Exception as e:
        logger.error(f"Error getting task status: {str(e)}")
        return {
            'task_id': task_id,
            'state': 'ERROR',
            'error': f'Failed to get task status: {str(e)}'
        } 