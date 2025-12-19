from celery import current_task
from sqlalchemy.orm import Session
from datetime import datetime
import logging
from typing import Dict, List, Optional
import json
import time

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


@celery_app.task(
    bind=True, 
    name="facebook_ads_scraper.scrape_competitor_ads",
    autoretry_for=(Exception,),
    retry_kwargs={'max_retries': 3, 'countdown': 60},
    retry_backoff=True,
    retry_jitter=True
)
def scrape_competitor_ads_task(
    self,
    competitor_page_id: str,
    countries: List[str] = None,
    max_pages: int = 5,
    delay_between_requests: int = 1,
    active_status: str = "ALL",
    ad_type: str = "ALL",
    media_type: str = "ALL",
    save_json: bool = False,
    date_from: str = None,
    date_to: str = None,
    min_duration_days: int = None
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
        date_from: Start date for filtering ads (YYYY-MM-DD)
        date_to: End date for filtering ads (YYYY-MM-DD)
        min_duration_days: Minimum number of days an ad should be running
    """
    task_id = self.request.id
    logger.info(f"Starting competitor ads scraping task: {task_id} for page ID: {competitor_page_id}")
    
    # Get database session
    db = next(get_db())
    
    try:
        # Create initial TaskStatus record
        from app.models.task_status import TaskStatus
        task_status = TaskStatus(
            task_id=task_id,
            status='running',
            result={
                'competitor_page_id': competitor_page_id,
                'current_step': 'Initializing',
                'progress': 0,
                'message': 'Checking competitor and setting up scraper...'
            }
        )
        db.add(task_status)
        db.commit()
        
        # Update task state to show initialization
        self.update_state(
            state='PROGRESS',
            meta={
                'current_step': 'Initializing',
                'progress': 0,
                'competitor_page_id': competitor_page_id,
                'message': 'Checking competitor and setting up scraper...'
            }
        )
        
        # Check if competitor exists in database
        from app.models.competitor import Competitor
        competitor = db.query(Competitor).filter_by(page_id=competitor_page_id).first()
        if not competitor:
            logger.warning(f"Competitor with page_id {competitor_page_id} not found, skipping scraping")
            warning_result = {
                'success': False,
                'warning': f"Competitor with page_id {competitor_page_id} not found, skipping scraping",
                'competitor_page_id': competitor_page_id,
                'task_id': task_id,
                'completion_time': datetime.utcnow().isoformat()
            }
            
            # Update TaskStatus record to failed
            task_status = db.query(TaskStatus).filter_by(task_id=task_id).first()
            if task_status:
                task_status.status = 'failed'
                task_status.result = warning_result
                db.commit()
            
            return warning_result
        
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={
                'current_step': 'Setting up scraper',
                'progress': 10,
                'competitor_page_id': competitor_page_id,
                'message': f'Configuring scraper for {competitor.name}...'
            }
        )
        
        # Create scraper service with min_duration_days
        scraper_service = FacebookAdsScraperService(db, min_duration_days)
        
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
            save_json=save_json,
            start_date=date_from,
            end_date=date_to
        )
        
        # Update progress before scraping
        self.update_state(
            state='PROGRESS',
            meta={
                'current_step': 'Scraping ads',
                'progress': 20,
                'competitor_page_id': competitor_page_id,
                'message': f'Starting to scrape ads from {competitor.name}...',
                'config': {
                    'countries': countries,
                    'max_pages': max_pages,
                    'active_status': active_status
                },
                'current_page': 0,
                'ads_found': 0,
                'new_ads': 0,
                'updated_ads': 0,
                'filtered_ads': 0
            }
        )
            
        # Scrape ads with real-time progress updates
        all_ads_data, all_json_responses, enhanced_data, stats = scraper_service.scrape_ads_with_progress(
            scraper_config, 
            progress_callback=lambda page, ads_found, new_ads, updated_ads, filtered_ads, message: self.update_state(
                state='PROGRESS',
                meta={
                    'current_step': 'Scraping ads',
                    'progress': min(20 + (page * (60 / max_pages)), 80),
                    'competitor_page_id': competitor_page_id,
                    'message': message,
                    'current_page': page,
                    'ads_found': ads_found,
                    'new_ads': new_ads,
                    'updated_ads': updated_ads,
                    'filtered_ads': filtered_ads,
                    'config': {
                        'countries': countries,
                        'max_pages': max_pages,
                        'active_status': active_status
                    }
                }
            )
        )
        
        # Update progress after scraping
        self.update_state(
            state='PROGRESS',
            meta={
                'current_step': 'Processing results',
                'progress': 80,
                'competitor_page_id': competitor_page_id,
                'message': f'Processing {stats.get("total_processed", 0)} ads...',
                'ads_found': stats.get("total_processed", 0)
            }
        )
            
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
            'ads_collected': stats.get('total_processed', 0),
            'database_stats': stats,
            'completion_time': datetime.utcnow().isoformat(),
            'task_id': task_id,
            'enhanced_data_summary': {
                "advertiser_info": enhanced_data.get("advertiser_info", {}),
                "campaigns_count": len(enhanced_data.get("campaigns", [])),
                "total_ads": sum(len(c.get("ads", [])) for c in enhanced_data.get("campaigns", []))
            }
        }
        
        # Update TaskStatus record to completed
        task_status = db.query(TaskStatus).filter_by(task_id=task_id).first()
        if task_status:
            task_status.status = 'completed'
            task_status.result = results
            db.commit()
        
        logger.info(f"Competitor ads scraping task completed successfully. Results: {results}")
        return results
    except Exception as e:
        logger.error(f"Error in competitor ads scraping task (attempt {self.request.retries + 1}): {str(e)}")
        db.rollback()
        
        # Check if we should retry
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying task in 60 seconds (attempt {self.request.retries + 1}/{self.max_retries})")
            # Update task state to show retry information
            self.update_state(
                state='RETRY',
                meta={
                    'current_retry': self.request.retries + 1,
                    'max_retries': self.max_retries,
                    'error': str(e),
                    'next_retry_in': 60,
                    'competitor_page_id': competitor_page_id
                }
            )
            raise self.retry(countdown=60, exc=e)
        else:
            # Max retries reached, return failure
            logger.error(f"Max retries ({self.max_retries}) reached for competitor {competitor_page_id}")
            failure_result = {
                'success': False,
                'error': str(e),
                'competitor_page_id': competitor_page_id,
                'task_id': task_id,
                'completion_time': datetime.utcnow().isoformat(),
                'retries_attempted': self.request.retries,
                'max_retries': self.max_retries
            }
            
            # Update TaskStatus record to failed
            task_status = db.query(TaskStatus).filter_by(task_id=task_id).first()
            if task_status:
                task_status.status = 'failed'
                task_status.result = failure_result
                db.commit()
            
            return failure_result
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