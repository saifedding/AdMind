from celery import shared_task
from datetime import datetime
import logging
from typing import Dict, Any, Optional
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
            # Infer a usable video URL from the ad if available
            try:
                ad_dict = ad.to_dict()
                mv = ad_dict.get('main_video_urls') or []
                inferred_video_url = mv[0] if isinstance(mv, list) and mv else ad_dict.get('media_url')
            except Exception:
                inferred_video_url = None
            
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
            # Ensure used_video_url is present when we can infer it
            if isinstance(analysis_data, dict) and inferred_video_url and not analysis_data.get('used_video_url'):
                analysis_data["used_video_url"] = inferred_video_url
        
        # Versioning: archive current and create new current
        current = db.query(AdAnalysis).filter(AdAnalysis.ad_id == ad_id, AdAnalysis.is_current == 1).first()
        if current:
            current.is_current = 0
            version_num = (current.version_number or 1) + 1
            logger.info(f"Archived analysis version {current.version_number} for ad {ad_id}")
        else:
            version_num = 1

        analysis = AdAnalysis(
            ad_id=ad_id,
            is_current=1,
            version_number=version_num,
            **analysis_data
        )
        db.add(analysis)
        logger.info(f"Created new analysis version {version_num} for ad {ad_id}")
        
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
def analyze_ad_video_task(self, ad_id: int, video_url: str, custom_instruction: str = None, instagram_url: str = None, generate_prompts: bool = True) -> Dict[str, Any]:
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
                    generate_prompts=generate_prompts,
                )

                generated_at_val = datetime.utcnow().isoformat()
                parsed_analysis = analysis
                try:
                    if isinstance(analysis, dict) and isinstance(analysis.get('raw'), str):
                        parsed_analysis = _json.loads(analysis['raw'])
                except Exception:
                    parsed_analysis = analysis
                    
                # Persist analysis to AdAnalysis with versioning
                from app.database import SessionLocal
                from app.models.ad_analysis import AdAnalysis
                db = SessionLocal()
                try:
                    current = db.query(AdAnalysis).filter(AdAnalysis.ad_id == ad_id, AdAnalysis.is_current == 1).first()
                    if current:
                        current.is_current = 0
                        version_num = (current.version_number or 1) + 1
                    else:
                        version_num = 1
                    new_a = AdAnalysis(
                        ad_id=ad_id,
                        raw_ai_response=analysis if isinstance(analysis, dict) else parsed_analysis,
                        used_video_url=video_url,
                        summary=parsed_analysis.get('summary'),
                        ai_prompts={"generation_prompts": parsed_analysis.get('generation_prompts', [])} if generate_prompts else None,
                        is_current=1,
                        version_number=version_num
                    )
                    db.add(new_a)
                    db.commit()
                    analysis_id = new_a.id
                except Exception:
                    db.rollback()
                    analysis_id = None
                finally:
                    db.close()
                return {
                    "success": True,
                    "used_video_url": video_url,
                    "transcript": parsed_analysis.get('transcript'),
                    "beats": parsed_analysis.get('beats', []),
                    "summary": parsed_analysis.get('summary'),
                    "text_on_video": parsed_analysis.get('text_on_video'),
                    "voice_over": parsed_analysis.get('voice_over'),
                    "storyboard": parsed_analysis.get('storyboard'),
                    "generation_prompts": (parsed_analysis.get('generation_prompts', []) if (generate_prompts is True) else []),
                    "strengths": parsed_analysis.get('strengths'),
                    "recommendations": parsed_analysis.get('recommendations'),
                    "raw": analysis.get('raw') if isinstance(analysis, dict) and 'transcript' not in analysis else None,
                    "message": "OpenRouter analysis (custom) completed",
                    "generated_at": generated_at_val,
                    "source": "openrouter",
                    "ad_id": ad_id,
                    "analysis_id": analysis_id
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
                file_path=tmp_path,
                custom_instruction=custom_instruction,
                generate_prompts=generate_prompts,
            )
            
            # Clean up temp file
            try:
                os.unlink(tmp_path)
            except Exception as e:
                logger.warning(f"Failed to delete temp file {tmp_path}: {e}")
                
            # Persist analysis to AdAnalysis with versioning
            from app.database import SessionLocal
            from app.models.ad_analysis import AdAnalysis
            db = SessionLocal()
            try:
                current = db.query(AdAnalysis).filter(AdAnalysis.ad_id == ad_id, AdAnalysis.is_current == 1).first()
                if current:
                    current.is_current = 0
                    version_num = (current.version_number or 1) + 1
                else:
                    version_num = 1
                new_a = AdAnalysis(
                    ad_id=ad_id,
                    raw_ai_response=analysis,
                    used_video_url=video_url,
                    summary=analysis.get('summary'),
                    ai_prompts={"generation_prompts": analysis.get('generation_prompts', [])} if generate_prompts else None,
                    is_current=1,
                    version_number=version_num
                )
                db.add(new_a)
                db.commit()
                analysis_id = new_a.id
            except Exception:
                db.rollback()
                analysis_id = None
            finally:
                db.close()
            return {
                "success": True,
                "used_video_url": video_url,
                "transcript": analysis.get('transcript'),
                "beats": analysis.get('beats', []),
                "summary": analysis.get('summary'),
                "text_on_video": analysis.get('text_on_video'),
                "voice_over": analysis.get('voice_over'),
                "storyboard": analysis.get('storyboard'),
                "generation_prompts": (analysis.get('generation_prompts', []) if (generate_prompts is True) else []),
                "strengths": analysis.get('strengths'),
                "recommendations": analysis.get('recommendations'),
                "raw": analysis.get('raw'),
                "message": "Analysis completed successfully",
                "generated_at": datetime.utcnow().isoformat(),
                "source": "gemini",
                "ad_id": ad_id,
                "analysis_id": analysis_id
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

@shared_task(bind=True)
def unified_analysis_task(
    self, 
    ad_id: int, 
    video_url: str = None, 
    custom_instruction: str = None, 
    generate_prompts: bool = True,
    force_reanalyze: bool = False
) -> Dict[str, Any]:
    """
    Unified analysis task that handles analysis for ads from any source.
    
    Args:
        ad_id: ID of the ad to analyze
        video_url: Optional video URL to analyze
        custom_instruction: Optional custom instruction for analysis
        generate_prompts: Whether to generate creative prompts
        force_reanalyze: Whether to force re-analysis even if exists
        
    Returns:
        Dict with analysis results
    """
    task_id = self.request.id
    logger.info(f"Starting unified analysis task {task_id} for ad {ad_id}")
    
    try:
        from app.database import SessionLocal
        from app.models import Ad
        from app.models.ad_analysis import AdAnalysis
        from app.services.google_ai_service import GoogleAIService
        
        db = SessionLocal()
        
        # Get the ad
        ad = db.query(Ad).filter(Ad.id == ad_id).first()
        if not ad:
            raise ValueError(f"Ad with ID {ad_id} not found")
        
        # Check for existing analysis if not forcing re-analysis
        if not force_reanalyze:
            existing_analysis = db.query(AdAnalysis).filter(
                AdAnalysis.ad_id == ad_id,
                AdAnalysis.is_current == 1
            ).first()
            
            if existing_analysis and existing_analysis.raw_ai_response:
                logger.info(f"Using existing analysis for ad {ad_id}")
                return {
                    "success": True,
                    "task_id": task_id,
                    "ad_id": ad_id,
                    "analysis_id": existing_analysis.id,
                    "source": "existing",
                    "message": "Using existing analysis",
                    **existing_analysis.raw_ai_response
                }
        
        # Extract video URL if not provided
        if not video_url:
            video_url = _extract_video_url_from_ad(ad)
        
        if not video_url:
            raise ValueError(f"No video URL found for ad {ad_id}")
        
        # Perform AI analysis
        logger.info(f"Analyzing ad {ad_id} with video URL: {video_url[:50]}...")
        
        ai_service = GoogleAIService()
        analysis_result = ai_service.generate_transcript_and_analysis(
            video_url=video_url,
            generate_prompts=generate_prompts,
            custom_instruction=custom_instruction
        )
        
        # Store analysis with versioning
        current_analysis = db.query(AdAnalysis).filter(
            AdAnalysis.ad_id == ad_id,
            AdAnalysis.is_current == 1
        ).first()
        
        if current_analysis:
            # Archive current analysis
            current_analysis.is_current = 0
            version_number = current_analysis.version_number + 1
            logger.info(f"Archived analysis version {current_analysis.version_number} for ad {ad_id}")
        else:
            version_number = 1
        
        # Add custom instruction to analysis result if provided
        if custom_instruction:
            analysis_result['custom_instruction'] = custom_instruction
        
        # Create new analysis record
        new_analysis = AdAnalysis(
            ad_id=ad_id,
            raw_ai_response=analysis_result,
            used_video_url=video_url,
            is_current=1,
            version_number=version_number,
            summary=analysis_result.get('summary'),
            hook_score=analysis_result.get('hook_score'),
            overall_score=analysis_result.get('overall_score'),
            target_audience=analysis_result.get('target_audience'),
            content_themes=analysis_result.get('content_themes'),
            analysis_version="unified_v1.0"
        )
        
        db.add(new_analysis)
        db.commit()
        db.refresh(new_analysis)
        
        logger.info(f"Created analysis version {version_number} for ad {ad_id}")
        
        # Apply analysis to ad set if applicable
        if ad.ad_set_id:
            _apply_analysis_to_ad_set(db, ad.ad_set_id, analysis_result, video_url, exclude_ad_id=ad_id)
        
        result = {
            "success": True,
            "task_id": task_id,
            "ad_id": ad_id,
            "analysis_id": new_analysis.id,
            "source": "unified_analysis",
            "message": "Analysis completed successfully",
            "generated_at": datetime.utcnow().isoformat(),
            **analysis_result
        }
        
        logger.info(f"Unified analysis completed for ad {ad_id}")
        return result
        
    except Exception as exc:
        logger.error(f"Unified analysis task failed for ad {ad_id}: {str(exc)}")
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


@shared_task(bind=True)
def unified_ad_set_analysis_task(
    self,
    ad_set_id: int,
    representative_ad_id: int,
    custom_instruction: str = None,
    generate_prompts: bool = True,
    force_reanalyze: bool = False
) -> Dict[str, Any]:
    """
    Unified ad set analysis task that analyzes the best ad and applies to all variants.
    
    Args:
        ad_set_id: ID of the ad set to analyze
        representative_ad_id: ID of the best performing ad to use as representative
        custom_instruction: Optional custom instruction for analysis
        generate_prompts: Whether to generate creative prompts
        force_reanalyze: Whether to force re-analysis even if exists
        
    Returns:
        Dict with analysis results
    """
    task_id = self.request.id
    logger.info(f"Starting unified ad set analysis task {task_id} for ad set {ad_set_id}")
    
    try:
        from app.database import SessionLocal
        from app.models import Ad, AdSet
        from app.models.ad_analysis import AdAnalysis
        from app.services.google_ai_service import GoogleAIService
        
        db = SessionLocal()
        
        # Get the ad set
        ad_set = db.query(AdSet).filter(AdSet.id == ad_set_id).first()
        if not ad_set:
            raise ValueError(f"Ad set with ID {ad_set_id} not found")
        
        # Get the representative ad
        representative_ad = db.query(Ad).filter(Ad.id == representative_ad_id).first()
        if not representative_ad:
            raise ValueError(f"Representative ad with ID {representative_ad_id} not found")
        
        # Get all ads in the set
        ads_in_set = db.query(Ad).filter(Ad.ad_set_id == ad_set_id).all()
        
        # Extract video URL from representative ad
        video_url = _extract_video_url_from_ad(representative_ad)
        if not video_url:
            raise ValueError(f"No video URL found for representative ad {representative_ad_id}")
        
        # Perform AI analysis on representative ad
        logger.info(f"Analyzing representative ad {representative_ad_id} for ad set {ad_set_id}")
        
        ai_service = GoogleAIService()
        analysis_result = ai_service.generate_transcript_and_analysis(
            video_url=video_url,
            generate_prompts=generate_prompts,
            custom_instruction=custom_instruction
        )
        
        # Add custom instruction to analysis result if provided
        if custom_instruction:
            analysis_result['custom_instruction'] = custom_instruction
        
        # Apply analysis to all ads in the set
        applied_to_ads = []
        
        for ad in ads_in_set:
            try:
                # Check for existing analysis if not forcing re-analysis
                if not force_reanalyze:
                    existing_analysis = db.query(AdAnalysis).filter(
                        AdAnalysis.ad_id == ad.id,
                        AdAnalysis.is_current == 1
                    ).first()
                    
                    if existing_analysis and existing_analysis.raw_ai_response:
                        logger.info(f"Skipping ad {ad.id} - already has analysis")
                        applied_to_ads.append(ad.id)
                        continue
                
                # Archive current analysis if exists
                current_analysis = db.query(AdAnalysis).filter(
                    AdAnalysis.ad_id == ad.id,
                    AdAnalysis.is_current == 1
                ).first()
                
                if current_analysis:
                    current_analysis.is_current = 0
                    version_number = current_analysis.version_number + 1
                else:
                    version_number = 1
                
                # Create new analysis record for this ad
                new_analysis = AdAnalysis(
                    ad_id=ad.id,
                    raw_ai_response=analysis_result.copy(),  # Copy to avoid reference issues
                    used_video_url=video_url,
                    is_current=1,
                    version_number=version_number,
                    summary=analysis_result.get('summary'),
                    hook_score=analysis_result.get('hook_score'),
                    overall_score=analysis_result.get('overall_score'),
                    target_audience=analysis_result.get('target_audience'),
                    content_themes=analysis_result.get('content_themes'),
                    analysis_version="unified_v1.0"
                )
                
                db.add(new_analysis)
                applied_to_ads.append(ad.id)
                
                logger.info(f"Applied analysis to ad {ad.id} in set {ad_set_id}")
                
            except Exception as e:
                logger.error(f"Error applying analysis to ad {ad.id}: {str(e)}")
                continue
        
        db.commit()
        
        result = {
            "success": True,
            "task_id": task_id,
            "ad_set_id": ad_set_id,
            "representative_ad_id": representative_ad_id,
            "applied_to_ads": applied_to_ads,
            "total_ads_processed": len(applied_to_ads),
            "source": "unified_ad_set_analysis",
            "message": f"Ad set analysis completed. Applied to {len(applied_to_ads)} ads.",
            "generated_at": datetime.utcnow().isoformat(),
            "analysis": analysis_result
        }
        
        logger.info(f"Unified ad set analysis completed for ad set {ad_set_id}")
        return result
        
    except Exception as exc:
        logger.error(f"Unified ad set analysis task failed for ad set {ad_set_id}: {str(exc)}")
        self.update_state(
            state='FAILURE',
            meta={
                'error': str(exc),
                'ad_set_id': ad_set_id,
                'timestamp': datetime.utcnow().isoformat()
            }
        )
        raise exc
    finally:
        if 'db' in locals():
            db.close()


def _extract_video_url_from_ad(ad) -> Optional[str]:
    """Extract the best video URL from an ad's data."""
    try:
        # Try to get from creatives first
        if ad.creatives:
            for creative in ad.creatives:
                if creative.get('media'):
                    for media in creative['media']:
                        if media.get('type') == 'Video' and media.get('url'):
                            return media['url']
        
        # Try to get from raw_data
        if ad.raw_data:
            # Check for video URLs in various formats
            if isinstance(ad.raw_data, dict):
                # Check snapshot for videos
                snapshot = ad.raw_data.get('snapshot', {})
                if snapshot.get('videos'):
                    for video in snapshot['videos']:
                        if video.get('video_hd_url'):
                            return video['video_hd_url']
                        elif video.get('video_sd_url'):
                            return video['video_sd_url']
                
                # Check for direct video URLs
                if ad.raw_data.get('video_hd_url'):
                    return ad.raw_data['video_hd_url']
                elif ad.raw_data.get('video_sd_url'):
                    return ad.raw_data['video_sd_url']
        
        return None
        
    except Exception as e:
        logger.error(f"Error extracting video URL from ad {ad.id}: {str(e)}")
        return None


def _apply_analysis_to_ad_set(db, ad_set_id: int, analysis_result: Dict[str, Any], video_url: str, exclude_ad_id: int = None):
    """Apply the same analysis to all ads in an ad set (for duplicates)."""
    try:
        from app.models import Ad
        from app.models.ad_analysis import AdAnalysis
        
        # Get all ads in the ad set
        query = db.query(Ad).filter(Ad.ad_set_id == ad_set_id)
        if exclude_ad_id:
            query = query.filter(Ad.id != exclude_ad_id)
        
        ads_in_set = query.all()
        
        for ad in ads_in_set:
            # Check if this ad already has current analysis
            existing = db.query(AdAnalysis).filter(
                AdAnalysis.ad_id == ad.id,
                AdAnalysis.is_current == 1
            ).first()
            
            if existing:
                continue  # Skip if already has analysis
            
            # Store the same analysis for this ad
            try:
                new_analysis = AdAnalysis(
                    ad_id=ad.id,
                    raw_ai_response=analysis_result.copy(),  # Copy to avoid reference issues
                    used_video_url=video_url,
                    is_current=1,
                    version_number=1,
                    summary=analysis_result.get('summary'),
                    hook_score=analysis_result.get('hook_score'),
                    overall_score=analysis_result.get('overall_score'),
                    target_audience=analysis_result.get('target_audience'),
                    content_themes=analysis_result.get('content_themes'),
                    analysis_version="unified_v1.0"
                )
                
                db.add(new_analysis)
                logger.info(f"Applied shared analysis to ad {ad.id} in set {ad_set_id}")
                
            except Exception as e:
                logger.error(f"Error applying analysis to ad {ad.id}: {str(e)}")
                continue
        
        db.commit()
        
    except Exception as e:
        logger.error(f"Error applying analysis to ad set {ad_set_id}: {str(e)}")