from celery import Celery
from app.core.config import settings
import logging

# Configure logging
logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL))
logger = logging.getLogger(__name__)

# Create Celery instance
celery_app = Celery(
    "ads_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.basic_tasks", 
        "app.tasks.ai_analysis_tasks", 
        "app.tasks.facebook_ads_scraper_task",
        "app.tasks.daily_ads_scraper",
        "app.tasks.veo_generation_tasks"
    ]
)

# Export the celery app for the CLI
app = celery_app

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=settings.CELERY_TASK_TIME_LIMIT,
    task_soft_time_limit=settings.CELERY_TASK_SOFT_TIME_LIMIT,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    worker_log_format="[%(asctime)s: %(levelname)s/%(processName)s] %(message)s",
    worker_task_log_format="[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s",
    broker_connection_retry_on_startup=True,
)

# Configure periodic tasks (Celery Beat) - using actual registered tasks
celery_app.conf.beat_schedule = {
    'daily-new-ads-scraping': {
        'task': 'daily_ads_scraper.scrape_new_ads_daily',
        'schedule': 86400.0,  # Run once daily (24 hours)
        'kwargs': {
            'countries': ['AE', 'US', 'UK'],
            'max_pages_per_competitor': 3,
            'delay_between_requests': 2,
            'hours_lookback': 24,
            'active_status': 'active'
        }
    },
    'scrape-facebook-ads': {
        'task': 'facebook_ads_scraper.scrape_ads',
        'schedule': 3600.0,  # Run every hour (legacy - might want to disable this)
    },
    'batch-ai-analysis': {
        'task': 'app.tasks.ai_analysis_tasks.batch_ai_analysis_task',
        'schedule': 21600.0,  # Run every 6 hours
        'kwargs': {'ad_ids': []}  # Empty list as default
    },
}

# Add Redis broker configuration
celery_app.conf.broker_transport_options = {
    'visibility_timeout': 3600,
    'fanout_prefix': True,
    'fanout_patterns': True
}

if __name__ == "__main__":
    logger.info("Starting Celery worker...")
    celery_app.start() 