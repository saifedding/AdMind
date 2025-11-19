from celery import shared_task
from datetime import datetime
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


@shared_task(bind=True, time_limit=900, soft_time_limit=840)
def generate_veo_video_task(
    self,
    prompt: str,
    aspect_ratio: str = "VIDEO_ASPECT_RATIO_PORTRAIT",
    video_model_key: str = "veo_3_1_t2v_portrait",
    seed: int = 9831,
    ad_id: Optional[int] = None,
    timeout_sec: int = 600,
    poll_interval_sec: int = 5,
) -> Dict[str, Any]:
    """
    Async Celery task for generating Veo videos.
    
    This allows multiple video generations to run concurrently without blocking
    the API endpoint. The frontend can poll for task status.
    
    Args:
        prompt: Text prompt for video generation
        aspect_ratio: Video aspect ratio (e.g., VIDEO_ASPECT_RATIO_PORTRAIT)
        video_model_key: Veo model key to use
        seed: Random seed for generation
        ad_id: Optional ad ID to associate with generation
        timeout_sec: Max time to wait for generation
        poll_interval_sec: How often to poll for status
        
    Returns:
        Dict with success status, video_url, and metadata
    """
    task_id = self.request.id
    logger.info(f"Starting Veo video generation task {task_id}")
    
    try:
        # Import here to avoid circular imports
        from app.services.google_ai_service import GoogleAIService
        from app.database import SessionLocal
        from app.models import VeoGeneration
        import hashlib
        
        # Update task state to show progress
        self.update_state(
            state='PROGRESS',
            meta={
                'status': 'Initializing video generation...',
                'progress': 0,
                'timestamp': datetime.utcnow().isoformat()
            }
        )
        
        # Initialize Google AI service
        service = GoogleAIService()
        
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={
                'status': 'Starting video generation with Veo API...',
                'progress': 10,
                'timestamp': datetime.utcnow().isoformat()
            }
        )
        
        # Start video generation
        start_time = datetime.utcnow()
        result = service.generate_video_from_prompt(
            prompt=prompt,
            aspect_ratio=aspect_ratio,
            video_model_key=video_model_key,
            seed=seed,
            timeout_sec=timeout_sec,
            poll_interval_sec=poll_interval_sec,
        )
        
        # Update progress
        self.update_state(
            state='PROGRESS',
            meta={
                'status': 'Video generated, extracting URL...',
                'progress': 90,
                'timestamp': datetime.utcnow().isoformat()
            }
        )
        
        # Extract video URL from result
        def _find_first_url(obj: Any) -> Optional[str]:
            if isinstance(obj, str) and obj.startswith("http"):
                return obj
            if isinstance(obj, dict):
                for v in obj.values():
                    found = _find_first_url(v)
                    if found:
                        return found
            if isinstance(obj, list):
                for item in obj:
                    found = _find_first_url(item)
                    if found:
                        return found
            return None
        
        video_url = _find_first_url(result) if isinstance(result, dict) else None
        
        if not video_url:
            raise RuntimeError("No video URL found in generation result")
        
        # Calculate generation time
        end_time = datetime.utcnow()
        generation_time = (end_time - start_time).total_seconds()
        
        # Save to database if ad_id provided
        generation_id = None
        if ad_id:
            try:
                db = SessionLocal()
                try:
                    # Create prompt hash for versioning
                    prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()[:16]
                    
                    # Check if generation with same prompt exists
                    existing = db.query(VeoGeneration).filter(
                        VeoGeneration.ad_id == ad_id,
                        VeoGeneration.prompt_hash == prompt_hash,
                        VeoGeneration.is_current == 1
                    ).first()
                    
                    if existing:
                        # Archive existing generation
                        existing.is_current = 0
                        version_number = existing.version_number + 1
                    else:
                        version_number = 1
                    
                    # Create new generation record
                    generation = VeoGeneration(
                        ad_id=ad_id,
                        prompt=prompt,
                        prompt_hash=prompt_hash,
                        version_number=version_number,
                        is_current=1,
                        video_url=video_url,
                        model_key=video_model_key,
                        aspect_ratio=aspect_ratio,
                        seed=seed,
                        generation_metadata={
                            'result': result,
                            'actual_time': generation_time,
                            'task_id': task_id
                        }
                    )
                    db.add(generation)
                    db.commit()
                    db.refresh(generation)
                    generation_id = generation.id
                    logger.info(f"Saved generation {generation_id} to database")
                finally:
                    db.close()
            except Exception as db_error:
                logger.error(f"Failed to save generation to database: {db_error}")
                # Don't fail the task if DB save fails
        
        # Return success result
        return {
            'task_id': task_id,
            'success': True,
            'video_url': video_url,
            'generation_id': generation_id,
            'generation_time': generation_time,
            'result': result,
            'prompt': prompt,
            'model_key': video_model_key,
            'aspect_ratio': aspect_ratio,
            'seed': seed,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as exc:
        error_msg = str(exc)
        logger.error(f"Veo video generation failed (task {task_id}): {error_msg}")
        
        # Re-raise to mark task as failed
        # Celery will automatically store the exception
        raise
