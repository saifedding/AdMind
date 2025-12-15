"""
Unified Analysis Service

This service provides a centralized analysis system that works across the entire application.
It handles analysis for ads from any source (download-ads, ad library, scraped ads) and 
ensures consistent analysis storage and retrieval.

All analysis operations are performed as Celery background tasks for better performance
and user experience.
"""

import logging
from typing import Dict, List, Optional, Any, Tuple
from sqlalchemy.orm import Session
from datetime import datetime
import hashlib
import json

from app.models import Ad, AdSet
from app.models.ad_analysis import AdAnalysis
from app.celery_worker import celery_app

logger = logging.getLogger(__name__)


class UnifiedAnalysisService:
    """
    Unified service for ad analysis across the entire application.
    
    Features:
    - Analyzes ads from any source (download-ads, ad library, scraped ads)
    - Stores analysis results in database with versioning
    - Handles duplicate ads with shared analysis
    - Provides analysis for ad sets
    - Caches analysis results for performance
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger(__name__)
    
    def analyze_ad(
        self, 
        ad_id: int, 
        video_url: Optional[str] = None,
        custom_instruction: Optional[str] = None,
        generate_prompts: bool = True,
        force_reanalyze: bool = False
    ) -> Dict[str, Any]:
        """
        Analyze a single ad using Celery background task.
        
        Args:
            ad_id: ID of the ad to analyze
            video_url: Optional specific video URL to analyze
            custom_instruction: Optional custom instruction for analysis
            generate_prompts: Whether to generate creative prompts
            force_reanalyze: Whether to force re-analysis even if exists
            
        Returns:
            Task information with task_id for polling
        """
        try:
            # Get the ad
            ad = self.db.query(Ad).filter(Ad.id == ad_id).first()
            if not ad:
                raise ValueError(f"Ad with ID {ad_id} not found")
            
            # Check for existing analysis if not forcing re-analysis
            if not force_reanalyze:
                existing_analysis = self._get_current_analysis(ad_id)
                if existing_analysis:
                    self.logger.info(f"Using existing analysis for ad {ad_id}")
                    # Return a task-like response indicating analysis already exists
                    return {
                        'success': True,
                        'task_id': f'existing-{ad_id}-{existing_analysis.id}',
                        'ad_id': ad_id,
                        'message': f'Analysis already exists for ad {ad_id}',
                        'source': 'existing-analysis',
                        'estimated_time': 0,  # Already complete
                        'analysis_id': existing_analysis.id,
                        'status': 'COMPLETED'
                    }
            
            # Determine video URL to analyze
            if not video_url:
                video_url = self._extract_video_url_from_ad(ad)
            
            # Dispatch Celery task for analysis
            self.logger.info(f"Dispatching unified analysis task for ad {ad_id}")
            
            task = celery_app.send_task(
                'app.tasks.ai_analysis_tasks.unified_analysis_task',
                args=[ad_id, video_url, custom_instruction, generate_prompts, force_reanalyze]
            )
            
            self.logger.info(f"Unified analysis task dispatched: {task.id} for ad {ad_id}")
            
            return {
                'success': True,
                'task_id': task.id,
                'ad_id': ad_id,
                'message': f'Analysis task started with ID: {task.id}',
                'source': 'celery-task',
                'estimated_time': 60  # Estimated completion time in seconds
            }
            
        except Exception as e:
            self.logger.error(f"Error dispatching analysis task for ad {ad_id}: {str(e)}")
            raise
    
    def analyze_ad_set(
        self, 
        ad_set_id: int,
        custom_instruction: Optional[str] = None,
        generate_prompts: bool = True,
        force_reanalyze: bool = False
    ) -> Dict[str, Any]:
        """
        Analyze an entire ad set using Celery background task.
        
        Args:
            ad_set_id: ID of the ad set to analyze
            custom_instruction: Optional custom instruction for analysis
            generate_prompts: Whether to generate creative prompts
            force_reanalyze: Whether to force re-analysis even if exists
            
        Returns:
            Task information with task_id for polling
        """
        try:
            # Get the ad set
            ad_set = self.db.query(AdSet).filter(AdSet.id == ad_set_id).first()
            if not ad_set:
                raise ValueError(f"Ad set with ID {ad_set_id} not found")
            
            # Get the best ad from the set (representative ad)
            best_ad = None
            if ad_set.best_ad_id:
                best_ad = self.db.query(Ad).filter(Ad.id == ad_set.best_ad_id).first()
            
            if not best_ad:
                # Fallback: get any ad from the set
                best_ad = self.db.query(Ad).filter(Ad.ad_set_id == ad_set_id).first()
                
            if not best_ad:
                raise ValueError(f"No ads found in ad set {ad_set_id}")
            
            # Dispatch Celery task for ad set analysis
            self.logger.info(f"Dispatching unified ad set analysis task for ad set {ad_set_id}")
            
            task = celery_app.send_task(
                'app.tasks.ai_analysis_tasks.unified_ad_set_analysis_task',
                args=[ad_set_id, best_ad.id, custom_instruction, generate_prompts, force_reanalyze]
            )
            
            self.logger.info(f"Unified ad set analysis task dispatched: {task.id} for ad set {ad_set_id}")
            
            return {
                'success': True,
                'task_id': task.id,
                'ad_set_id': ad_set_id,
                'representative_ad_id': best_ad.id,
                'message': f'Ad set analysis task started with ID: {task.id}',
                'source': 'celery-task',
                'estimated_time': 60  # Estimated completion time in seconds
            }
            
        except Exception as e:
            self.logger.error(f"Error dispatching ad set analysis task for ad set {ad_set_id}: {str(e)}")
            raise
    
    def get_ad_analysis(self, ad_id: int, version: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """
        Get analysis for a specific ad.
        
        Args:
            ad_id: ID of the ad
            version: Optional specific version number
            
        Returns:
            Analysis result dictionary or None if not found
        """
        try:
            if version:
                analysis = self.db.query(AdAnalysis).filter(
                    AdAnalysis.ad_id == ad_id,
                    AdAnalysis.version_number == version
                ).first()
            else:
                analysis = self._get_current_analysis(ad_id)
            
            if not analysis:
                return None
            
            return self._format_analysis_response(analysis.raw_ai_response, analysis.id)
            
        except Exception as e:
            self.logger.error(f"Error getting analysis for ad {ad_id}: {str(e)}")
            return None
    
    def get_analysis_history(self, ad_id: int) -> List[Dict[str, Any]]:
        """
        Get all analysis versions for an ad.
        
        Args:
            ad_id: ID of the ad
            
        Returns:
            List of analysis versions
        """
        try:
            analyses = self.db.query(AdAnalysis).filter(
                AdAnalysis.ad_id == ad_id
            ).order_by(AdAnalysis.version_number.desc()).all()
            
            history = []
            for analysis in analyses:
                history.append({
                    'id': analysis.id,
                    'version_number': analysis.version_number,
                    'is_current': analysis.is_current == 1,
                    'created_at': analysis.created_at.isoformat() if analysis.created_at else None,
                    'summary': analysis.raw_ai_response.get('summary') if analysis.raw_ai_response else None,
                    'used_video_url': analysis.used_video_url
                })
            
            return history
            
        except Exception as e:
            self.logger.error(f"Error getting analysis history for ad {ad_id}: {str(e)}")
            return []
    
    def regenerate_analysis(
        self, 
        ad_id: int, 
        instruction: str,
        generate_prompts: bool = True
    ) -> Dict[str, Any]:
        """
        Regenerate analysis for an ad with a custom instruction using Celery task.
        
        Args:
            ad_id: ID of the ad to regenerate analysis for
            instruction: Custom instruction for regeneration
            generate_prompts: Whether to generate creative prompts
            
        Returns:
            Task information with task_id for polling
        """
        return self.analyze_ad(
            ad_id=ad_id,
            custom_instruction=instruction,
            generate_prompts=generate_prompts,
            force_reanalyze=True
        )
    
    def delete_analysis(self, ad_id: int) -> bool:
        """
        Delete all analysis for an ad and clean up all related data.
        
        Args:
            ad_id: ID of the ad
            
        Returns:
            True if deleted successfully
        """
        try:
            # Get all analysis records for this ad first (for cleanup metadata)
            analyses = self.db.query(AdAnalysis).filter(
                AdAnalysis.ad_id == ad_id
            ).all()
            
            if not analyses:
                self.logger.info(f"No analysis found for ad {ad_id}")
                return True
            
            # Collect cache and URL metadata for cleanup
            cache_entries = []
            used_urls = set()
            
            for analysis in analyses:
                try:
                    raw_response = analysis.raw_ai_response
                    if isinstance(raw_response, dict):
                        # Collect Gemini cache info
                        cache_name = raw_response.get("gemini_cache_name")
                        api_key_index = raw_response.get("gemini_api_key_index")
                        if cache_name and isinstance(api_key_index, int):
                            cache_entries.append((cache_name, api_key_index))
                        
                        # Collect used video URLs for Redis cache cleanup
                        used_url = raw_response.get("used_video_url")
                        if used_url:
                            used_urls.add(used_url)
                            
                except Exception as e:
                    self.logger.warning(f"Failed to extract cleanup metadata from analysis {analysis.id}: {e}")
            
            # Clean up Gemini caches
            if cache_entries:
                try:
                    from app.services.google_ai_service import GoogleAIService
                    for cache_name, api_idx in cache_entries:
                        try:
                            ai = GoogleAIService()
                            if 0 <= api_idx < len(ai.api_keys):
                                ai.current_key_index = api_idx
                                ai.api_key = ai.api_keys[api_idx]
                            ai.delete_cache(cache_name)
                            self.logger.info(f"Deleted Gemini cache: {cache_name}")
                        except Exception as e:
                            self.logger.warning(f"Failed to delete Gemini cache {cache_name}: {e}")
                except Exception as e:
                    self.logger.warning(f"Gemini cache cleanup failed for ad {ad_id}: {e}")
            
            # Clean up Redis caches
            if used_urls:
                try:
                    import os
                    import redis
                    
                    r = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379"))
                    
                    for url in used_urls:
                        cache_key = f"analysis:{url}"
                        try:
                            r.delete(cache_key)
                            self.logger.info(f"Cleared Redis cache: {cache_key}")
                        except Exception as e:
                            self.logger.warning(f"Failed to clear Redis cache {cache_key}: {e}")
                except Exception as e:
                    self.logger.warning(f"Redis cache cleanup failed for ad {ad_id}: {e}")
            
            # Delete related data
            try:
                from app.models.veo_generation import VeoGeneration
                from app.models.merged_video import MergedVideo
                
                # Delete Veo generations for this ad
                veo_deleted = self.db.query(VeoGeneration).filter(VeoGeneration.ad_id == ad_id).delete()
                self.logger.info(f"Deleted {veo_deleted} Veo generations for ad {ad_id}")
                
                # Delete merged videos for this ad
                merged_deleted = self.db.query(MergedVideo).filter(MergedVideo.ad_id == ad_id).delete()
                self.logger.info(f"Deleted {merged_deleted} merged videos for ad {ad_id}")
                
            except Exception as e:
                self.logger.warning(f"Failed to delete related video data for ad {ad_id}: {e}")
            
            # Delete all analysis versions for this ad
            deleted_count = self.db.query(AdAnalysis).filter(
                AdAnalysis.ad_id == ad_id
            ).delete()
            
            # Clear analysis metadata from the ad record
            try:
                ad = self.db.query(Ad).filter(Ad.id == ad_id).first()
                if ad and hasattr(ad, 'analysis_metadata'):
                    ad.analysis_metadata = None
                    self.logger.info(f"Cleared analysis metadata from ad {ad_id}")
            except Exception as e:
                self.logger.warning(f"Failed to clear ad metadata for ad {ad_id}: {e}")
            
            self.db.commit()
            
            self.logger.info(f"Successfully deleted {deleted_count} analysis versions and cleaned up all related data for ad {ad_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error deleting analysis for ad {ad_id}: {str(e)}")
            self.db.rollback()
            return False
    
    def _get_current_analysis(self, ad_id: int) -> Optional[AdAnalysis]:
        """Get the current (active) analysis for an ad."""
        return self.db.query(AdAnalysis).filter(
            AdAnalysis.ad_id == ad_id,
            AdAnalysis.is_current == 1
        ).first()
    
    def _extract_video_url_from_ad(self, ad: Ad) -> Optional[str]:
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
            self.logger.error(f"Error extracting video URL from ad {ad.id}: {str(e)}")
            return None
    
    def _store_analysis(
        self, 
        ad_id: int, 
        video_url: str, 
        analysis_result: Dict[str, Any],
        custom_instruction: Optional[str] = None
    ) -> int:
        """Store analysis result in database with versioning and update ad scores."""
        try:
            # Get existing current analysis
            existing = self.db.query(AdAnalysis).filter(
                AdAnalysis.ad_id == ad_id,
                AdAnalysis.is_current == 1
            ).first()
            
            if existing:
                # Archive the old analysis
                existing.is_current = 0
                self.logger.info(f"Archived analysis version {existing.version_number} for ad {ad_id}")
                
                # Create new version
                new_version = existing.version_number + 1
            else:
                # First analysis for this ad
                new_version = 1
            
            # Add custom instruction to analysis result if provided
            if custom_instruction:
                analysis_result['custom_instruction'] = custom_instruction
            
            # Create new analysis record
            new_analysis = AdAnalysis(
                ad_id=ad_id,
                raw_ai_response=analysis_result,
                used_video_url=video_url,
                is_current=1,
                version_number=new_version,
                summary=analysis_result.get('summary'),
                hook_score=analysis_result.get('hook_score'),
                overall_score=analysis_result.get('overall_score'),
                target_audience=analysis_result.get('target_audience'),
                content_themes=analysis_result.get('content_themes'),
                analysis_version="unified_v1.0"
            )
            
            self.db.add(new_analysis)
            
            # Update the Ad record with the latest scores for quick access
            ad = self.db.query(Ad).filter(Ad.id == ad_id).first()
            if ad:
                # Store analysis metadata in the ad record for quick filtering/sorting
                if not hasattr(ad, 'analysis_metadata'):
                    ad.analysis_metadata = {}
                
                ad.analysis_metadata = {
                    'has_analysis': True,
                    'hook_score': analysis_result.get('hook_score'),
                    'overall_score': analysis_result.get('overall_score'),
                    'target_audience': analysis_result.get('target_audience'),
                    'content_themes': analysis_result.get('content_themes', []),
                    'last_analyzed': datetime.utcnow().isoformat(),
                    'analysis_version': new_version
                }
                
                self.logger.info(f"Updated ad {ad_id} with analysis metadata")
            
            self.db.commit()
            self.db.refresh(new_analysis)
            
            self.logger.info(f"Created analysis version {new_version} for ad {ad_id}")
            
            return new_analysis.id
            
        except Exception as e:
            self.logger.error(f"Error storing analysis for ad {ad_id}: {str(e)}")
            self.db.rollback()
            raise
    
    def _apply_analysis_to_ad_set(
        self, 
        ad_set_id: int, 
        analysis_result: Dict[str, Any], 
        video_url: str
    ) -> None:
        """Apply the same analysis to all ads in an ad set (for duplicates)."""
        try:
            # Get all ads in the ad set
            ads_in_set = self.db.query(Ad).filter(Ad.ad_set_id == ad_set_id).all()
            
            for ad in ads_in_set:
                # Check if this ad already has current analysis
                existing = self._get_current_analysis(ad.id)
                if existing:
                    continue  # Skip if already has analysis
                
                # Store the same analysis for this ad
                try:
                    self._store_analysis(
                        ad_id=ad.id,
                        video_url=video_url,
                        analysis_result=analysis_result.copy()  # Copy to avoid reference issues
                    )
                    self.logger.info(f"Applied shared analysis to ad {ad.id} in set {ad_set_id}")
                except Exception as e:
                    self.logger.error(f"Error applying analysis to ad {ad.id}: {str(e)}")
                    continue
            
        except Exception as e:
            self.logger.error(f"Error applying analysis to ad set {ad_set_id}: {str(e)}")
    
    def _format_analysis_response(
        self, 
        analysis_data: Dict[str, Any], 
        analysis_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Format analysis data for API response."""
        if not isinstance(analysis_data, dict):
            return {}
        
        # Use AI-provided scores directly (no auto-calculation)
        hook_score = analysis_data.get('hook_score')
        overall_score = analysis_data.get('overall_score')
        target_audience = analysis_data.get('target_audience')
        content_themes = analysis_data.get('content_themes', [])
        
        return {
            'success': True,
            'analysis_id': analysis_id,
            'transcript': analysis_data.get('transcript'),
            'summary': analysis_data.get('summary'),
            'beats': analysis_data.get('beats', []),
            'storyboard': analysis_data.get('storyboard', []),
            'generation_prompts': analysis_data.get('generation_prompts', []),
            'strengths': analysis_data.get('strengths', []),
            'recommendations': analysis_data.get('recommendations', []),
            'hook_score': hook_score,
            'overall_score': overall_score,
            'target_audience': target_audience,
            'content_themes': content_themes,
            'text_on_video': analysis_data.get('text_on_video'),
            'voice_over': analysis_data.get('voice_over'),
            'custom_instruction': analysis_data.get('custom_instruction'),
            'token_usage': analysis_data.get('token_usage'),
            'cost': analysis_data.get('cost'),
            'raw': analysis_data,
            'message': 'Analysis retrieved successfully',
            'source': 'unified_service'
        }
    

    
    def get_ads_with_analysis_status(
        self, 
        ad_ids: Optional[List[int]] = None,
        ad_set_id: Optional[int] = None
    ) -> Dict[int, bool]:
        """
        Get analysis status for multiple ads.
        
        Args:
            ad_ids: Optional list of specific ad IDs
            ad_set_id: Optional ad set ID to check all ads in set
            
        Returns:
            Dictionary mapping ad_id to has_analysis boolean
        """
        try:
            query = self.db.query(AdAnalysis.ad_id).filter(AdAnalysis.is_current == 1)
            
            if ad_ids:
                query = query.filter(AdAnalysis.ad_id.in_(ad_ids))
            elif ad_set_id:
                # Get all ad IDs in the set first
                ad_ids_in_set = self.db.query(Ad.id).filter(Ad.ad_set_id == ad_set_id).all()
                ad_ids = [ad_id[0] for ad_id in ad_ids_in_set]
                query = query.filter(AdAnalysis.ad_id.in_(ad_ids))
            
            analyzed_ad_ids = {ad_id[0] for ad_id in query.all()}
            
            # Create status dictionary
            if ad_ids:
                return {ad_id: ad_id in analyzed_ad_ids for ad_id in ad_ids}
            else:
                return {ad_id: True for ad_id in analyzed_ad_ids}
            
        except Exception as e:
            self.logger.error(f"Error getting analysis status: {str(e)}")
            return {}