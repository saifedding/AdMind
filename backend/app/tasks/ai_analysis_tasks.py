from celery import shared_task
from datetime import datetime
import logging
from typing import Dict, Any
from app.services.ai_service import get_ai_service
from celery.app import defaults

logger = logging.getLogger(__name__)

@shared_task(bind=True)
def ai_analysis_task(self, ad_id: int) -> Dict[str, Any]:
    """
    Placeholder AI analysis task that will be triggered after ad ingestion.
    This task will analyze the ad content and generate insights.
    
    Args:
        ad_id: The ID of the ad to analyze
        
    Returns:
        Dict with analysis results
    """
    task_id = self.request.id
    logger.info(f"Starting AI analysis for ad {ad_id} (task: {task_id})")
    
    try:
        # Import here to avoid circular imports
        from app.database import SessionLocal
        from app.models import Ad, AdAnalysis
        
        db = SessionLocal()
        
        # Get the ad record
        ad = db.query(Ad).filter(Ad.id == ad_id).first()
        if not ad:
            raise ValueError(f"Ad with ID {ad_id} not found")
        
        logger.info(f"Analyzing ad: {ad.ad_archive_id} from competitor: {ad.competitor.name}")
        
        # Get AI service instance
        ai_service = get_ai_service()
        
        if not ai_service:
            logger.warning("AI service not configured, using fallback analysis")
            analysis_data = {
                "summary": f"AI analysis not available - fallback analysis for ad {ad.ad_archive_id}",
                "hook_score": 5.0,
                "overall_score": 5.0,
                "target_audience": "General audience",
                "content_themes": [],
                "analysis_version": "v1.0-fallback",
                "confidence_score": 0.0,
                "ai_prompts": {"note": "AI service not configured"},
                "raw_ai_response": {"note": "AI service not configured"},
                "performance_predictions": {},
                "competitor_insights": {},
                "ad_format_analysis": {},
                "effectiveness_analysis": {}
            }
        else:
            # Prepare ad data for AI analysis
            ad_data = {
                "ad_archive_id": ad.ad_archive_id,
                "ad_copy": ad.ad_copy,
                "main_title": ad.main_title,
                "main_body_text": ad.main_body_text,
                "main_caption": ad.main_caption,
                "cta_text": ad.cta_text,
                "media_type": ad.media_type,
                "page_name": ad.page_name,
                "targeted_countries": ad.targeted_countries,
                "card_titles": ad.card_titles,
                "card_bodies": ad.card_bodies
            }
            
            # Call AI service for analysis
            try:
                analysis_data = ai_service.analyze_ad_content(ad_data)
                logger.info(f"AI analysis completed for ad {ad.ad_archive_id}")
            except Exception as ai_error:
                logger.error(f"AI analysis failed for ad {ad.ad_archive_id}: {str(ai_error)}")
                # Use fallback analysis on AI failure
                analysis_data = {
                    "summary": f"AI analysis failed - fallback analysis for ad {ad.ad_archive_id}",
                    "hook_score": 5.0,
                    "overall_score": 5.0,
                    "target_audience": "General audience",
                    "content_themes": [],
                    "analysis_version": "v1.0-fallback",
                    "confidence_score": 0.0,
                    "ai_prompts": {"error": str(ai_error)},
                    "raw_ai_response": {"error": str(ai_error)},
                    "performance_predictions": {},
                    "competitor_insights": {},
                    "ad_format_analysis": {},
                    "effectiveness_analysis": {}
                }
        
        # Check if analysis already exists
        existing_analysis = db.query(AdAnalysis).filter(AdAnalysis.ad_id == ad_id).first()
        
        if existing_analysis:
            # Update existing analysis
            for key, value in analysis_data.items():
                setattr(existing_analysis, key, value)
            existing_analysis.updated_at = datetime.utcnow()
            analysis = existing_analysis
            logger.info(f"Updated existing analysis for ad {ad_id}")
        else:
            # Create new analysis
            analysis = AdAnalysis(
                ad_id=ad_id,
                **analysis_data
            )
            db.add(analysis)
            logger.info(f"Created new analysis for ad {ad_id}")
        
        db.commit()
        
        result = {
            "task_id": task_id,
            "ad_id": ad_id,
            "analysis_id": analysis.id,
            "status": "completed",
            "summary": analysis_data["summary"],
            "overall_score": analysis_data["overall_score"],
            "hook_score": analysis_data["hook_score"],
            "timestamp": datetime.utcnow().isoformat()
        }
        
        logger.info(f"AI analysis completed for ad {ad_id}")
        return result
        
    except Exception as exc:
        logger.error(f"AI analysis failed for ad {ad_id}: {str(exc)}")
        # Update task state with error info
        self.update_state(
            state='FAILURE',
            meta={
                'error': str(exc),
                'ad_id': ad_id,
                'timestamp': datetime.utcnow().isoformat()
            }
        )
        raise exc
    finally:
        if 'db' in locals():
            db.close()

@shared_task
def batch_ai_analysis_task(ad_id_list: list) -> Dict[str, Any]:
    """
    Batch AI analysis task for processing multiple ads at once.
    
    Args:
        ad_id_list: List of ad IDs to analyze
        
    Returns:
        Dict with batch analysis results
    """
    logger.info(f"Starting batch AI analysis for {len(ad_id_list)} ads")
    
    results = []
    failed_ads = []
    
    # Import Celery app to get access to the task registry
    from app.celery import celery
    
    for ad_id in ad_id_list:
        try:
            # Dispatch individual analysis task using the Celery app
            task_sig = celery.signature('app.tasks.ai_analysis_tasks.ai_analysis_task')
            task = task_sig.delay(ad_id)
            results.append({
                "ad_id": ad_id,
                "task_id": task.id,
                "status": "dispatched"
            })
        except Exception as e:
            logger.error(f"Failed to dispatch analysis for ad {ad_id}: {e}")
            failed_ads.append({
                "ad_id": ad_id,
                "error": str(e)
            })
    
    return {
        "total_ads": len(ad_id_list),
        "successful_dispatches": len(results),
        "failed_dispatches": len(failed_ads),
        "results": results,
        "failures": failed_ads,
        "timestamp": datetime.utcnow().isoformat()
    } 