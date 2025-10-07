import os
import requests
import hashlib
import logging
from pathlib import Path
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from app.models import Ad

logger = logging.getLogger(__name__)


class MediaStorageService:
    """Service to download and save media files locally for permanent storage"""
    
    def __init__(self, db: Session, storage_path: str = None):
        self.db = db
        # Use environment variable or default to backend/media_storage
        self.storage_path = storage_path or os.getenv(
            'MEDIA_STORAGE_PATH', 
            os.path.join(os.path.dirname(__file__), '../../media_storage')
        )
        self._ensure_storage_directories()
    
    def _ensure_storage_directories(self):
        """Create storage directories if they don't exist"""
        Path(self.storage_path).mkdir(parents=True, exist_ok=True)
        # Note: Competitor-specific folders will be created on-demand when saving media
    
    def _get_file_hash(self, url: str) -> str:
        """Generate a unique hash for a URL to use as filename"""
        return hashlib.md5(url.encode()).hexdigest()
    
    def _get_file_extension(self, url: str, content_type: str = None, content_sample: bytes = None) -> str:
        """Determine file extension from URL, content type, or file content"""
        # Try to get from URL first
        if '.' in url.split('?')[0].split('/')[-1]:
            ext = '.' + url.split('?')[0].split('/')[-1].split('.')[-1]
            # Only return if it's a common extension
            if ext.lower() in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi', '.webm']:
                return ext
        
        # Try content type
        if content_type:
            ext_map = {
                'image/jpeg': '.jpg',
                'image/jpg': '.jpg',
                'image/png': '.png',
                'image/gif': '.gif',
                'image/webp': '.webp',
                'video/mp4': '.mp4',
                'video/quicktime': '.mov',
                'video/x-msvideo': '.avi',
                'video/webm': '.webm',
            }
            if content_type.lower() in ext_map:
                return ext_map[content_type.lower()]
            # Handle content-type with parameters like "image/jpeg; charset=utf-8"
            base_type = content_type.split(';')[0].strip().lower()
            if base_type in ext_map:
                return ext_map[base_type]
        
        # Try to detect from file content (magic bytes)
        if content_sample:
            # Check magic bytes (first few bytes of file)
            if content_sample.startswith(b'\xff\xd8\xff'):
                return '.jpg'
            elif content_sample.startswith(b'\x89PNG'):
                return '.png'
            elif content_sample.startswith(b'GIF87a') or content_sample.startswith(b'GIF89a'):
                return '.gif'
            elif content_sample.startswith(b'RIFF') and b'WEBP' in content_sample[:12]:
                return '.webp'
            elif content_sample[4:12] == b'ftypmp42' or content_sample[4:12] == b'ftypisom':
                return '.mp4'
        
        # Default fallback
        return '.jpg'
    
    def _sanitize_folder_name(self, name: str) -> str:
        """
        Sanitize competitor name for use as folder name
        """
        # Replace invalid characters with underscore
        import re
        sanitized = re.sub(r'[<>:"/\\|?*]', '_', name)
        # Remove leading/trailing spaces and dots
        sanitized = sanitized.strip('. ')
        # Limit length
        return sanitized[:100] if sanitized else 'unknown'
    
    def download_and_save_file(self, url: str, media_type: str = 'image', competitor_name: str = None) -> Optional[Dict]:
        """
        Download a file from URL and save it locally
        
        Args:
            url: URL of file to download
            media_type: 'image' or 'video'
            competitor_name: Name of competitor (for folder structure)
        
        Returns:
            Dict with local_path and original_url, or None if failed
        """
        try:
            logger.info(f"Downloading {media_type} from: {url[:100]}...")
            
            # Download the file
            response = requests.get(url, timeout=30, stream=True)
            response.raise_for_status()
            
            # Get file hash
            file_hash = self._get_file_hash(url)
            content_type = response.headers.get('content-type', '')
            
            # Determine storage folder with competitor name
            competitor_folder = self._sanitize_folder_name(competitor_name) if competitor_name else 'unknown'
            media_folder = 'images' if media_type == 'image' else 'videos'
            
            # Create competitor folder structure: competitor_name/images or competitor_name/videos
            full_folder = os.path.join(self.storage_path, competitor_folder, media_folder)
            Path(full_folder).mkdir(parents=True, exist_ok=True)
            
            # Download first chunk to detect file type from content
            first_chunk = None
            file_content = b''
            
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    file_content += chunk
                    if first_chunk is None:
                        first_chunk = chunk
            
            # Detect extension from content
            extension = self._get_file_extension(url, content_type, first_chunk)
            
            filename = f"{file_hash}{extension}"
            local_path = os.path.join(full_folder, filename)
            
            # Check if file already exists
            if os.path.exists(local_path):
                logger.info(f"File already exists: {filename}")
                return {
                    'local_path': os.path.join(competitor_folder, media_folder, filename),
                    'original_url': url,
                    'file_size': os.path.getsize(local_path)
                }
            
            # Save the file
            with open(local_path, 'wb') as f:
                f.write(file_content)
            
            file_size = os.path.getsize(local_path)
            logger.info(f"Saved {media_type} to {competitor_folder}/{media_folder}/{filename} ({file_size} bytes)")
            
            return {
                'local_path': os.path.join(competitor_folder, media_folder, filename),
                'original_url': url,
                'file_size': file_size
            }
            
        except Exception as e:
            logger.error(f"Failed to download {url[:100]}: {str(e)}")
            return None
    
    def save_ad_media(self, ad_id: int) -> Dict:
        """
        Download and save all media for an ad
        
        Returns:
            Dict with results: {
                'images_saved': int,
                'videos_saved': int,
                'images_failed': int,
                'videos_failed': int,
                'local_image_paths': List[str],
                'local_video_paths': List[str]
            }
        """
        ad = self.db.query(Ad).filter(Ad.id == ad_id).first()
        if not ad:
            raise ValueError(f"Ad {ad_id} not found")
        
        # Get competitor name for folder organization
        competitor_name = ad.competitor.name if ad.competitor else 'unknown'
        
        result = {
            'images_saved': 0,
            'videos_saved': 0,
            'images_failed': 0,
            'videos_failed': 0,
            'local_image_paths': [],
            'local_video_paths': []
        }
        
        # Get ad dict to extract media URLs
        ad_dict = ad.to_dict()
        
        # Download images
        image_urls = ad_dict.get('main_image_urls', [])
        if image_urls:
            logger.info(f"Downloading {len(image_urls)} images for ad {ad_id} (competitor: {competitor_name})")
            for url in image_urls:
                file_info = self.download_and_save_file(url, 'image', competitor_name)
                if file_info:
                    result['images_saved'] += 1
                    result['local_image_paths'].append(file_info['local_path'])
                else:
                    result['images_failed'] += 1
        
        # Download videos
        video_urls = ad_dict.get('main_video_urls', [])
        if video_urls:
            logger.info(f"Downloading {len(video_urls)} videos for ad {ad_id} (competitor: {competitor_name})")
            for url in video_urls:
                file_info = self.download_and_save_file(url, 'video', competitor_name)
                if file_info:
                    result['videos_saved'] += 1
                    result['local_video_paths'].append(file_info['local_path'])
                else:
                    result['videos_failed'] += 1
        
        # Update ad with local paths
        if result['local_image_paths'] or result['local_video_paths']:
            # Store local paths in raw_data
            if not ad.raw_data:
                ad.raw_data = {}
            
            ad.raw_data['local_media'] = {
                'images': result['local_image_paths'],
                'videos': result['local_video_paths'],
                'saved_at': str(ad.updated_at)
            }
            
            # Mark the ad as having saved media
            if not ad.meta:
                ad.meta = {}
            ad.meta['has_local_media'] = True
            
            self.db.commit()
            logger.info(f"Updated ad {ad_id} with local media paths")
        
        return result
    
    def save_adset_media(self, ad_set_id: int) -> Dict:
        """
        Download and save all media for all ads in an ad set
        
        Returns:
            Dict with aggregate results
        """
        from app.models import AdSet
        
        ad_set = self.db.query(AdSet).filter(AdSet.id == ad_set_id).first()
        if not ad_set:
            raise ValueError(f"AdSet {ad_set_id} not found")
        
        # Get all ads in the set
        ads = self.db.query(Ad).filter(Ad.ad_set_id == ad_set_id).all()
        
        aggregate_result = {
            'total_ads': len(ads),
            'ads_processed': 0,
            'images_saved': 0,
            'videos_saved': 0,
            'images_failed': 0,
            'videos_failed': 0
        }
        
        for ad in ads:
            try:
                result = self.save_ad_media(ad.id)
                aggregate_result['ads_processed'] += 1
                aggregate_result['images_saved'] += result['images_saved']
                aggregate_result['videos_saved'] += result['videos_saved']
                aggregate_result['images_failed'] += result['images_failed']
                aggregate_result['videos_failed'] += result['videos_failed']
            except Exception as e:
                logger.error(f"Failed to save media for ad {ad.id}: {str(e)}")
        
        return aggregate_result
    
    def get_local_media_url(self, local_path: str, base_url: str = None) -> str:
        """
        Convert local file path to URL for serving
        
        Args:
            local_path: Path like 'images/abc123.jpg'
            base_url: Base URL of the API (e.g., 'http://localhost:8000')
        
        Returns:
            Full URL to access the media
        """
        if not base_url:
            base_url = os.getenv('API_BASE_URL', 'http://localhost:8000')
        
        return f"{base_url}/api/v1/media/{local_path}"
    
    def cleanup_old_media(self, days_old: int = 90) -> Dict:
        """
        Remove media files that are older than specified days and not referenced by any ads
        
        Args:
            days_old: Files older than this many days will be considered for cleanup
        
        Returns:
            Dict with cleanup statistics
        """
        import time
        from datetime import datetime, timedelta
        
        cutoff_time = time.time() - (days_old * 24 * 60 * 60)
        
        stats = {
            'files_checked': 0,
            'files_removed': 0,
            'space_freed': 0
        }
        
        # Get all files in storage (now organized by competitor)
        if not os.path.exists(self.storage_path):
            return stats
        
        # Iterate through competitor folders
        for competitor_folder in os.listdir(self.storage_path):
            competitor_path = os.path.join(self.storage_path, competitor_folder)
            if not os.path.isdir(competitor_path):
                continue
            
            # Check images and videos folders within competitor folder
            for media_type in ['images', 'videos']:
                media_folder_path = os.path.join(competitor_path, media_type)
                if not os.path.exists(media_folder_path):
                    continue
                
                for filename in os.listdir(media_folder_path):
                    file_path = os.path.join(media_folder_path, filename)
                    if not os.path.isfile(file_path):
                        continue
                    
                    stats['files_checked'] += 1
                    
                    # Check file age
                    if os.path.getmtime(file_path) < cutoff_time:
                        # Check if file is still referenced
                        relative_path = os.path.join(competitor_folder, media_type, filename)
                        is_referenced = self._is_media_referenced(relative_path)
                        
                        if not is_referenced:
                            file_size = os.path.getsize(file_path)
                            os.remove(file_path)
                            stats['files_removed'] += 1
                            stats['space_freed'] += file_size
                            logger.info(f"Removed unused media: {relative_path}")
        
        return stats
    
    def _is_media_referenced(self, local_path: str) -> bool:
        """Check if a local media path is still referenced by any ad"""
        # Search in raw_data for the local path
        ads = self.db.query(Ad).filter(
            Ad.raw_data.op('->')('local_media').isnot(None)
        ).all()
        
        for ad in ads:
            local_media = ad.raw_data.get('local_media', {})
            all_paths = local_media.get('images', []) + local_media.get('videos', [])
            if local_path in all_paths:
                return True
        
        return False
    
    def delete_ad_media(self, ad_id: int) -> Dict:
        """
        Delete all saved media files for an ad from disk
        
        Args:
            ad_id: ID of the ad whose media should be deleted
        
        Returns:
            Dict with deletion statistics
        """
        ad = self.db.query(Ad).filter(Ad.id == ad_id).first()
        if not ad:
            raise ValueError(f"Ad {ad_id} not found")
        
        result = {
            'images_deleted': 0,
            'videos_deleted': 0,
            'images_failed': 0,
            'videos_failed': 0,
            'space_freed': 0
        }
        
        # Get local media paths from raw_data
        if not ad.raw_data or 'local_media' not in ad.raw_data:
            logger.info(f"No local media found for ad {ad_id}")
            return result
        
        local_media = ad.raw_data.get('local_media', {})
        image_paths = local_media.get('images', [])
        video_paths = local_media.get('videos', [])
        
        # Delete images
        for rel_path in image_paths:
            try:
                full_path = os.path.join(self.storage_path, rel_path)
                if os.path.exists(full_path):
                    file_size = os.path.getsize(full_path)
                    os.remove(full_path)
                    result['images_deleted'] += 1
                    result['space_freed'] += file_size
                    logger.info(f"Deleted image: {rel_path}")
                else:
                    logger.warning(f"Image file not found: {rel_path}")
                    result['images_failed'] += 1
            except Exception as e:
                logger.error(f"Failed to delete image {rel_path}: {str(e)}")
                result['images_failed'] += 1
        
        # Delete videos
        for rel_path in video_paths:
            try:
                full_path = os.path.join(self.storage_path, rel_path)
                if os.path.exists(full_path):
                    file_size = os.path.getsize(full_path)
                    os.remove(full_path)
                    result['videos_deleted'] += 1
                    result['space_freed'] += file_size
                    logger.info(f"Deleted video: {rel_path}")
                else:
                    logger.warning(f"Video file not found: {rel_path}")
                    result['videos_failed'] += 1
            except Exception as e:
                logger.error(f"Failed to delete video {rel_path}: {str(e)}")
                result['videos_failed'] += 1
        
        # Clear local_media from raw_data
        if 'local_media' in ad.raw_data:
            del ad.raw_data['local_media']
        if ad.meta and 'has_local_media' in ad.meta:
            ad.meta['has_local_media'] = False
        
        self.db.commit()
        
        logger.info(
            f"Deleted media for ad {ad_id}: "
            f"{result['images_deleted']} images, "
            f"{result['videos_deleted']} videos, "
            f"{result['space_freed']} bytes freed"
        )
        
        return result
