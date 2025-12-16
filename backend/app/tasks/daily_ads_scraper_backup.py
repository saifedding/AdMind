from celery import current_task
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Optional

from app.celery_worker import celery_app
from app.database import get_db
from app.models.competitor import Competitor
from app.models.ad import Ad
from app.services.facebook_ads_scraper import FacebookAdsScraperService, FacebookAdsScraperConfig

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="daily_ads_scraper.scrape_new_ads_daily")
def scrape_new_ads_daily_task(
    self,
    countries: List[str] = None,
    max_pages_per_competitor: int = 3,
    delay_between_requests: int = 2,
    hours_lookback: int = 24,
    min_duration_days: int = None,
    active_status: str = "active"
):
    """
    Daily task to scrape new ads from all active competitors.
    
    Args:
        countries: List of country codes to search in
        max_pages_per_competitor: Maximum number of pages to scrape per competitor
        delay_between_requests: Delay between requests in seconds
        hours_lookback: How many hours back to look for new ads (default: 24)
        min_duration_days: Minimum number of days an ad should be running
        active_status: Filter by ad status (active, inactive, or all)
    """
    task_id = current_task.request.id
    logger.info(f"Starting daily new ads scraping task: {task_id}")

    # Get database session
    db = next(get_db())

    try:
        # Get all active competitors
        active_competitors = db.query(Competitor).filter(
            Competitor.is_active == True
        ).all()

        if not active_competitors:
            logger.warning("No active competitors found")
            return {
                "task_id": task_id,
                "status": "completed",
                "message": "No active competitors found",
                "competitors_processed": 0,
                "total_new_ads": 0
            }

        logger.info(f"Found {len(active_competitors)} active competitors to process")

        results = {
            "task_id": task_id,
            "start_time": datetime.utcnow().isoformat(),
            "competitors_processed": 0,
            "total_new_ads": 0,
            "total_processed_ads": 0,
            "competitors_results": [],
            "errors": []
        }

        # Process each competitor
        for competitor in active_competitors:
            try:
                logger.info(f"Processing competitor: {competitor.name} (Page ID: {competitor.page_id})")

                # Get the latest ad date for this competitor to filter for new ads only
                latest_ad = db.query(Ad).filter(
                    Ad.competitor_id == competitor.id
                ).order_by(Ad.created_at.desc()).first()

                # Calculate start date for new ads (either latest ad date or N hours ago)
                if latest_ad:
                    start_date = latest_ad.created_at
                    logger.info(f"Latest ad for {competitor.name} was on {start_date}")
                else:
                    start_date = datetime.utcnow() - timedelta(hours=hours_lookback)
                    logger.info(f"No previous ads for {competitor.name}, looking back {hours_lookback} hours")

                # Create scraper configuration for this competitor
                scraper = FacebookAdsScraperService(db, min_duration_days)
                scraper_config = FacebookAdsScraperConfig(
                    view_all_page_id=competitor.page_id,
                    countries=countries or ['AE', 'US', 'UK'],  # Default countries
                    max_pages=max_pages_per_competitor,
                    delay_between_requests=delay_between_requests,
                    search_type='page',
                    active_status=active_status,
                    ad_type='ALL',
                    media_type='all',
                    save_json=False
                )

                # Scrape ads for this competitor
                all_ads_data, all_json_responses, enhanced_data, stats = scraper.scrape_ads(scraper_config)

                # Filter for truly new ads based on creation date
                if enhanced_data and 'campaigns' in enhanced_data:
                    new_ads_count = 0
                    for campaign in enhanced_data['campaigns']:
                        for ad in campaign.get('ads', []):
                            # Check if this ad is actually new
                            ad_archive_id = ad.get('ad_archive_id')
                            if ad_archive_id:
                                existing_ad = db.query(Ad).filter(
                                    Ad.ad_archive_id == ad_archive_id
                                ).first()
                                if not existing_ad:
                                    new_ads_count += 1

                    stats['new_ads_count'] = new_ads_count
                else:
                    stats['new_ads_count'] = 0

                competitor_result = {
                    "competitor_id": competitor.id,
                    "competitor_name": competitor.name,
                    "page_id": competitor.page_id,
                    "stats": stats,
                    "processed_at": datetime.utcnow().isoformat()
                }

                results["competitors_results"].append(competitor_result)
                results["competitors_processed"] += 1
                results["total_new_ads"] += stats.get('new_ads_count', 0)
                results["total_processed_ads"] += stats.get('total_processed', 0)

                logger.info(f"Completed {competitor.name}: {stats.get('new_ads_count', 0)} new ads found")

            except Exception as e:
                error_msg = f"Error processing competitor {competitor.name}: {str(e)}"
                logger.error(error_msg)
                results["errors"].append({
                    "competitor_id": competitor.id,
                    "competitor_name": competitor.name,
                    "error": error_msg
                })

        # Finalize results
        results["end_time"] = datetime.utcnow().isoformat()
        results["status"] = "completed"
        
        # Format result to match frontend expectations (similar to single competitor scraping)
        results["success"] = True
        results["competitor_page_id"] = "multiple"
        results["total_ads_scraped"] = results["total_processed_ads"]
        results["completion_time"] = results["end_time"]
        results["database_stats"] = {
            "total_processed": results["total_processed_ads"],
            "created": results["total_new_ads"],
            "updated": 0,  # Can be calculated if needed
            "errors": len(results["errors"]),
            "competitors_created": 0,
            "competitors_updated": results["competitors_processed"]
        }
        
        logger.info(f"Daily ads scraping completed. Processed {results['competitors_processed']} competitors, "
                   f"found {results['total_new_ads']} new ads total")

        return results

    except Exception as e:
        logger.error(f"Error in daily ads scraping task: {str(e)}")
        return {
            "task_id": task_id,
            "status": "failed",
            "error": str(e),
            "end_time": datetime.utcnow().isoformat()
        }
    finally:
        db.close()


@celery_app.task(bind=True, name="daily_ads_scraper.scrape_specific_competitors")
def scrape_specific_competitors_task(
    self,
    competitor_ids: List[int],
    countries: List[str] = None,
    max_pages_per_competitor: int = 3,
    delay_between_requests: int = 2,
    hours_lookback: int = 24,
    min_duration_days: int = None,
    active_status: str = "active"
):
    """
    Task to scrape new ads from specific competitors.
    
    Args:
        competitor_ids: List of competitor IDs to scrape
        countries: List of country codes to search in
        max_pages_per_competitor: Maximum number of pages to scrape per competitor
        delay_between_requests: Delay between requests in seconds
        hours_lookback: How many hours back to look for new ads (default: 24)
        min_duration_days: Minimum number of days an ad should be running
        active_status: Filter by ad status (active, inactive, or all)
    """
    task_id = current_task.request.id
    logger.info(f"Starting specific competitors scraping task: {task_id}")

    # Get database session
    db = next(get_db())

    try:
        # Get specified competitors
        competitors = db.query(Competitor).filter(
            and_(
                Competitor.id.in_(competitor_ids),
                Competitor.is_active == True
            )
        ).all()

        if not competitors:
            logger.warning("No active competitors found with the specified IDs")
            return {
                "task_id": task_id,
                "status": "completed",
                "message": "No active competitors found with the specified IDs",
                "competitors_processed": 0,
                "total_new_ads": 0
            }

        logger.info(f"Found {len(competitors)} competitors to process")

        results = {
            "task_id": task_id,
            "start_time": datetime.utcnow().isoformat(),
            "competitors_processed": 0,
            "total_new_ads": 0,
            "total_processed_ads": 0,
            "competitors_results": [],
            "errors": []
        }

        # Process each competitor (using same logic as daily task)
        for competitor in competitors:
            try:
                logger.info(f"Processing competitor: {competitor.name} (Page ID: {competitor.page_id})")

                # Get the latest ad date for this competitor to filter for new ads only
                latest_ad = db.query(Ad).filter(
                    Ad.competitor_id == competitor.id
                ).order_by(Ad.created_at.desc()).first()

                # Calculate start date for new ads (either latest ad date or N hours ago)
                if latest_ad:
                    start_date = latest_ad.created_at
                    logger.info(f"Latest ad for {competitor.name} was on {start_date}")
                else:
                    start_date = datetime.utcnow() - timedelta(hours=hours_lookback)
                    logger.info(f"No previous ads for {competitor.name}, looking back {hours_lookback} hours")

                # Create scraper configuration for this competitor
                scraper = FacebookAdsScraperService(db, min_duration_days)
                scraper_config = FacebookAdsScraperConfig(
                    view_all_page_id=competitor.page_id,
                    countries=countries or ['AE', 'US', 'UK'],
                    max_pages=max_pages_per_competitor,
                    delay_between_requests=delay_between_requests,
                    search_type='page',
                    active_status=active_status,
                    ad_type='ALL',
                    media_type='all',
                    save_json=False
                )

                # Scrape ads for this competitor
                all_ads_data, all_json_responses, enhanced_data, stats = scraper.scrape_ads(scraper_config)

                # Filter for truly new ads based on creation date
                if enhanced_data and 'campaigns' in enhanced_data:
                    new_ads_count = 0
                    for campaign in enhanced_data['campaigns']:
                        for ad in campaign.get('ads', []):
                            # Check if this ad is actually new
                            ad_archive_id = ad.get('ad_archive_id')
                            if ad_archive_id:
                                existing_ad = db.query(Ad).filter(
                                    Ad.ad_archive_id == ad_archive_id
                                ).first()
                                if not existing_ad:
                                    new_ads_count += 1

                    stats['new_ads_count'] = new_ads_count
                else:
                    stats['new_ads_count'] = 0

                competitor_result = {
                    "competitor_id": competitor.id,
                    "competitor_name": competitor.name,
                    "page_id": competitor.page_id,
                    "stats": stats,
                    "processed_at": datetime.utcnow().isoformat()
                }

                results["competitors_results"].append(competitor_result)
                results["competitors_processed"] += 1
                results["total_new_ads"] += stats.get('new_ads_count', 0)
                results["total_processed_ads"] += stats.get('total_processed', 0)

                logger.info(f"Completed {competitor.name}: {stats.get('new_ads_count', 0)} new ads found")

            except Exception as e:
                error_msg = f"Error processing competitor {competitor.name}: {str(e)}"
                logger.error(error_msg)
                results["errors"].append({
                    "competitor_id": competitor.id,
                    "competitor_name": competitor.name,
                    "error": error_msg
                })

        # Finalize results
        results["end_time"] = datetime.utcnow().isoformat()
        results["status"] = "completed"
        
        # Format result to match frontend expectations
        results["success"] = True
        results["competitor_page_id"] = "multiple" if len(competitors) > 1 else competitors[0].page_id if competitors else "unknown"
        results["total_ads_scraped"] = results["total_processed_ads"]
        results["completion_time"] = results["end_time"]
        results["database_stats"] = {
            "total_processed": results["total_processed_ads"],
            "created": results["total_new_ads"],
            "updated": 0,
            "errors": len(results["errors"]),
            "competitors_created": 0,
            "competitors_updated": results["competitors_processed"]
        }
        
        logger.info(f"Specific competitors scraping completed. Processed {results['competitors_processed']} competitors")

        return results

    except Exception as e:
        logger.error(f"Error in specific competitors scraping task: {str(e)}")
        return {
            "task_id": task_id,
            "status": "failed",
            "error": str(e),
            "end_time": datetime.utcnow().isoformat()
        }
    finally:
        db.close()