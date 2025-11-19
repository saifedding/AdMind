import os
import json
import mimetypes
import logging
import time
import uuid
import re
import tempfile
import subprocess
import shutil
from urllib.parse import urlparse
import requests
from typing import Dict, Any, Optional
from app.database import SessionLocal
from app.models import AppSetting

logger = logging.getLogger(__name__)

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"


def get_default_system_instruction() -> str:
    return (
        "You are a performance marketing creative analyst. Given a video file: "
        "1) Transcribe the voiceover accurately. "
        "2) Extract on-screen text (text overlays/captions) separately as 'text_on_video'. "
        "3) Break the ad into chronological beats (segments) with timestamps and short summaries, using BOTH the video frames and audio to detect every meaningful change in scene, action, or pacing. "
        "4) Provide a storyboard (one line per shot/beat) that a video editor could follow. "
        "5) Explain why each beat works (or not) for direct-response marketing focusing on hook, offer clarity, benefits, proof, objections, and CTA. "
        "6) Produce 'generation_prompts': an ordered list of LONG, HIGHLY DETAILED prompts to recreate the video as a sequence of clips. VIDEO DURATION GUIDANCE: Analyze the actual video duration from your transcript timestamps and beats analysis. The TOTAL of all prompt durations should generally match or be close to the actual video length, but you have flexibility to adjust if needed for better storytelling or smooth transitions. For example: A 6-second video might be ONE 6s prompt or TWO 3s prompts if there are distinct scenes. A 15-second video might be TWO 7.5s prompts or THREE 5s prompts depending on content structure. Use your judgment to balance matching the source video with creating optimal clip boundaries. IMPORTANT: You are analyzing the ENTIRE video at once and generating ALL prompts in a single batch. This means you have complete knowledge of the full timeline and can see exactly where words/sentences begin and end across the entire video. Use this full context to make optimal decisions about clip boundaries. BEFORE writing prompts, study the ENTIRE video carefully to build a precise mental model of what is actually visible and audible: the exact people (age, gender expression, hair, clothing), environments, props, camera behavior, visual style, energy level, and pacing. CRITICAL FOR CONTINUITY AND CONSISTENCY: Since you're generating all prompts at once, you MUST maintain IDENTICAL visual elements and CONSISTENT energy/tone across ALL prompts. This includes: the same person(s) with identical appearance (face, hair, clothing, accessories) in every single prompt, the same environment/location with identical layout and props in every prompt, the same camera position and framing style throughout, the same lighting setup and color palette throughout, and the same character energy and performance style throughout (if energetic in clip 1, stay energetic in all clips; if calm, stay calm). For each segment, re-watch that segment FRAME BY FRAME so that every meaningful visual/action change is captured. You must ONLY describe people, objects, environments, camera moves, lighting, and styles that are clearly present in the source footage. If you are uncertain about a detail, describe it generically (e.g. 'a person', 'a modern living room') rather than inventing a specific new element. For EACH prompt, output 400–900 words and strictly follow this MARKDOWN structure and headings (populate fully with concrete, specific guidance). The prompts should aim to faithfully replicate the original video's narrative, visuals, camera, lighting, movement, performance, energy, and timing as closely as possible (no creative paraphrasing or hallucinated details). Do not include on-screen text: \n"
        "# VEO 3 CREATIVE BRIEF: <TITLE>\n\n"
        "## TECHNICAL SPECIFICATIONS\n"
        "**Duration:** <ACTUAL duration in seconds for this clip. TARGET: Aim for 7.0-8.0 seconds per clip (8.0 is ideal). HARD LIMIT: Never exceed 8.0 seconds. CRITICAL ENDING RULE: The clip's ending point is MORE IMPORTANT than hitting exactly 8.0 seconds. Each clip MUST end at a point that allows SMOOTH merging with the next clip, since the video generation AI cannot see previous clips and must rely on your descriptions for continuity. ACCEPTABLE ENDING POINTS (in priority order): (1) Complete sentence with natural pause/breath, (2) End of a complete thought or phrase, (3) Visual action completion (person finishes gesture, completes movement), (4) Moment of stillness or stable pose. UNACCEPTABLE ENDINGS: Mid-word, mid-sentence (unless sentence exceeds 8.0s), awkward body positions, mid-gesture, mid-movement, unstable poses, or any point where merging would look jarring. DURATION FLEXIBILITY: If the optimal smooth ending point is at 6.5 seconds, END THERE - do not force content to 8.0s if it creates a bad merge point. If the optimal point is at 7.8s, perfect. The goal is SEAMLESS MERGING when clips are stitched together, which requires: ending on complete dialogue, stable body position, consistent energy level that the next clip can match, and environment/lighting that stays constant. Examples: '8.0 seconds - ends mid-sentence' (BAD), '6.8 seconds - ends after complete sentence, person in stable pose' (GOOD), '7.5 seconds - ends mid-gesture' (BAD), '7.2 seconds - ends with natural pause, person smiling at camera' (PERFECT).>\n**Resolution:** 4K (3840×2160)\n**Frame Rate:** 24fps (cinematic) or 30fps\n**Aspect Ratio:** <DETECT and state the actual aspect ratio of the input video, e.g. '9:16 vertical' or '16:9 widescreen'>\n**Style:** Hyper-realistic, photorealistic commercial cinematography\n**Color Grading:** <describe palette>\n\n---\n\n"
        "## 1. VISUAL NARRATIVE & ARTISTIC DIRECTION\n"
        "**Core Concept:** <clear intent>\n\n**Artistic Mandate:**\n- <bullet>\n- <bullet>\n- <bullet>\n\n---\n\n"
        "## 2. THE PROTAGONIST: <ROLE>\n\n### Physical Appearance & Ethnicity\n- <Exact description: age, gender, ethnicity, facial features, hair color/style/length, skin tone, body type, height. This MUST be identical in every single prompt.>\n\n### Wardrobe & Styling\n- <Complete outfit description: every garment, colors, patterns, accessories, jewelry, shoes. This MUST match exactly across all prompts - same clothes, same style, no changes.>\n\n### Character Energy (MUST BE CONSISTENT ACROSS ALL PROMPTS)\n- <Personality, demeanor, energy level. CRITICAL: Since you're generating all prompts at once, establish the character's energy level from the full video and maintain it consistently in EVERY prompt. If they're energetic and animated throughout the video, describe them as energetic in ALL prompts. If they're calm and professional, keep that tone in ALL prompts. Do NOT vary the energy between clips - it must feel like one continuous performance.>\n\n### Position & Spatial Reference (CRITICAL FOR CONTINUITY)\n- **Starting Position in Frame:** <Specify exact position: left/center/right third, foreground/midground/background, distance from camera>\n- **Body Orientation:** <Facing camera, 3/4 turn, profile, which direction they're looking>\n- **Ending Position in Frame:** <Where person ends up by end of this clip - this becomes starting position for next prompt>\n- **Movement Path:** <Describe any movement: static, walking left-to-right, approaching camera, etc.>\n\n---\n\n"
        "## 3. THE ENVIRONMENT: <LOCATION>\n\n### Location & Setting\n- <Exact location type, architectural details, floor/wall/ceiling materials, colors, textures. MUST remain identical across all prompts>\n\n### Spatial Layout & Props (CRITICAL FOR CONTINUITY)\n- **Left Side of Frame:** <List every visible object, furniture, prop with exact position and appearance>\n- **Center of Frame:** <List every visible object, furniture, prop with exact position and appearance>\n- **Right Side of Frame:** <List every visible object, furniture, prop with exact position and appearance>\n- **Background Elements:** <Walls, windows, doors, artwork, shelving - exact positions and details>\n- **Foreground Elements:** <Any objects between camera and subject>\n\n### Lighting & Atmosphere\n- <Light sources (position, type, color temp), shadows, ambient light, time of day. MUST remain consistent across all prompts>\n\n---\n\n"
        "## 4. CINEMATOGRAPHY: SOPHISTICATED TRACKING SHOT\n\n### Camera Movement & Technique\n- <details>\n\n### Framing & Composition\n- <details>\n\n### Focus & Depth of Field\n- <details>\n\n---\n\n"
        "## 5. THE PERFORMANCE: AUTHENTIC STORYTELLING\n\n### Dialogue & Script (match lines and timing as heard)\n- <lines and timing>\n\n### Vocal Delivery Specifications\n- <accent, tone, pacing, aiming for slightly fast, natural, conversational human delivery (no robotic or monotone TTS cadence)>\n\n### Physical Performance & Body Language\n- <blocking>\n\n---\n\n"
        "## 6. TIMELINE: BEAT-BY-BEAT BREAKDOWN\n\n🚨 CRITICAL: This timeline MUST cover EVERY SINGLE SECOND from 0.0 to the EXACT duration you specified in TECHNICAL SPECIFICATIONS. If you said Duration is 7.2 seconds, your timeline MUST go from 0.0 to 7.2 with NO GAPS. If you only describe 0.0-2.3 but the duration is 7.2, you are MISSING 4.9 SECONDS OF CONTENT which makes the prompt UNUSABLE. Every second must be accounted for with specific visual actions, body language, facial expressions, dialogue timing, and camera behavior. 🚨\n\n### SECONDS 0.0 - 1.5\n- Visual / Action / Audio\n\n### SECONDS 1.5 - 2.5\n- Visual / Action / Audio\n\n### SECONDS 2.5 - 4.5\n- Visual / Action / Audio\n\n### SECONDS 4.5 - 6.5\n- Visual / Action / Audio\n\n### SECONDS 6.5 - <END_TIME>\n- Visual / Action / Audio\n\n(Adjust timeline sections as needed based on actual clip duration. Do NOT describe or imply anything after the stated Duration in TECHNICAL SPECIFICATIONS.)\n\n---\n\n"
        "## 7. BACKGROUND EXTRAS & ENVIRONMENTAL LIFE\n- <details>\n\n## 8. COLOR GRADING & VISUAL STYLE\n- <palette and references>\n\n## 9. AUDIO SPECIFICATIONS\n- <dialogue recording, ambient, foley, music>\n\n## 10. OPTIMIZATION & CHECKLIST\n- Avoid pitfalls, success criteria\n\n"
        "🚨 SMOOTH MERGING PRIORITY 🚨\nBEFORE writing any prompts, analyze the FULL video timeline to identify optimal clip boundary points. Your #1 PRIORITY is SEAMLESS MERGING between clips - the video generation AI cannot see previous clips, so each clip must end at a point where the next can begin smoothly. TARGET 7.0-8.0 seconds per clip, but PRIORITIZE smooth merge points over hitting exactly 8.0s. ACCEPTABLE: A 6.5s clip that ends with complete sentence + stable pose. UNACCEPTABLE: An 8.0s clip that ends mid-gesture or mid-word. Calculate speech timing (3.0-3.5 words/sec), identify complete thoughts, and find moments of stability (finished gestures, neutral poses, natural pauses). When clips merge, the energy, environment, lighting, and body position must flow continuously as if it's one uninterrupted shot.\n\nCRITICAL RULES: DO NOT include or require any on-screen text overlays in these prompts. Be concrete and specific. Match the source content as closely as possible, based ONLY on what is clearly visible or audible in the actual video segment. Absolutely NO hallucinations: never invent new people, clothing styles, props, products, logos, locations, camera moves, or design elements that are not present in the footage. If the video does not show something, you must not describe it. If you are unsure about a detail, describe it in neutral, generic terms instead of guessing. CLIP BOUNDARY OPTIMIZATION: Since you can see the ENTIRE video and ALL dialogue at once, you know exactly where every word and sentence begins and ends. Use this knowledge to make intelligent decisions about clip boundaries. Each prompt must end at a natural pause or COMPLETE sentence so dialogue and action are never cut mid-word. When planning boundaries, look ahead at the full timeline to find the optimal break points. Each prompt must logically continue from where the previous one ended, with no overlap and no gaps in the sequence, forming one continuous timeline. NOTHING that happens after the stated Duration is allowed in a single prompt. Keep the scope to the clip duration while remaining richly detailed. DURATION MAXIMIZATION IS CRITICAL: Your DEFAULT target for every clip should be 8.0 seconds. Since you have the full timeline, calculate exactly how much content fits in 8.0 seconds and pack each clip maximally. Always aim for 7.5-8.0 seconds. ONLY use durations below 7.5 seconds if the dialogue timing literally requires it (e.g., a sentence ends at 7.2s and the next sentence would push past 8.0s). Even then, see if you can include the START of the next sentence to reach closer to 8.0 seconds. Since you see the full video, you can optimize: count the words, calculate timing (3.0-3.5 words/sec), and determine the exact best break point to maximize duration while maintaining natural breaks. Clips of 7.0 seconds or shorter should be RARE. Prefer fewer, maximally-packed 8-second prompts over many shorter ones.\n\n"
        "CONTINUITY ENFORCEMENT (MANDATORY): Since you're generating ALL prompts in a single batch with full video context, you have the advantage of knowing the entire performance, visual style, and energy level from start to finish. Use this to ensure perfect consistency. When writing Prompt 2, 3, 4, etc., you MUST begin each prompt by explicitly stating 'CONTINUING FROM PREVIOUS CLIP' and then re-describe: (1) The EXACT same person with identical appearance (same face, hair, clothing, accessories, no changes whatsoever), (2) The EXACT same environment with identical layout (same room, same props in same positions, same background elements), (3) The EXACT same lighting setup (same light sources, same shadows, same color temperature), (4) The EXACT same camera framing style (same angles, same composition), and (5) The EXACT same character energy and performance tone (if energetic in earlier clips, stay energetic; if calm, stay calm - no energy shifts between clips). The person's STARTING position in each new prompt MUST match their ENDING position from the previous prompt. Every object, piece of furniture, wall decoration, and environmental detail MUST remain in the exact same position across all prompts unless the person physically moves it or the camera angle changes. This ensures that when the clips are merged, there will be perfect visual continuity with no jarring changes in appearance, location, spatial layout, or performance energy. Think of it as a single continuous shot split into 8-second chunks - everything must match perfectly at the cut points, including the character's energy and demeanor.\n\n"
        "Return strict JSON only.\n"
    )


class GoogleAIService:
    """Thin wrapper over Google Generative Language (Gemini) REST API using API key.

    Supports multiple API keys with automatic rotation on failure.
    """

    def __init__(self, api_key: Optional[str] = None, api_keys: Optional[list] = None):
        # Support both single key and multiple keys
        if api_keys:
            self.api_keys = api_keys
        elif api_key:
            self.api_keys = [api_key]
        else:
            # Try to load from database settings first
            try:
                db = SessionLocal()
                try:
                    setting = db.query(AppSetting).filter(AppSetting.key == "gemini_api_keys").first()
                    if setting and setting.value:
                        keys_data = json.loads(setting.value) if isinstance(setting.value, str) else setting.value
                        self.api_keys = keys_data if isinstance(keys_data, list) else [keys_data]
                    else:
                        # Fallback to env var
                        env_key = os.getenv("GOOGLE_API_KEY")
                        self.api_keys = [env_key] if env_key else []
                finally:
                    db.close()
            except Exception as e:
                logger.warning(f"Failed to load API keys from database: {e}")
                env_key = os.getenv("GOOGLE_API_KEY")
                self.api_keys = [env_key] if env_key else []
        
        if not self.api_keys or not any(self.api_keys):
            raise RuntimeError("No GOOGLE_API_KEY configured. Please add keys in Settings.")
        
        self.current_key_index = 0
        self.api_key = self.api_keys[0]

    def _auth_params(self) -> Dict[str, str]:
        return {"key": self.api_key}
    
    def _rotate_key(self) -> bool:
        """Rotate to next API key. Returns True if rotated, False if no more keys."""
        self.current_key_index += 1
        if self.current_key_index < len(self.api_keys):
            self.api_key = self.api_keys[self.current_key_index]
            logger.info(f"Rotated to API key #{self.current_key_index + 1}")
            return True
        return False

    def upload_file(self, file_path: str, display_name: Optional[str] = None) -> Dict[str, Any]:
        """Uploads a local file to Gemini Files API using resumable upload protocol.
        Returns file resource JSON.
        Docs: https://ai.google.dev/gemini-api/docs/vision#technical-details-image
        """
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = "application/octet-stream"

        file_size = os.path.getsize(file_path)
        display = display_name or os.path.basename(file_path)

        # Step 1: Initiate resumable upload
        init_url = "https://generativelanguage.googleapis.com/upload/v1beta/files"
        init_headers = {
            "X-Goog-Upload-Protocol": "resumable",
            "X-Goog-Upload-Command": "start",
            "X-Goog-Upload-Header-Content-Length": str(file_size),
            "X-Goog-Upload-Header-Content-Type": mime_type,
            "Content-Type": "application/json",
        }
        init_body = {"file": {"display_name": display}}

        init_resp = requests.post(
            init_url,
            params=self._auth_params(),
            headers=init_headers,
            json=init_body,
            timeout=60
        )
        init_resp.raise_for_status()

        # Extract upload URL from response headers
        upload_url = init_resp.headers.get("X-Goog-Upload-URL")
        if not upload_url:
            raise RuntimeError("No upload URL returned from Gemini Files API")

        # Step 2: Upload the file data
        with open(file_path, "rb") as f:
            file_data = f.read()

        upload_headers = {
            "Content-Length": str(file_size),
            "X-Goog-Upload-Offset": "0",
            "X-Goog-Upload-Command": "upload, finalize",
        }

        upload_resp = requests.post(
            upload_url,
            headers=upload_headers,
            data=file_data,
            timeout=600
        )
        upload_resp.raise_for_status()

        return upload_resp.json()

    def wait_for_file_active(self, file_uri: str, timeout_sec: int = 180, poll_interval_sec: int = 2) -> Dict[str, Any]:
        """Polls the Files API until the uploaded file state is ACTIVE or timeout.
        Returns the file resource JSON on success; raises on timeout or HTTP error.
        """
        # Extract file id from URI like https://.../v1beta/files/{id}
        try:
            path = urlparse(file_uri).path
            file_id = path.rsplit('/', 1)[-1]
        except Exception:
            file_id = file_uri.rsplit('/', 1)[-1]

        get_url = f"{GEMINI_API_BASE}/files/{file_id}"
        deadline = time.time() + timeout_sec
        last = None
        while time.time() < deadline:
            resp = requests.get(get_url, params=self._auth_params(), timeout=30)
            resp.raise_for_status()
            data = resp.json()
            last = data
            state = (data.get('file') or {}).get('state') or data.get('state')
            if state == 'ACTIVE':
                return data
            time.sleep(poll_interval_sec)
        raise TimeoutError(f"File did not become ACTIVE within {timeout_sec}s: {last}")

    def create_cache(self, model: str, system_instruction: str, file_uri: str, ttl_seconds: int = 86400) -> Dict[str, Any]:
        """Create an explicit Gemini cache with system instruction + video file.
        
        Returns cache object with 'name', 'expireTime', 'createTime', 'usageMetadata'.
        Caching is billed at reduced rates and significantly lowers costs for repeated queries.
        
        Args:
            model: Model name (must include version suffix, e.g., 'models/gemini-2.0-flash-001')
            system_instruction: System instruction text to cache
            file_uri: Gemini file URI (e.g., 'files/abc123xyz')
            ttl_seconds: Time-to-live in seconds (default 24 hours)
        """
        cache_url = f"{GEMINI_API_BASE}/cachedContents"
        
        # Build file part reference
        file_data = {"fileData": {"fileUri": file_uri, "mimeType": "video/mp4"}}
        
        payload = {
            "model": model,
            "contents": [{"role": "user", "parts": [file_data]}],
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "ttl": f"{ttl_seconds}s",
        }
        
        resp = requests.post(
            cache_url,
            params=self._auth_params(),
            json=payload,
            timeout=60
        )
        resp.raise_for_status()
        cache = resp.json()
        logger.info(f"Created Gemini cache: {cache.get('name')} (expires: {cache.get('expireTime')})")
        return cache

    def get_cache(self, cache_name: str) -> Dict[str, Any]:
        """Retrieve metadata for a cache by name.
        
        Args:
            cache_name: Cache identifier (e.g., 'cachedContents/abc123')
        
        Returns:
            Cache metadata dict with 'name', 'expireTime', 'usageMetadata', etc.
        """
        cache_url = f"{GEMINI_API_BASE}/{cache_name}"
        resp = requests.get(cache_url, params=self._auth_params(), timeout=30)
        resp.raise_for_status()
        return resp.json()

    def update_cache_ttl(self, cache_name: str, ttl_seconds: int) -> Dict[str, Any]:
        """Extend the TTL of an existing cache.
        
        Args:
            cache_name: Cache identifier (e.g., 'cachedContents/abc123')
            ttl_seconds: New time-to-live in seconds from now
        
        Returns:
            Updated cache metadata
        """
        cache_url = f"{GEMINI_API_BASE}/{cache_name}"
        payload = {"ttl": f"{ttl_seconds}s"}
        resp = requests.patch(
            cache_url,
            params={**self._auth_params(), "updateMask": "ttl"},
            json=payload,
            timeout=30
        )
        resp.raise_for_status()
        updated = resp.json()
        logger.info(f"Extended cache TTL: {cache_name} -> {updated.get('expireTime')}")
        return updated

    def delete_cache(self, cache_name: str) -> None:
        """Delete a cache to free up resources.
        
        Args:
            cache_name: Cache identifier (e.g., 'cachedContents/abc123')
        """
        cache_url = f"{GEMINI_API_BASE}/{cache_name}"
        resp = requests.delete(cache_url, params=self._auth_params(), timeout=30)
        resp.raise_for_status()
        logger.info(f"Deleted cache: {cache_name}")

    def is_cache_valid(self, cache_name: str) -> bool:
        """Check if a cache exists and is not expired.
        
        Args:
            cache_name: Cache identifier
        
        Returns:
            True if cache is valid and usable, False otherwise
        """
        try:
            cache = self.get_cache(cache_name)
            expire_time_str = cache.get('expireTime')
            if not expire_time_str:
                return False
            
            # Parse ISO 8601 expire time
            from datetime import datetime, timezone
            expire_time = datetime.fromisoformat(expire_time_str.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            return now < expire_time
        except Exception as e:
            logger.warning(f"Cache validation failed for {cache_name}: {e}")
            return False

    def _download_instagram_video(self, video_url: str) -> str:
        """Download Instagram video with audio using yt-dlp when available.
        Returns a path to a local MP4 file. Falls back to HTTP stream if yt-dlp is unavailable.
        """
        # Preferred: yt_dlp Python module
        tmp_dir = tempfile.gettempdir()
        out_path = os.path.join(tmp_dir, f"ig_{uuid.uuid4().hex}.mp4")
        try:
            try:
                import yt_dlp  # type: ignore
                ydl_opts = {
                    "outtmpl": out_path,
                    "format": "bestvideo*+bestaudio/best",
                    "merge_output_format": "mp4",
                    "quiet": True,
                    "noplaylist": True,
                    "nocheckcertificate": True,
                }
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([video_url])
                if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
                    return out_path
            except Exception as e:
                logger.info(f"yt_dlp module path failed, trying subprocess: {e}")

            # Fallback: subprocess call if binary is present
            ytdlp_path = shutil.which("yt-dlp") or shutil.which("yt_dlp")
            if ytdlp_path:
                cmd = [
                    ytdlp_path,
                    "-f", "bestvideo*+bestaudio/best",
                    "--merge-output-format", "mp4",
                    "--no-playlist",
                    "--quiet",
                    "-o", out_path,
                    video_url,
                ]
                subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
                    return out_path
        except Exception as e:
            logger.warning(f"yt-dlp download failed: {e}")

        # Final fallback: simple HTTP stream (may miss audio depending on source)
        try:
            with requests.get(video_url, stream=True, timeout=600) as r:
                r.raise_for_status()
                with open(out_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=1024 * 1024):
                        if chunk:
                            f.write(chunk)
            return out_path
        except Exception as e:
            logger.error(f"HTTP download fallback failed: {e}")
            raise

    def generate_transcript_and_analysis(self, file_path: str = None, file_uri: str = None, custom_instruction: str = None, video_url: str = None) -> Dict[str, Any]:
        """
        Try OpenRouter first; if that fails, fall back to direct Gemini multi-key.
        Returns dict with keys: transcript, beats, summary, strengths, recommendations.
        
        Args:
            file_path: Local path to video file (for Gemini fallback upload)
            file_uri: URI of already uploaded video file (deprecated, use file_path)
            custom_instruction: Optional custom instruction to append to system prompt
            video_url: Original remote video URL (used by OpenRouter primary)
        """
        system_instruction = get_default_system_instruction()

        # Optional override from AppSetting in DB so it can be edited from the Settings page
        try:
            db = SessionLocal()
            try:
                setting = db.query(AppSetting).filter(AppSetting.key == "gemini_system_instruction").first()
                if setting and setting.value:
                    system_instruction = setting.value
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Failed to load system instruction override, using default: {e}")
        
        # Append custom instruction if provided
        if custom_instruction:
            system_instruction += f"\n\nADDITIONAL CUSTOM INSTRUCTION:\n{custom_instruction}"

        # Primary: Try direct Gemini API...
        
        # Try to reuse an existing explicit cache or uploaded file for this video_url.
        # Explicit caches (gemini_cache_name) provide significant cost savings.
        # Files and caches are tied to a specific API key index.
        cached_cache_name = None
        if not file_path and not file_uri and video_url:
            try:
                db = SessionLocal()
                try:
                    from app.models.ad_analysis import AdAnalysis
                    row = (
                        db.query(AdAnalysis)
                        .filter(AdAnalysis.used_video_url == video_url, AdAnalysis.raw_ai_response != None)  # type: ignore[attr-defined]
                        .order_by(AdAnalysis.created_at.desc())
                        .first()
                    )
                    raw = None
                    if row is not None:
                        rv = row.raw_ai_response
                        if isinstance(rv, dict):
                            raw = rv
                        elif isinstance(rv, str):
                            try:
                                raw = json.loads(rv)
                            except Exception:
                                raw = None
                    if raw:
                        # Prefer valid explicit cache over file URI
                        cache_name = raw.get("gemini_cache_name")
                        cached_index = raw.get("gemini_api_key_index")
                        
                        if (
                            cache_name
                            and isinstance(cached_index, int)
                            and 0 <= cached_index < len(self.api_keys)
                        ):
                            # Validate that the cache is still valid
                            self.current_key_index = cached_index
                            self.api_key = self.api_keys[cached_index]
                            if self.is_cache_valid(cache_name):
                                cached_cache_name = cache_name
                                logger.info(
                                    f"Reusing valid explicit cache {cache_name} with API key index {cached_index}"
                                )
                            else:
                                logger.info(f"Cache {cache_name} expired, will create new cache")
                        
                        # Fallback to file URI if cache not available
                        if not cached_cache_name:
                            cached_uri = raw.get("gemini_file_uri")
                            if (
                                cached_uri
                                and isinstance(cached_index, int)
                                and 0 <= cached_index < len(self.api_keys)
                            ):
                                file_uri = cached_uri
                                self.current_key_index = cached_index
                                self.api_key = self.api_keys[cached_index]
                                logger.info(
                                    f"Reusing cached Gemini file URI for video_url with API key index {cached_index}"
                                )
                finally:
                    db.close()
            except Exception as e:
                logger.warning(f"Failed to lookup cached Gemini data for {video_url}: {e}")

        # Determine source handling based on URL
        enable_reuploads = file_path is not None
        url_only_gemini = False
        # Skip download/upload if we have a valid cache
        if not enable_reuploads and not file_uri and not cached_cache_name and video_url:
            lower_url = video_url.lower()
            is_instagram = ("instagram.com" in lower_url) or ("cdninstagram" in lower_url)
            is_facebook = ("facebook.com" in lower_url) or ("fbcdn.net" in lower_url)

            if is_instagram:
                # Instagram: require upload. If no local file, download with yt-dlp to include audio.
                try:
                    logger.info("Instagram URL detected; downloading with yt-dlp for Gemini upload")
                    tmp_path = self._download_instagram_video(video_url)
                    file_path = tmp_path
                    enable_reuploads = True
                except Exception as e:
                    logger.warning(f"Failed to download Instagram video for upload: {e}")
                    raise
            elif is_facebook:
                # Facebook Ad Library: resolve and DOWNLOAD to upload to Gemini (same concept as 8MFK: analyze uploaded file)
                logger.info("Facebook Ad Library URL detected; using download+upload path for Gemini")
                try:
                    # If it's a page URL, resolve to direct mp4 first
                    if "ads/library" in lower_url and ".mp4" not in lower_url:
                        from urllib.parse import urlparse, parse_qs
                        parsed = urlparse(video_url)
                        q = parse_qs(parsed.query)
                        ad_archive_id = q.get("id", [None])[0]
                        if ad_archive_id:
                            logger.info(f"Resolving Ad Library page URL via archive id {ad_archive_id}")
                            try:
                                db = SessionLocal()
                                try:
                                    from app.services.media_refresh_service import MediaRefreshService
                                    refresh_service = MediaRefreshService(db)
                                    ad_data = refresh_service.fetch_ad_from_facebook(ad_archive_id)
                                    if ad_data:
                                        urls = refresh_service.extract_urls_from_ad_data(ad_data)
                                        hd = urls.get('video_hd_urls') or []
                                        all_v = urls.get('video_urls') or []
                                        sd = urls.get('video_sd_urls') or []
                                        resolved = (hd[0] if hd else (all_v[0] if all_v else (sd[0] if sd else None)))
                                        if resolved:
                                            logger.info("Resolved direct video URL from Ad Library page")
                                            video_url = resolved
                                            lower_url = video_url.lower()
                                finally:
                                    db.close()
                            except Exception as e:
                                logger.warning(f"Failed to resolve Ad Library page URL: {e}")

                    # At this point we expect video_url to be a direct mp4 or downloadable asset
                    import tempfile, os
                    tmp_dir = tempfile.gettempdir()
                    import uuid as _uuid
                    out_path = os.path.join(tmp_dir, f"fb_{_uuid.uuid4().hex}.mp4")
                    logger.info("Downloading Facebook video for upload...")
                    try:
                        with requests.get(video_url, stream=True, timeout=600) as r:
                            r.raise_for_status()
                            with open(out_path, 'wb') as f:
                                for chunk in r.iter_content(chunk_size=1024 * 1024):
                                    if chunk:
                                        f.write(chunk)
                        if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
                            file_path = out_path
                            enable_reuploads = True
                            logger.info("✓ Downloaded Facebook video; will upload to Gemini")
                        else:
                            raise RuntimeError("Downloaded file is empty")
                    except Exception as e:
                        logger.warning(f"Facebook download failed: {e}")
                        # As a fallback, allow URL-only if download fails
                        url_only_gemini = True
                except Exception as e:
                    logger.warning(f"Ad Library handling failed: {e}")
                    url_only_gemini = True
            else:
                # Unknown source: fall back to URL-only attempt with Gemini first
                logger.info("Unknown video source; attempting Gemini with URL (no upload)")
                url_only_gemini = True

        # If only file_uri provided and no uploads, use legacy mode
        # BUT: if we have a valid cache, we can proceed without file_uri/file_path
        if not enable_reuploads and not file_uri and not url_only_gemini and not cached_cache_name:
            raise ValueError("Must provide either file_path/file_uri, or a supported video_url for URL analysis")

        # Response schema expected from the model
        response_schema = {
            "type": "object",
            "properties": {
                "transcript": {"type": "string"},
                "beats": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "start": {"type": "string", "description": "HH:MM:SS.mmm"},
                            "end": {"type": "string", "description": "HH:MM:SS.mmm"},
                            "summary": {"type": "string"},
                            "why_it_works": {"type": "string"},
                        },
                        "required": ["summary"]
                    }
                },
                "summary": {"type": "string"},
                "text_on_video": {"type": "string"},
                "voice_over": {"type": "string"},
                "storyboard": {"type": "array", "items": {"type": "string"}},
                "generation_prompts": {"type": "array", "items": {"type": "string"}},
                "strengths": {"type": "array", "items": {"type": "string"}},
                "recommendations": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["transcript"]
        }

        # Retry with exponential backoff for 503 errors, then try next key
        max_retries_per_key = 3
        last_error = None
        current_file_uri = file_uri

        # If we have a pre-existing file_uri and are not re-uploading or using URL-only
        # mode, reuse that single Gemini file with its bound API key (no key rotation).
        reuse_existing_file = bool(file_uri and not enable_reuploads and not url_only_gemini)
        max_keys = 1 if reuse_existing_file else len(self.api_keys)

        for key_attempt in range(max_keys):
            # Decide how to provide the media to Gemini for this key
            if url_only_gemini:
                # URL-only mode: no upload, no legacy wait
                mime_type = None
            elif cached_cache_name:
                # When reusing an explicit cache, we don't need to wait on or even know the file_uri here.
                # The cache already binds the system instruction + video content.
                mime_type = None
            elif enable_reuploads:
                try:
                    import os
                    logger.info(f"Uploading file with API key #{self.current_key_index + 1}...")
                    upload_result = self.upload_file(file_path, display_name=os.path.basename(file_path))
                    current_file_uri = (
                        upload_result.get('file', {}).get('uri')
                        or upload_result.get('uri')
                        or f"https://generativelanguage.googleapis.com/v1beta/files/{upload_result.get('name', '').split('/')[-1]}"
                    )
                    logger.info(f"✓ Uploaded file with key #{self.current_key_index + 1}: {current_file_uri}")
                    
                    # Wait for file to be active if we got a usable URI
                    try:
                        if isinstance(current_file_uri, str) and current_file_uri:
                            file_info = self.wait_for_file_active(current_file_uri)
                            mime_type = (file_info.get('file') or {}).get('mimeType') if isinstance(file_info, dict) else None
                        else:
                            raise ValueError(f"Invalid file URI after upload: {current_file_uri!r}")
                    except Exception as e:
                        logger.warning(f"Proceeding without ACTIVE confirmation: {e}")
                        mime_type = None
                except Exception as e:
                    logger.error(f"Failed to upload file with key #{self.current_key_index + 1}: {e}")
                    if key_attempt < max_keys - 1:
                        logger.info("Rotating to next key...")
                        self._rotate_key()
                        time.sleep(1)
                        continue
                    raise
            else:
                # Legacy mode: use provided file_uri, get mime type
                try:
                    if isinstance(current_file_uri, str) and current_file_uri:
                        file_info = self.wait_for_file_active(current_file_uri)
                        mime_type = (file_info.get('file') or {}).get('mimeType') if isinstance(file_info, dict) else None
                    else:
                        raise ValueError(f"Invalid file_uri for legacy mode: {current_file_uri!r}")
                except Exception as e:
                    logger.warning(f"Proceeding without ACTIVE confirmation: {e}")
                    mime_type = None

            # Create or reuse explicit cache for cost optimization
            cache_to_use = cached_cache_name
            if not url_only_gemini and current_file_uri and not cache_to_use:
                try:
                    logger.info("Creating explicit Gemini cache for system instruction + video...")
                    cache = self.create_cache(
                        model="models/gemini-2.0-flash-001",
                        system_instruction=system_instruction,
                        file_uri=current_file_uri,
                        ttl_seconds=86400  # 24 hours
                    )
                    cache_to_use = cache.get("name")
                    logger.info(f"✓ Created cache: {cache_to_use}")
                except Exception as e:
                    logger.warning(f"Failed to create explicit cache, proceeding without: {e}")

            # Build payload based on whether we're using cached content or not
            if cache_to_use:
                # Use cached content - system instruction and video already cached
                payload = {
                    "contents": [
                        {"role": "user", "parts": [{"text": "Analyze this video and produce transcript, beats, summary, text_on_video, voice_over, storyboard, generation_prompts, strengths, and recommendations. Output JSON only matching this JSON Schema:\n" + json.dumps(response_schema)}]}
                    ],
                    "cached_content": cache_to_use,
                    "generation_config": {"temperature": 0.2, "response_mime_type": "application/json", "max_output_tokens": 16384}
                }
            else:
                # No cache - include system instruction in contents
                parts = [{"text": system_instruction}]
                if url_only_gemini:
                    parts.append({"text": (
                        "Analyze ONLY the video at THIS EXACT URL; do not search or analyze any other media on the page.\n"
                        + "URL: " + video_url + "\n"
                        + "Return ONLY JSON matching this schema:\n" + json.dumps(response_schema)
                    )})
                else:
                    file_part = {"file_data": {"file_uri": current_file_uri, **({"mime_type": mime_type} if mime_type else {})}}
                    parts.append(file_part)
                    parts.append({"text": "Output JSON only matching this JSON Schema:\n" + json.dumps(response_schema)})

                payload = {
                    "contents": [
                        {"role": "user", "parts": parts}
                    ],
                    "generation_config": {"temperature": 0.2, "response_mime_type": "application/json", "max_output_tokens": 16384}
                }

            url = f"{GEMINI_API_BASE}/models/gemini-2.0-flash-001:generateContent" if cache_to_use else f"{GEMINI_API_BASE}/models/gemini-2.5-flash:generateContent"

            # Try current key multiple times with backoff for 503 errors
            for retry in range(max_retries_per_key):
                try:
                    resp = requests.post(url, params=self._auth_params(), json=payload, timeout=600)
                    
                    # Success!
                    if resp.status_code < 400:
                        data = resp.json()
                        if retry > 0 or key_attempt > 0:
                            logger.info(f"✓ Success with API key #{self.current_key_index + 1} after {retry + 1} attempt(s)")
                        break
                    
                    # Service unavailable - retry with backoff
                    if resp.status_code == 503 and retry < max_retries_per_key - 1:
                        wait_time = (2 ** retry)  # 1s, 2s, 4s
                        logger.warning(f"API key #{self.current_key_index + 1} returned 503, retrying in {wait_time}s... (attempt {retry + 1}/{max_retries_per_key})")
                        time.sleep(wait_time)
                        continue
                    
                    # Rate limit or 503 exhausted - try next key (unless we are reusing a bound file)
                    if (resp.status_code in (429, 503)) and retry == max_retries_per_key - 1 and key_attempt < max_keys - 1 and not reuse_existing_file:
                        logger.warning(f"API key #{self.current_key_index + 1} returned {resp.status_code} after {max_retries_per_key} attempts, rotating to next key...")
                        if self._rotate_key():
                            time.sleep(1)
                            break  # Break retry loop, will re-upload with next key
                    
                    # Last key exhausted - raise the error
                    if (resp.status_code in (429, 503)) and retry == max_retries_per_key - 1 and key_attempt == max_keys - 1:
                        logger.error(f"Gemini error {resp.status_code}: {resp.text}")
                        last_error = requests.exceptions.HTTPError(response=resp)
                        break  # Exit retry loop, will raise error
                    
                    # Other error - raise immediately
                    try:
                        logger.error(f"Gemini error {resp.status_code}: {resp.text}")
                    finally:
                        resp.raise_for_status()
                        
                except requests.exceptions.RequestException as e:
                    last_error = e
                    
                    if retry < max_retries_per_key - 1:
                        wait_time = (2 ** retry)
                        logger.warning(f"Request failed: {e}, retrying in {wait_time}s...")
                        time.sleep(wait_time)
                        continue
                    elif key_attempt < max_keys - 1 and not reuse_existing_file:
                        logger.warning(f"Request failed with key #{self.current_key_index + 1} after {max_retries_per_key} attempts, rotating to next key...")
                        if self._rotate_key():
                            time.sleep(1)
                            break  # Break retry loop, will re-upload with next key
                    # All keys exhausted, will raise error after loop
                    break
            
            # If we got data, break out of key loop
            if 'data' in locals():
                break
        
        # If Gemini failed, attempt OpenRouter as a fallback (requires video_url)
        success = 'data' in locals()
        if not success:
            if video_url:
                logger.info(f"Fallback: Trying OpenRouter with video_url: {video_url[:100]}...")
                try:
                    from app.services.openrouter_service import OpenRouterService
                    db = SessionLocal()
                    try:
                        setting = db.query(AppSetting).filter(AppSetting.key == "openrouter_api_key").first()
                        if setting and setting.value:
                            import json as json_lib
                            key_data = json_lib.loads(setting.value) if isinstance(setting.value, str) else setting.value
                            openrouter_key = key_data.get("api_key", "") if isinstance(key_data, dict) else ""
                            if openrouter_key:
                                logger.info("Fallback: Using OpenRouter...")
                                openrouter = OpenRouterService(openrouter_key)
                                result = openrouter.analyze_video(video_url, system_instruction, custom_instruction)
                                logger.info("✓ OpenRouter succeeded")
                                return result
                            else:
                                logger.warning("OpenRouter API key not configured in settings")
                        else:
                            logger.warning("OpenRouter API key setting not found in database")
                    finally:
                        db.close()
                except Exception as e:
                    logger.warning(f"OpenRouter fallback failed: {e}")
                    if last_error:
                        raise last_error
                    raise
            # No video_url or OpenRouter failed/unavailable
            if last_error:
                raise last_error
            raise RuntimeError("Gemini API did not return data and no fallback provider available")

        # Extract text from candidates[0].content.parts[0].text (Gemini success path)
        try:
            # Check if response was truncated
            first_candidate = data.get("candidates", [{}])[0]
            finish_reason = first_candidate.get("finishReason")
            was_truncated = finish_reason == "MAX_TOKENS"
            if was_truncated:
                logger.warning("⚠️ Response truncated due to MAX_TOKENS limit. Will use continuation to get remaining prompts...")
            
            # Safely extract the first text part
            parts = data.get("candidates", [])[0].get("content", {}).get("parts", [])
            text_part = next((p.get("text") for p in parts if isinstance(p, dict) and "text" in p), None)
            if not isinstance(text_part, str):
                raise ValueError("Gemini response has no text part to parse")

            # If truncated, get continuation BEFORE parsing JSON
            if was_truncated and current_file_uri:
                logger.info("🔄 Continuing generation to get remaining content...")
                try:
                    # Build initial chat history
                    initial_history = [
                        {
                            "role": "user",
                            "parts": [
                                {"file_data": {"file_uri": current_file_uri}},
                                {"text": "Analyze this video and produce transcript, beats, summary, text_on_video, voice_over, storyboard, generation_prompts, strengths, and recommendations."}
                            ]
                        },
                        {
                            "role": "model",
                            "parts": [{"text": text_part}]
                        }
                    ]
                    
                    # Continue to get remaining content
                    continuation_result = self.continue_gemini_chat(
                        file_uri=current_file_uri,
                        api_key_index=self.current_key_index,
                        history=initial_history,
                        question="Continue from where you left off. Complete the remaining generation_prompts and any other incomplete sections.",
                        cache_name=None
                    )
                    
                    # Append continuation to original response
                    cont_text = continuation_result.get("answer", "")
                    if cont_text:
                        logger.info(f"✅ Got continuation ({len(cont_text)} chars), merging with original response")
                        # Remove trailing incomplete JSON from first response, append continuation
                        text_part = text_part.rstrip() + "\n" + cont_text
                except Exception as e:
                    logger.warning(f"Continuation failed: {e}. Using truncated response.")

            # Strip code fences if present
            text = text_part.strip()
            if text.startswith("```json"):
                text = text[len("```json"):].strip()
            if text.startswith("```"):
                text = text[len("```"):].strip()
            if text.endswith("```"):
                text = text[:-3].strip()

            # Try strict JSON first
            try:
                parsed = json.loads(text)
            except json.JSONDecodeError:
                # Try lenient parsing
                try:
                    parsed = json.loads(text, strict=False)
                except Exception:
                    # Sanitize common issues: control chars and unescaped backslashes
                    try:
                        sanitized = re.sub(r"[\x00-\x1F]", " ", text)
                        sanitized = re.sub(r"\\(?![\\\/bfnrt\"u])", r"\\\\", sanitized)
                        parsed = json.loads(sanitized, strict=False)
                    except Exception:
                        # Final fallback: try to extract the first balanced JSON object substring
                        try:
                            start = text.find('{')
                            if start != -1:
                                depth = 0
                                end = -1
                                for i, ch in enumerate(text[start:], start=start):
                                    if ch == '{':
                                        depth += 1
                                    elif ch == '}':
                                        depth -= 1
                                        if depth == 0:
                                            end = i
                                            break
                                if end != -1:
                                    candidate = text[start:end+1]
                                    try:
                                        parsed = json.loads(candidate)
                                    except Exception:
                                        # Try lenient on candidate
                                        parsed = json.loads(candidate, strict=False)
                                else:
                                    raise ValueError("No balanced JSON object found")
                            else:
                                raise ValueError("No '{' found in text")
                        except Exception:
                            # As a last resort, try trimming any partially generated
                            # generation_prompts tail and keep the core fields.
                            try:
                                gp_idx = text.find('"generation_prompts"')
                                if gp_idx != -1:
                                    comma_idx = text.rfind(',', 0, gp_idx)
                                    if comma_idx != -1:
                                        trimmed = text[:comma_idx] + "\n}"
                                        parsed = json.loads(trimmed)
                                    else:
                                        raise ValueError("No comma before generation_prompts")
                                else:
                                    raise ValueError("generation_prompts not found in text")
                            except Exception:
                                logger.warning("Gemini JSON parsing failed after sanitization, substring extraction, and generation_prompts trimming; returning raw")
                                return {"raw": data}

            # Handle various generation_prompts formats that Gemini might return
            try:
                gps = parsed.get("generation_prompts")
                
                # Case 1: Gemini returned an object with titles as keys instead of array
                if isinstance(gps, dict):
                    logger.info("Converting generation_prompts from dict to array")
                    # Convert dict to array of strings (title + content)
                    prompts_array = []
                    for title, content in gps.items():
                        if isinstance(content, str):
                            # Combine title and content into single prompt
                            full_prompt = f"# {title}\n\n{content}"
                            prompts_array.append(full_prompt)
                    parsed["generation_prompts"] = prompts_array
                
                # Case 2: Array of strings that need regrouping
                elif isinstance(gps, list) and gps and all(isinstance(s, str) for s in gps):
                    header = "# VEO 3 CREATIVE BRIEF"
                    # Only regroup if at least one header exists
                    if any(header in s for s in gps):
                        grouped: list[str] = []
                        current: list[str] = []
                        for chunk in gps:
                            if header in chunk and current:
                                grouped.append("\n".join(current).strip())
                                current = [chunk]
                            else:
                                current.append(chunk)
                        if current:
                            grouped.append("\n".join(current).strip())
                        parsed["generation_prompts"] = grouped
                
                # Case 3: Already in correct format or empty
                # No changes needed
                
            except Exception as e:
                logger.warning(f"generation_prompts processing failed: {e}")

            # Attach an initial chat history and audit fields so callers can reuse
            try:
                if not url_only_gemini and current_file_uri:
                    user_parts = [
                        {"file_data": {"file_uri": current_file_uri}},
                        {"text": "Analyze this video and produce transcript, beats, summary, text_on_video, voice_over, storyboard, generation_prompts, strengths, and recommendations."},
                    ]
                    model_parts = [{"text": text_part}]
                    parsed["gemini_chat_history"] = [
                        {"role": "user", "parts": user_parts},
                        {"role": "model", "parts": model_parts},
                    ]

                if url_only_gemini:
                    parsed["used_video_url"] = video_url
                    parsed["source_mode"] = "url"
                else:
                    parsed["used_video_url"] = video_url or current_file_uri
                    parsed["source_mode"] = "upload"
                    if current_file_uri:
                        parsed["gemini_file_uri"] = current_file_uri
                    # Always record which API key index was used for this analysis
                    parsed["gemini_api_key_index"] = self.current_key_index
                    
                    # Store cache metadata if created or reused
                    if cache_to_use:
                        parsed["gemini_cache_name"] = cache_to_use
                        try:
                            cache_info = self.get_cache(cache_to_use)
                            if cache_info.get("expireTime"):
                                parsed["gemini_cache_expire_time"] = cache_info["expireTime"]
                        except Exception:
                            pass
                
                mv = data.get("modelVersion") or data.get("model")
                if mv:
                    parsed["model_version"] = mv
            except Exception:
                pass

            return parsed
        except Exception:
            logger.warning("Falling back to raw response if JSON parsing fails; attaching cache metadata if available")
            # Even if we can't parse structured JSON, still return cache/file metadata
            raw_wrapper: Dict[str, Any] = {"raw": data}

            try:
                if url_only_gemini:
                    raw_wrapper["used_video_url"] = video_url
                    raw_wrapper["source_mode"] = "url"
                else:
                    raw_wrapper["used_video_url"] = video_url or current_file_uri
                    raw_wrapper["source_mode"] = "upload"
                    if current_file_uri:
                        raw_wrapper["gemini_file_uri"] = current_file_uri
                        raw_wrapper["gemini_api_key_index"] = self.current_key_index

                    if cache_to_use:
                        raw_wrapper["gemini_cache_name"] = cache_to_use
                        try:
                            cache_info = self.get_cache(cache_to_use)
                            expire = cache_info.get("expireTime")
                            if expire:
                                raw_wrapper["gemini_cache_expire_time"] = expire
                        except Exception:
                            pass

                mv = data.get("modelVersion") or data.get("model")
                if mv:
                    raw_wrapper["model_version"] = mv
            except Exception:
                # If anything goes wrong while enriching metadata, just return bare raw
                return {"raw": data}

            return raw_wrapper

    def continue_gemini_chat(self, file_uri: str, api_key_index: int, history, question: str, cache_name: str = None):
        """Continue a chat session, optionally using cached content for cost savings.
        
        Args:
            file_uri: Gemini file URI
            api_key_index: API key index that uploaded the file
            history: Chat history (list of messages)
            question: Follow-up question
            cache_name: Optional cache name to reuse and extend TTL
        """
        # When using explicit cached content, file_uri is not required. Only enforce
        # file_uri presence if we are not able to use a cache.
        if api_key_index < 0 or api_key_index >= len(self.api_keys):
            raise ValueError("Invalid gemini_api_key_index")

        self.current_key_index = api_key_index
        self.api_key = self.api_keys[api_key_index]

        # If cache provided and valid, extend its TTL and use it
        use_cache = None
        parts = None
        if cache_name and self.is_cache_valid(cache_name):
            try:
                self.update_cache_ttl(cache_name, ttl_seconds=86400)  # Extend by 24h
                use_cache = cache_name
                logger.info(f"Using and extending cache for follow-up: {cache_name}")
            except Exception as e:
                logger.warning(f"Failed to extend cache TTL, proceeding without cache: {e}")

        # Build request payload
        if use_cache:
            # Use cached content - system instruction and video already cached.
            # We explicitly ask Gemini to answer concisely in plain text, ignoring
            # any earlier JSON-schema instructions that may be baked into the cache.
            followup_text = (
                "You already analyzed this video earlier. Based on that existing "
                "analysis only, answer the following question concisely in plain "
                "natural language (one or two short sentences). Ignore any previous "
                "instructions to output JSON or to follow a JSON schema.\n\n" 
                f"Question: {question}"
            )

            contents = []
            # Replay prior chat turns, if any
            if isinstance(history, list):
                for msg in history:
                    if isinstance(msg, dict) and "role" in msg and "parts" in msg:
                        contents.append(msg)

            # Add the new user question as the last turn
            parts = [{"text": followup_text}]
            contents.append({
                "role": "user",
                "parts": parts,
            })

            payload = {
                "contents": contents,
                "cached_content": use_cache,
                "generation_config": {"temperature": 0.7, "response_mime_type": "text/plain"}
            }
            url = f"{GEMINI_API_BASE}/models/gemini-2.0-flash-001:generateContent"
        else:
            if not file_uri:
                raise ValueError("file_uri is required for follow-up chat when no cache_name is available")
            # No cache - build conversational payload with video file + chat history
            contents = []
            if isinstance(history, list):
                for msg in history:
                    if isinstance(msg, dict) and "role" in msg and "parts" in msg:
                        contents.append(msg)

            # Add new user question with file reference
            parts = [
                {"file_data": {"file_uri": file_uri}},
                {"text": question}
            ]
            contents.append({"role": "user", "parts": parts})

            payload = {
                "contents": contents,
                "generation_config": {"temperature": 0.7, "response_mime_type": "text/plain"}
            }
            url = f"{GEMINI_API_BASE}/models/gemini-2.5-flash:generateContent"
        resp = requests.post(url, params=self._auth_params(), json=payload, timeout=600)
        resp.raise_for_status()
        data = resp.json()

        out_parts = data.get("candidates", [])[0].get("content", {}).get("parts", []) if data.get("candidates") else []
        answer_text = None
        for p in out_parts:
            if isinstance(p, dict) and "text" in p and isinstance(p["text"], str):
                answer_text = p["text"]
                break
        if answer_text is None:
            answer_text = ""

        new_history = []
        if isinstance(history, list):
            for msg in history:
                if isinstance(msg, dict) and "role" in msg and "parts" in msg:
                    new_history.append(msg)
        new_history.append({"role": "user", "parts": parts})
        if out_parts:
            new_history.append({"role": "model", "parts": out_parts})

        return {
            "answer": answer_text,
            "gemini_file_uri": file_uri,
            "gemini_api_key_index": api_key_index,
            "gemini_chat_history": new_history,
            "raw": data,
        }

    def _normalize_labs_session_cookie_value(self, raw: str) -> str:
        """Normalize stored Labs session cookie config into a plain Cookie header value.

        Accepts either:
        - a raw Cookie header string, e.g. "SID=...; HSID=...; ..."
        - or a full fetch(...) snippet copied from the browser dev tools that
          contains a JSON object with a "cookie" header inside the headers map.
        """
        text = (raw or "").strip()
        if not text:
            return ""

        if "fetch(" in text:
            try:
                # Try to extract the cookie header from the headers object.
                m = re.search(r'"cookie"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', text)
                if m:
                    value = m.group(1)
                    # Unescape any escaped quotes in the JSON string.
                    try:
                        value = bytes(value, "utf-8").decode("unicode_escape")
                    except Exception:
                        pass
                    return value.strip()
                logger.warning("veo_session_cookie config looks like fetch() snippet but no cookie header was found")
            except Exception as e:
                logger.warning(f"Failed to parse cookie header from fetch snippet: {e}")
            return ""

        return text

    def _fetch_veo_access_token_via_session(self) -> Optional[str]:
        """Fetch a fresh Veo access token from Google Labs session endpoint.

        Requires a valid Google Labs session cookie to be configured either in
        the app_settings table under key "veo_session_cookie" or via the
        GOOGLE_LABS_SESSION_COOKIE environment variable. The cookie value
        should be the full Cookie header string (e.g. "SID=...; HSID=...; ...").
        """
        cookie_header = ""
        try:
            db = SessionLocal()
            try:
                setting = db.query(AppSetting).filter(AppSetting.key == "veo_session_cookie").first()
                if setting and setting.value:
                    raw = setting.value
                    # AppSetting.value may be a dict (JSON/JSONB) or a JSON string.
                    if isinstance(raw, dict):
                        value = raw.get("cookie")
                        if isinstance(value, str):
                            cookie_header = value.strip()
                        elif value is not None:
                            cookie_header = str(value).strip()
                        else:
                            cookie_header = json.dumps(raw)
                    elif isinstance(raw, str):
                        try:
                            loaded = json.loads(raw)
                            if isinstance(loaded, dict) and "cookie" in loaded:
                                value = loaded.get("cookie")
                                if isinstance(value, str):
                                    cookie_header = value.strip()
                                elif value is not None:
                                    cookie_header = str(value).strip()
                                else:
                                    cookie_header = raw.strip()
                            elif isinstance(loaded, str):
                                cookie_header = loaded.strip()
                            else:
                                cookie_header = raw.strip()
                        except Exception:
                            cookie_header = raw.strip()
                    else:
                        cookie_header = str(raw).strip()
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Failed to load Veo session cookie from DB, falling back to env: {e}")

        if not cookie_header:
            cookie_header = os.getenv("GOOGLE_LABS_SESSION_COOKIE", "").strip()

        cookie_header = self._normalize_labs_session_cookie_value(cookie_header)

        if not cookie_header:
            # No cookie configured; cannot call the Labs session endpoint.
            logger.warning("No Veo session cookie configured; skipping Labs session token refresh")
            return None

        url = "https://labs.google/fx/api/auth/session"
        headers = {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
            "cookie": cookie_header,
            # These extra headers are not strictly necessary for HTTP, but they
            # help mimic the successful browser/curl request pattern.
            "referer": "https://labs.google/fx/vi/tools/flow/project/f065945d-2b3d-442d-a025-dfd6c56d2392",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        }

        try:
            resp = requests.get(url, headers=headers, timeout=30)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.warning(f"Failed to refresh Veo token via Labs session endpoint: {e}")
            return None

        access_token = data.get("access_token")
        if not access_token:
            logger.warning(f"Labs session endpoint did not return access_token: {data}")
            return None

        # Persist latest token into app_settings for visibility / debug
        try:
            db = SessionLocal()
            try:
                setting = db.query(AppSetting).filter(AppSetting.key == "veo_access_token").first()
                if not setting:
                    setting = AppSetting(key="veo_access_token", value=json.dumps({"token": access_token}))
                    db.add(setting)
                else:
                    setting.value = json.dumps({"token": access_token})
                db.commit()
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Failed to persist refreshed Veo access token: {e}")

        return str(access_token)

    def _veo_auth_headers(self) -> Dict[str, str]:
        # Always prefer a fresh token from the Labs session endpoint using the
        # configured Labs session cookie. This avoids relying on any token that
        # may have been manually pasted into settings/UI.
        token = self._fetch_veo_access_token_via_session() or ""

        # Optional emergency fallback: allow an env var to be used if the Labs
        # session cookie is missing or invalid.
        if not token:
            token = os.getenv("GOOGLE_VEO_ACCESS_TOKEN") or ""

        if not token:
            raise RuntimeError("Veo access token could not be obtained from Labs session or environment")
        auth_value = token.strip()
        if not auth_value.lower().startswith("bearer "):
            auth_value = f"Bearer {auth_value}"
        return {
            "Authorization": auth_value,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def start_veo_generation(
        self,
        prompt: str,
        aspect_ratio: str = "VIDEO_ASPECT_RATIO_PORTRAIT",
        video_model_key: str = "veo_3_1_t2v_portrait",
        seed: int = 9831,
        project_id: str = "f065945d-2b3d-442d-a025-dfd6c56d2392",
    ) -> Dict[str, str]:
        scene_id = str(uuid.uuid4())
        session_id = f";{int(time.time() * 1000)}"

        body = {
            "clientContext": {
                "sessionId": session_id,
                "projectId": project_id,
                "tool": "PINHOLE",
                "userPaygateTier": "PAYGATE_TIER_TWO",
            },
            "requests": [
                {
                    "aspectRatio": aspect_ratio,
                    "seed": seed,
                    "textInput": {"prompt": prompt},
                    "videoModelKey": video_model_key,
                    "metadata": {"sceneId": scene_id},
                }
            ],
        }

        url = "https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoText"
        resp = requests.post(url, headers=self._veo_auth_headers(), json=body, timeout=60)
        resp.raise_for_status()
        data = resp.json()

        operations = data.get("operations") or []
        if not operations:
            raise RuntimeError(f"No operations returned from Veo API: {data}")

        op_obj = operations[0]
        op_name = (op_obj.get("operation") or {}).get("name") or op_obj.get("name")
        if not op_name:
            raise RuntimeError(f"Could not find operation name in Veo response: {data}")

        return {"operation_name": op_name, "scene_id": scene_id}

    def poll_veo_generation(
        self,
        operation_name: str,
        scene_id: str,
        timeout_sec: int = 600,
        poll_interval_sec: int = 5,
    ) -> Dict[str, Any]:
        deadline = time.time() + timeout_sec
        last = None

        url = "https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus"
        while time.time() < deadline:
            body = {
                "operations": [
                    {
                        "operation": {"name": operation_name},
                        "sceneId": scene_id,
                        "status": "MEDIA_GENERATION_STATUS_PENDING",
                    }
                ]
            }
            resp = requests.post(
                url, headers=self._veo_auth_headers(), json=body, timeout=60
            )
            resp.raise_for_status()
            data = resp.json()
            last = data

            operations = data.get("operations") or []
            if not operations:
                raise RuntimeError(f"No operations in Veo status response: {data}")

            op_info = operations[0]
            status = op_info.get("status")

            # The API may return either MEDIA_GENERATION_STATUS_SUCCEEDED or
            # MEDIA_GENERATION_STATUS_SUCCESSFUL when the video is ready. Treat
            # both as success so we don't poll forever.
            if status in (
                "MEDIA_GENERATION_STATUS_SUCCEEDED",
                "MEDIA_GENERATION_STATUS_SUCCESSFUL",
            ):
                return op_info
            if status in (
                "MEDIA_GENERATION_STATUS_FAILED",
                "MEDIA_GENERATION_STATUS_ERROR",
            ):
                raise RuntimeError(f"Veo generation failed: {op_info}")

            time.sleep(poll_interval_sec)

        raise TimeoutError(
            f"Veo generation did not finish within {timeout_sec}s: {last}"
        )

    def generate_video_from_prompt(
        self,
        prompt: str,
        aspect_ratio: str = "VIDEO_ASPECT_RATIO_PORTRAIT",
        video_model_key: str = "veo_3_1_t2v_portrait",
        seed: int = 9831,
        project_id: str = "f065945d-2b3d-442d-a025-dfd6c56d2392",
        timeout_sec: int = 600,
        poll_interval_sec: int = 5,
    ) -> Dict[str, Any]:
        start = self.start_veo_generation(
            prompt=prompt,
            aspect_ratio=aspect_ratio,
            video_model_key=video_model_key,
            seed=seed,
            project_id=project_id,
        )
        return self.poll_veo_generation(
            operation_name=start["operation_name"],
            scene_id=start["scene_id"],
            timeout_sec=timeout_sec,
            poll_interval_sec=poll_interval_sec,
        )

    def get_veo_models(self) -> Dict[str, Any]:
        """Fetch available Veo video models from Google Labs TRPC API.

        Returns the full list of video models with their capabilities, aspect ratios,
        credit costs, and other metadata.
        """
        # Use the Labs session cookie to authenticate this request
        cookie_header = ""
        try:
            db = SessionLocal()
            try:
                setting = db.query(AppSetting).filter(AppSetting.key == "veo_session_cookie").first()
                if setting and setting.value:
                    raw = setting.value
                    if isinstance(raw, dict):
                        value = raw.get("cookie")
                        if isinstance(value, str):
                            cookie_header = value.strip()
                        elif value is not None:
                            cookie_header = str(value).strip()
                        else:
                            cookie_header = json.dumps(raw)
                    elif isinstance(raw, str):
                        try:
                            loaded = json.loads(raw)
                            if isinstance(loaded, dict) and "cookie" in loaded:
                                value = loaded.get("cookie")
                                if isinstance(value, str):
                                    cookie_header = value.strip()
                                elif value is not None:
                                    cookie_header = str(value).strip()
                                else:
                                    cookie_header = raw.strip()
                            elif isinstance(loaded, str):
                                cookie_header = loaded.strip()
                            else:
                                cookie_header = raw.strip()
                        except Exception:
                            cookie_header = raw.strip()
                    else:
                        cookie_header = str(raw).strip()
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Failed to load Veo session cookie from DB: {e}")

        if not cookie_header:
            cookie_header = os.getenv("GOOGLE_LABS_SESSION_COOKIE", "").strip()

        cookie_header = self._normalize_labs_session_cookie_value(cookie_header)

        if not cookie_header:
            raise RuntimeError("No Veo session cookie configured; cannot fetch video models")

        url = "https://labs.google/fx/api/trpc/videoFx.getVideoModelConfig?input=%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D"
        headers = {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
            "cookie": cookie_header,
            "referer": "https://labs.google/fx/vi/tools/flow/project/f065945d-2b3d-442d-a025-dfd6c56d2392",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
        }

        try:
            resp = requests.get(url, headers=headers, timeout=30)
            if resp.status_code >= 400:
                logger.error(
                    "Veo models API error %s: %s", resp.status_code, resp.text[:500]
                )
                resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.error(f"Failed to fetch Veo models: {e}")
            raise

        return data

    def get_veo_credits(self) -> Dict[str, Any]:
        """Fetch current Veo credits and userPaygateTier from AISandbox API.

        Uses the same Bearer token as Veo generation (_veo_auth_headers) and an
        API key. The preferred source of the API key is the instance api_key
        (typically loaded from app_settings), with environment variables used
        only as a fallback.
        """
        api_key = ""
        # Prefer a value stored in app_settings under key "veo_sandbox_api_key"
        try:
            db = SessionLocal()
            try:
                setting = db.query(AppSetting).filter(AppSetting.key == "veo_sandbox_api_key").first()
                if setting and setting.value:
                    raw = setting.value
                    if isinstance(raw, dict):
                        value = raw.get("api_key")
                        if isinstance(value, str):
                            api_key = value.strip()
                        elif value is not None:
                            api_key = str(value).strip()
                        else:
                            api_key = json.dumps(raw)
                    elif isinstance(raw, str):
                        try:
                            loaded = json.loads(raw)
                            if isinstance(loaded, dict) and "api_key" in loaded:
                                value = loaded.get("api_key")
                                if isinstance(value, str):
                                    api_key = value.strip()
                                elif value is not None:
                                    api_key = str(value).strip()
                                else:
                                    api_key = raw.strip()
                            elif isinstance(loaded, str):
                                api_key = loaded.strip()
                            else:
                                api_key = raw.strip()
                        except Exception:
                            api_key = raw.strip()
                    else:
                        api_key = str(raw).strip()
            finally:
                db.close()
        except Exception:
            # Ignore DB errors here; fall back to env/instance values.
            pass

        if not api_key:
            api_key = os.getenv("GOOGLE_VEO_SANDBOX_API_KEY") or os.getenv("GOOGLE_API_KEY") or self.api_key

        if not api_key:
            raise RuntimeError("Veo sandbox API key is not configured in settings or environment")

        url = "https://aisandbox-pa.googleapis.com/v1/credits"
        headers = self._veo_auth_headers()
        # Align headers with the working browser/curl pattern as closely as is
        # reasonable from the backend.
        headers.update(
            {
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.9",
                "Origin": "https://labs.google",
                "Referer": "https://labs.google/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
            }
        )

        try:
            resp = requests.get(url, headers=headers, params={"key": api_key}, timeout=30)
            if resp.status_code >= 400:
                logger.error(
                    "Veo credits API error %s: %s", resp.status_code, resp.text[:500]
                )
                resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.error(f"Failed to fetch Veo credits: {e}")
            raise

        credits = data.get("credits")
        tier = data.get("userPaygateTier")
        return {
            "credits": int(credits) if isinstance(credits, (int, float)) else 0,
            "userPaygateTier": str(tier) if tier is not None else "",
        }
