from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv()

# Create Celery instance
celery = Celery(
    "ads_app",
    broker=os.getenv("CELERY_BROKER_URL", "redis://localhost:6379"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379"),
    include=[
        "app.tasks.basic_tasks",
        "app.tasks.ai_analysis_tasks", 
        "app.tasks.facebook_ads_scraper_task"
    ]
)

# Celery configuration
celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Configure periodic tasks - using actual registered tasks
celery.conf.beat_schedule = {
    'scrape-facebook-ads': {
        'task': 'app.tasks.facebook_ads_scraper_task.scrape_facebook_ads_task',
        'schedule': 3600.0,  # Run every hour
    },
}

if __name__ == "__main__":
    celery.start() 