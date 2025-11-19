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

@shared_task(bind=True)
def analyze_ad_video_task(self, ad_id: int, video_url: str, custom_instruction: str = None, instagram_url: str = None) -> Dict[str, Any]:
    """
    Task to download and analyze an ad video using Google AI.
    
    Args:
        ad_id: ID of the ad to analyze
        video_url: URL of the video to analyze
        custom_instruction: Optional custom instruction for the AI
        instagram_url: Optional Instagram URL if different from video_url
        
    Returns:
        Dict with analysis results
    """
    task_id = self.request.id
    logger.info(f"Starting video analysis task {task_id} for ad {ad_id}")
    
    import tempfile
    import os
    import requests as httpx
    import subprocess
    import time
    import json as _json
    from app.services.google_ai_service import GoogleAIService
    from app.models.dto.ad_dto import AnalyzeVideoResponse
    
    try:
        # First: try OpenRouter primary directly with the original video_url (no download)
        if custom_instruction:
            try:
                ai = GoogleAIService()
                logger.info("Trying OpenRouter primary without download (custom instruction)...")
                analysis = ai.generate_transcript_and_analysis(
                    video_url=video_url,
                    custom_instruction=custom_instruction,
                )

                generated_at_val = datetime.utcnow().isoformat()
                parsed_analysis = analysis
                try:
                    if isinstance(analysis, dict) and isinstance(analysis.get('raw'), str):
                        parsed_analysis = _json.loads(analysis['raw'])
                except Exception:
                    parsed_analysis = analysis
                    
                return {
                    "success": True,
                    "used_video_url": video_url,
                    "transcript": parsed_analysis.get('transcript'),
                    "beats": parsed_analysis.get('beats', []),
                    "summary": parsed_analysis.get('summary'),
                    "text_on_video": parsed_analysis.get('text_on_video'),
                    "voice_over": parsed_analysis.get('voice_over'),
                    "storyboard": parsed_analysis.get('storyboard'),
                    "generation_prompts": parsed_analysis.get('generation_prompts', []),
                    "strengths": parsed_analysis.get('strengths'),
                    "recommendations": parsed_analysis.get('recommendations'),
                    "raw": analysis.get('raw') if isinstance(analysis, dict) and 'transcript' not in analysis else None,
                    "message": "OpenRouter analysis (custom) completed",
                    "generated_at": generated_at_val,
                    "source": "openrouter"
                }
            except Exception as e:
                logger.warning(f"OpenRouter primary (custom) failed, will download and use Gemini fallback: {e}")

        # Download video to temp file
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
                tmp_path = tmp.name
            
            # Check if it's an Instagram URL - use yt-dlp to get video with audio
            is_instagram = 'instagram.com' in video_url or 'cdninstagram.com' in video_url or 'fbcdn.net' in video_url
            logger.info(f"Is Instagram URL: {is_instagram}")
            if is_instagram:
                logger.info(f"Detected Instagram URL, using yt-dlp to download with audio")
                
                # Use yt-dlp to download with audio merged in Gemini-compatible format
                start_download = time.time()
                # For Instagram, we need to explicitly merge video+audio since they're separate streams
                cmd = [
                    'yt-dlp',
                    '-f', 'bestvideo+bestaudio/best',  # Merge best video + best audio
                    '--merge-output-format', 'mp4',  # Output as MP4
                    '--no-cache-dir',  # Don't use cache
                    '--force-overwrites',  # Force fresh download
                    '-o', tmp_path,
                    '--no-playlist',
                    '--verbose',  # Verbose output to see what's happening
                    video_url if 'instagram.com/p/' in video_url else (instagram_url or video_url)
                ]
                logger.info(f"Starting yt-dlp download...")
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
                download_time = time.time() - start_download
                
                if result.returncode != 0:
                    logger.error(f"yt-dlp failed: {result.stderr}")
                    # Fallback to direct download if yt-dlp fails
                    logger.info("yt-dlp failed, falling back to direct download")
                    response = httpx.get(video_url, stream=True, timeout=60)
                    response.raise_for_status()
                    with open(tmp_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            f.write(chunk)
                else:
                    logger.info(f"yt-dlp download successful in {download_time:.2f}s")
            else:
                # Direct download for non-Instagram URLs
                logger.info(f"Downloading video from {video_url}")
                response = httpx.get(video_url, stream=True, timeout=60)
                response.raise_for_status()
                with open(tmp_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
            
            # Initialize AI service
            ai = GoogleAIService()
            
            # Generate analysis
            logger.info("Generating analysis with Gemini...")
            analysis = ai.generate_transcript_and_analysis(
                video_path=tmp_path,
                custom_instruction=custom_instruction
            )
            
            # Clean up temp file
            try:
                os.unlink(tmp_path)
            except Exception as e:
                logger.warning(f"Failed to delete temp file {tmp_path}: {e}")
                
            return {
                "success": True,
                "used_video_url": video_url,
                "transcript": analysis.get('transcript'),
                "beats": analysis.get('beats', []),
                "summary": analysis.get('summary'),
                "text_on_video": analysis.get('text_on_video'),
                "voice_over": analysis.get('voice_over'),
                "storyboard": analysis.get('storyboard'),
                "generation_prompts": analysis.get('generation_prompts', []),
                "strengths": analysis.get('strengths'),
                "recommendations": analysis.get('recommendations'),
                "raw": analysis.get('raw'),
                "message": "Analysis completed successfully",
                "generated_at": datetime.utcnow().isoformat(),
                "source": "gemini"
            }
            
        except Exception as e:
            logger.error(f"Error processing video: {str(e)}")
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except:
                    pass
            raise e
            
    except Exception as exc:
        logger.error(f"Video analysis task failed: {str(exc)}")
        self.update_state(
            state='FAILURE',
            meta={
                'error': str(exc),
                'ad_id': ad_id,
                'timestamp': datetime.utcnow().isoformat()
            }
        )
        raise exc