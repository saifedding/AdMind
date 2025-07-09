import logging
import concurrent.futures
import requests
from typing import Dict, List, Tuple, Any, Optional
import hashlib
from urllib.parse import urlparse

import av
from PIL import Image
import imagehash
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class CreativeComparisonService:
    """
    Service for comparing ad creatives (images and videos) to determine if they should be grouped
    into the same ad set. Uses perceptual hashing techniques for both images and videos.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.logger = logging.getLogger(__name__)
        
    # ===============================================================
    # Image Comparison Methods (from image_comparator_streamed.py)
    # ===============================================================
    
    def _download_and_hash_image(self, url: str) -> Optional[imagehash.ImageHash]:
        """Download an image via streaming and return its perceptual hash."""
        try:
            self.logger.debug(f"Downloading image: {url[:60]}...")
            resp = requests.get(url, stream=True, timeout=10)
            resp.raise_for_status()
            # Read raw bytes in chunks then hash
            img = Image.open(resp.raw)
            return imagehash.average_hash(img)  # average_hash is faster than phash
        except Exception as e:
            self.logger.error(f"Failed to process image {url[:60]}... – {e}")
            return None
    
    def compare_images(self, image_url1: str, image_url2: str, cutoff: int = 5) -> Tuple[bool, Optional[int]]:
        """
        Return True/False if two remote images are similar, with optional hash difference.
        
        Args:
            image_url1: URL of the first image
            image_url2: URL of the second image
            cutoff: Maximum hash difference to consider images similar (default: 5)
            
        Returns:
            Tuple of (is_similar, hash_diff) where hash_diff may be None on error
        """
        # Skip comparison if URLs are identical
        if image_url1 == image_url2:
            return True, 0
        
        # Run downloads and hash computation in parallel to minimize wall time
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            fut1 = executor.submit(self._download_and_hash_image, image_url1)
            fut2 = executor.submit(self._download_and_hash_image, image_url2)
            
            try:
                hash1 = fut1.result()
                hash2 = fut2.result()
            except Exception as e:
                self.logger.error(f"Error comparing images: {e}")
                return False, None
            
            # Check for None results (errors in downloading or processing)
            if hash1 is None or hash2 is None:
                return False, None
            
            # Calculate hash difference
            diff = hash1 - hash2
            self.logger.debug(f"Image hash difference: {diff} (cutoff: {cutoff})")
            return diff <= cutoff, diff

    # ===============================================================
    # Video Comparison Methods (from video_comparator_fast.py)
    # ===============================================================
    
    def _duration_seconds(self, stream: av.video.stream.VideoStream, container: av.container.input.InputContainer) -> Optional[float]:
        """Return duration of the video stream in seconds (best effort)."""
        if stream.duration and stream.time_base:  # Prefer per-stream duration
            return float(stream.duration * stream.time_base)
        if container.duration:
            # container.duration is in micro-seconds
            return float(container.duration / 1_000_000)
        return None

    def _sample_video_hashes(self, url: str, samples: int = 6, resize: int = 8) -> List[imagehash.ImageHash]:
        """
        Return a list of perceptual hashes sampled from the remote video.
        
        It seeks to *samples* evenly spaced timestamps to avoid decoding the entire
        video. Falls back to sequential reading if seeking isn't supported.
        """
        self.logger.debug(f"Sampling video hashes from: {url[:60]}...")
        hashes = []
        
        try:
            container = av.open(url, timeout=15)
            video_stream = next(s for s in container.streams if s.type == "video")
            dur_s = self._duration_seconds(video_stream, container)

            def _hash_frame(frame):
                pil_img = frame.to_image()
                hashes.append(imagehash.average_hash(pil_img, hash_size=resize))

            if dur_s and dur_s > 0:
                # Seek method
                step = dur_s / (samples + 1)
                for i in range(samples):
                    ts = (i + 1) * step
                    # Convert seconds to stream timestamp units (time_base)
                    tb = float(video_stream.time_base) if video_stream.time_base else 1.0
                    pts = int(ts / tb)
                    try:
                        container.seek(pts, any_frame=False, backward=True, stream=video_stream)
                        frame = next(container.decode(video_stream))
                        _hash_frame(frame)
                    except (StopIteration, av.AVError):
                        # Fallback: cannot seek/decode
                        break
            else:
                # Unknown duration – sequentially iterate until we collect enough hashes
                for frame in container.decode(video_stream):
                    _hash_frame(frame)
                    if len(hashes) >= samples:
                        break

            container.close()
            return hashes
            
        except Exception as e:
            self.logger.error(f"Error sampling video hashes: {e}")
            return []

    def compare_videos(
        self, 
        url1: str, 
        url2: str, 
        samples: int = 6, 
        hash_cutoff: int = 6, 
        similarity_threshold: float = 0.8
    ) -> Tuple[bool, float]:
        """
        Compare two online videos quickly.
        
        Args:
            url1, url2: Remote video URLs (HTTP/S)
            samples: Number of frames to compare (higher = more robust, slower)
            hash_cutoff: Maximum Hamming distance for two frame hashes to match
            similarity_threshold: Fraction of matching samples (0-1) to call videos similar
            
        Returns:
            (is_similar, similarity_score) – similarity_score is 0-1
        """
        # Skip comparison if URLs are identical
        if url1 == url2:
            return True, 1.0

        # Quick metadata check via parallel HEAD requests
        def _head(url):
            try:
                r = requests.head(url, timeout=5, allow_redirects=True)
                return r.headers.get("ETag"), r.headers.get("Content-Length")
            except requests.RequestException:
                return None, None

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            etag1, length1 = pool.submit(_head, url1).result()
            etag2, length2 = pool.submit(_head, url2).result()

        # If both ETags present and equal, videos are identical
        if etag1 and etag2 and etag1 == etag2:
            self.logger.debug("Videos considered identical via ETag match")
            return True, 1.0

        # If Content-Length identical and >0, assume high likelihood of same
        if length1 and length2 and length1 == length2 and length1 != '0':
            self.logger.debug("Content-Length values match – performing quick frame check")
            # Still need small verification; reduce samples to 2 for speed
            samples = min(samples, 2)

        # Collect hashes in parallel to overlap network I/O
        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                fut1 = executor.submit(self._sample_video_hashes, url1, samples)
                fut2 = executor.submit(self._sample_video_hashes, url2, samples)
                hashes1 = fut1.result()
                hashes2 = fut2.result()
                
                common = min(len(hashes1), len(hashes2))
                if common == 0:
                    return False, 0.0
                
                matches = sum(1 for h1, h2 in zip(hashes1[:common], hashes2[:common]) 
                               if (h1 - h2) <= hash_cutoff)
                score = matches / common
                
                self.logger.debug(f"Video comparison: {matches}/{common} frames matched (score: {score:.2f})")
                
                return score >= similarity_threshold, score
                
        except Exception as e:
            self.logger.error(f"Error comparing videos: {e}")
            return False, 0.0
    
    # ===============================================================
    # Creative Comparison Integration
    # ===============================================================
    
    def is_media_url(self, url: str) -> bool:
        """
        Check if a URL points to an image or video file based on extension.
        """
        if not url:
            return False
            
        try:
            path = urlparse(url).path.lower()
            media_extensions = [
                # Images
                '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
                # Videos
                '.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.m4v'
            ]
            return any(path.endswith(ext) for ext in media_extensions)
        except Exception:
            return False
    
    def get_media_type(self, url: str) -> str:
        """
        Determine if a URL is for an image, video, or unknown type.
        """
        if not url:
            return "unknown"
            
        try:
            path = urlparse(url).path.lower()
            
            # Check for video extensions
            video_extensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.m4v']
            if any(path.endswith(ext) for ext in video_extensions):
                return "video"
                
            # Check for image extensions
            image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
            if any(path.endswith(ext) for ext in image_extensions):
                return "image"
                
            # For Facebook URLs without extensions, use contextual clues
            if 'video.f' in url.lower():  # Common pattern in Facebook video URLs
                return "video"
            elif 'scontent.f' in url.lower():  # Common pattern in Facebook image URLs
                return "image"
                
            return "unknown"
            
        except Exception:
            return "unknown"
    
    def extract_media_from_creative(self, creative: Dict) -> List[Dict]:
        """
        Extract media items from a creative with their URLs and types.
        """
        media_items = []
        
        if not creative or not isinstance(creative, dict):
            return media_items
            
        # Extract media from the creative
        for media_item in creative.get("media", []):
            if not isinstance(media_item, dict):
                continue
                
            url = media_item.get("url")
            if not url:
                continue
                
            # Get media type from data or infer from URL
            media_type = media_item.get("type")
            if not media_type:
                media_type = self.get_media_type(url)
                
            media_items.append({
                "url": url,
                "type": media_type
            })
            
        return media_items
    
    def compare_ad_creatives(self, creative1: Dict, creative2: Dict) -> Tuple[bool, float, str]:
        """
        Compare two ad creatives to determine if they are similar enough to be grouped.
        
        Args:
            creative1: First creative object with media items
            creative2: Second creative object with media items
            
        Returns:
            Tuple of (is_similar, similarity_score, comparison_type)
            - is_similar: True if creatives are similar enough to group
            - similarity_score: 0-1 score of similarity (1 = identical)
            - comparison_type: What was compared ('text', 'image', 'video', 'mixed', 'none')
        """
        # Extract ad text
        text1 = creative1.get("body", "").strip() if creative1 else ""
        text2 = creative2.get("body", "").strip() if creative2 else ""
        
        # If both creatives have significant text, compare the text
        if text1 and text2 and len(text1) > 20 and len(text2) > 20:
            # Simple text comparison for now
            if text1 == text2:
                return True, 1.0, "text"
            
            # Calculate similarity using Jaccard similarity of words
            words1 = set(text1.lower().split())
            words2 = set(text2.lower().split())
            if not words1 or not words2:
                text_similarity = 0.0
            else:
                intersection = len(words1.intersection(words2))
                union = len(words1.union(words2))
                text_similarity = intersection / union if union > 0 else 0.0
                
            if text_similarity > 0.8:  # High text similarity threshold
                return True, text_similarity, "text"
        
        # Extract media from both creatives
        media1 = self.extract_media_from_creative(creative1)
        media2 = self.extract_media_from_creative(creative2)
        
        # No media to compare
        if not media1 or not media2:
            return False, 0.0, "none"
            
        # Compare media items
        best_similarity = 0.0
        comparison_type = "none"
        is_similar = False
        
        # For each media item in creative1, find best match in creative2
        for item1 in media1:
            url1 = item1.get("url")
            type1 = item1.get("type", "").lower()
            
            if not url1 or not self.is_media_url(url1):
                continue
                
            for item2 in media2:
                url2 = item2.get("url")
                type2 = item2.get("type", "").lower()
                
                if not url2 or not self.is_media_url(url2):
                    continue
                
                # Exact URL match = definite match
                if url1 == url2:
                    return True, 1.0, type1
                
                # Compare images
                if type1 == "image" and type2 == "image":
                    similar, diff = self.compare_images(url1, url2)
                    similarity = 1.0 - (diff / 10.0) if diff is not None else 0.0
                    
                    if similar and similarity > best_similarity:
                        best_similarity = similarity
                        is_similar = True
                        comparison_type = "image"
                
                # Compare videos
                elif type1 == "video" and type2 == "video":
                    similar, score = self.compare_videos(url1, url2)
                    
                    if similar and score > best_similarity:
                        best_similarity = score
                        is_similar = True
                        comparison_type = "video"
        
        return is_similar, best_similarity, comparison_type
        
    def should_group_ads(self, ad_data1: Dict, ad_data2: Dict, text_weight: float = 0.3, media_weight: float = 0.7) -> bool:
        """
        Determine if two ads should be grouped into the same ad set based on their content.
        
        Args:
            ad_data1: First ad data with creatives
            ad_data2: Second ad data with creatives
            text_weight: Weight to give to text similarity (0-1)
            media_weight: Weight to give to media similarity (0-1)
            
        Returns:
            True if ads should be grouped, False otherwise
        """
        # Extract creatives
        creatives1 = ad_data1.get("creatives", [])
        creatives2 = ad_data2.get("creatives", [])
        
        if not creatives1 or not creatives2:
            return False
        
        # For now, compare only the first creative from each ad
        # This could be expanded to compare all creatives in the future
        creative1 = creatives1[0] if len(creatives1) > 0 else None
        creative2 = creatives2[0] if len(creatives2) > 0 else None
        
        if not creative1 or not creative2:
            return False
            
        # Compare creatives
        is_similar, similarity, comparison_type = self.compare_ad_creatives(creative1, creative2)
        
        self.logger.info(f"Ad comparison: similar={is_similar}, score={similarity:.2f}, type={comparison_type}")
        
        return is_similar 