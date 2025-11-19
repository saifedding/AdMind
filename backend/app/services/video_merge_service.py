import os
import logging
import subprocess
import tempfile
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


class VideoMergeService:
    """Service to merge multiple video clips into one using ffmpeg."""
    
    def __init__(self, output_dir: str = "media/merged_videos"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def merge_videos(
        self, 
        video_urls: List[str], 
        output_filename: Optional[str] = None,
        trim_times: Optional[List[Dict[str, float]]] = None
    ) -> Dict[str, Any]:
        """
        Merge multiple video URLs into a single video file.
        
        Args:
            video_urls: List of video URLs to merge (in order)
            output_filename: Optional custom filename for output
            
        Returns:
            Dict with success status, output path, and metadata
        """
        if not video_urls:
            return {"success": False, "error": "No video URLs provided"}
        
        if len(video_urls) == 1:
            return {"success": False, "error": "Need at least 2 videos to merge"}
        
        temp_files = []
        trimmed_files = []
        concat_file = None
        
        try:
            # Download and optionally trim all videos
            logger.info(f"Downloading {len(video_urls)} videos for merging...")
            for idx, url in enumerate(video_urls):
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
                temp_files.append(temp_file.name)
                temp_file.close()
                
                # Download video
                response = requests.get(url, stream=True, timeout=60)
                response.raise_for_status()
                
                with open(temp_file.name, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                logger.info(f"Downloaded video {idx + 1}/{len(video_urls)}")
                
                # Trim video if trim_times provided
                if trim_times and idx < len(trim_times):
                    trim_info = trim_times[idx]
                    start_time = trim_info.get('startTime', 0)
                    end_time = trim_info.get('endTime')
                    
                    if start_time > 0 or end_time:
                        trimmed_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
                        trimmed_files.append(trimmed_file.name)
                        trimmed_file.close()
                        
                        # Build ffmpeg trim command
                        ffmpeg_cmd = ['ffmpeg', '-i', temp_file.name]
                        
                        if start_time > 0:
                            ffmpeg_cmd.extend(['-ss', str(start_time)])
                        
                        if end_time:
                            duration = end_time - start_time
                            ffmpeg_cmd.extend(['-t', str(duration)])
                        
                        ffmpeg_cmd.extend([
                            '-c:v', 'libx264',
                            '-c:a', 'aac',
                            '-y',
                            trimmed_file.name
                        ])
                        
                        logger.info(f"Trimming video {idx + 1} from {start_time}s to {end_time}s")
                        result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, timeout=120)
                        
                        if result.returncode != 0:
                            logger.error(f"FFmpeg trim error: {result.stderr}")
                            return {"success": False, "error": f"Failed to trim video {idx + 1}"}
                        
                        # Use trimmed file for concatenation
                        temp_files[idx] = trimmed_file.name
                    else:
                        trimmed_files.append(temp_file.name)
                else:
                    trimmed_files.append(temp_file.name)
            
            # Create concat file for ffmpeg using the final files (trimmed or original)
            concat_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt')
            for temp_file in trimmed_files:
                # Escape single quotes and write in ffmpeg concat format
                escaped_path = temp_file.replace("'", "'\\''")
                concat_file.write(f"file '{escaped_path}'\n")
            concat_file.close()
            
            # Generate output filename
            if not output_filename:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_filename = f"merged_{timestamp}.mp4"
            
            output_path = os.path.join(self.output_dir, output_filename)
            
            # Run ffmpeg to concatenate videos
            logger.info(f"Merging {len(video_urls)} videos with ffmpeg...")
            ffmpeg_cmd = [
                'ffmpeg',
                '-f', 'concat',
                '-safe', '0',
                '-i', concat_file.name,
                '-c', 'copy',  # Copy codec (fast, no re-encoding)
                '-y',  # Overwrite output file
                output_path
            ]
            
            result = subprocess.run(
                ffmpeg_cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                logger.error(f"ffmpeg error: {result.stderr}")
                return {
                    "success": False,
                    "error": f"ffmpeg failed: {result.stderr[:500]}"
                }
            
            # Get file size
            file_size = os.path.getsize(output_path)
            
            logger.info(f"Successfully merged {len(video_urls)} videos into {output_path}")
            
            # Get absolute path for development
            cwd = os.getcwd()
            abs_output_path = os.path.join(cwd, output_path) if not os.path.isabs(output_path) else output_path
            abs_output_path = os.path.abspath(abs_output_path)
            logger.info(f"Path debug - CWD: {cwd}, Output path: {output_path}, Absolute path: {abs_output_path}")
            
            return {
                "success": True,
                "output_path": output_path,
                "output_filename": output_filename,
                "file_size": file_size,
                "video_count": len(video_urls),
                "public_url": f"/media/merged_videos/{output_filename}",
                "system_path": abs_output_path
            }
            
        except subprocess.TimeoutExpired:
            logger.error("ffmpeg timeout during video merge")
            return {"success": False, "error": "Video merge timeout (>5 minutes)"}
        except Exception as e:
            logger.error(f"Error merging videos: {str(e)}")
            return {"success": False, "error": str(e)}
        finally:
            # Cleanup temp files
            for temp_file in temp_files:
                try:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                except Exception as e:
                    logger.warning(f"Failed to delete temp file {temp_file}: {e}")
            
            if concat_file and os.path.exists(concat_file.name):
                try:
                    os.remove(concat_file.name)
                except Exception as e:
                    logger.warning(f"Failed to delete concat file: {e}")
