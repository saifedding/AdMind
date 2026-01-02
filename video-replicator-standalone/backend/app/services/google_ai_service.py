"""
Google AI Service for Video Replicator
Handles video analysis and prompt generation using Gemini
COMPLETE VERSION with all detailed instructions from original system
"""
import os
import json
import logging
import tempfile
import subprocess
import shutil
import time
import uuid
import re
import hashlib
import random
import string
from pathlib import Path
from typing import Dict, Any, Optional, List
import requests
import google.generativeai as genai

logger = logging.getLogger(__name__)

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"


class GoogleAIService:
    """Service for interacting with Google's Gemini AI for video analysis."""
    
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is required")
        genai.configure(api_key=self.api_key)
    
    def _auth_params(self) -> Dict[str, str]:
        """Get authentication parameters for API calls."""
        return {"key": self.api_key}
    
    def _download_video(self, url: str) -> Optional[str]:
        """Download video from URL using yt-dlp or direct HTTP."""
        try:
            temp_dir = tempfile.mkdtemp()
            output_path = os.path.join(temp_dir, "video.mp4")
            
            # Try yt-dlp first (works for most platforms)
            try:
                cmd = [
                    "yt-dlp",
                    "-f", "best[ext=mp4]/best",
                    "-o", output_path,
                    "--no-playlist",
                    "--socket-timeout", "30",
                    url
                ]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
                if result.returncode == 0 and os.path.exists(output_path):
                    logger.info(f"Downloaded video with yt-dlp: {output_path}")
                    return output_path
            except (subprocess.TimeoutExpired, FileNotFoundError) as e:
                logger.warning(f"yt-dlp failed: {e}")
            
            # Fallback to direct HTTP download
            response = requests.get(url, stream=True, timeout=60, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            if response.status_code == 200:
                with open(output_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    logger.info(f"Downloaded video with HTTP: {output_path}")
                    return output_path
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to download video: {e}")
            return None
    
    def _cleanup_file(self, file_path: str):
        """Clean up temporary file and its directory."""
        try:
            if file_path and os.path.exists(file_path):
                parent_dir = os.path.dirname(file_path)
                os.remove(file_path)
                if parent_dir and os.path.exists(parent_dir):
                    shutil.rmtree(parent_dir, ignore_errors=True)
        except Exception as e:
            logger.warning(f"Failed to cleanup file: {e}")
    
    def _clean_json_response(self, text: str) -> str:
        """Clean up JSON response from AI and extract valid JSON."""
        import re
        
        text = text.strip()
        
        # Remove markdown code blocks
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        
        # Try to find the first complete JSON object
        # Look for the outermost { } pair
        brace_count = 0
        start_idx = -1
        end_idx = -1
        
        for i, char in enumerate(text):
            if char == '{':
                if brace_count == 0:
                    start_idx = i
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0 and start_idx != -1:
                    end_idx = i + 1
                    break
        
        if start_idx != -1 and end_idx != -1:
            text = text[start_idx:end_idx]
        
        return text.strip()

    def _get_scene_count_instruction(self, target_scene_count: Optional[int], merge_short_scenes: bool) -> str:
        """Generate scene count instruction based on settings."""
        if target_scene_count == 1:
            return """
## 🎯 SINGLE SCENE MODE (ULTRA-DETAILED)
**YOU MUST ANALYZE THE ENTIRE VIDEO AS ONE SINGLE SCENE.**

Since the user wants 1 prompt for the entire video, you need to:
1. Analyze the FULL video duration as ONE comprehensive scene
2. Describe EVERY movement, gesture, expression change that happens throughout
3. Include a detailed SEQUENCE DESCRIPTION of what happens from start to finish
4. Capture ALL visual details needed to replicate the entire video in one prompt

**CRITICAL: Create exactly 1 scene in scene_breakdown that covers the ENTIRE video duration.**

The scene should include:
- **Full movement sequence**: What happens at second 0, 2, 4, 6, 8, etc.
- **Expression progression**: How facial expressions change throughout
- **Gesture timeline**: All hand/body movements in order
- **Action flow**: Complete description of the action from start to finish
- **Dialogue timing**: When each part of the dialogue is spoken"""
        elif target_scene_count and target_scene_count > 1:
            return f"""
## 🎯 MULTI-SCENE MODE ({target_scene_count} SCENES)
**Split the video into exactly {target_scene_count} scenes.**

Guidelines for {target_scene_count} scenes:
- Divide the video duration evenly into {target_scene_count} parts
- Each scene should be approximately equal duration
- Only split at natural transition points if possible
- Each scene must have complete details for replication

**CRITICAL: Create exactly {target_scene_count} scenes in scene_breakdown.**"""
        else:
            if merge_short_scenes:
                return """
## 🎯 AUTO SCENE DETECTION MODE (WITH SMART MERGING)
**Intelligently analyze the video and decide the OPTIMAL number of scenes.**

### 🚨 CRITICAL: MERGE SHORT SCENES TO MAXIMIZE 8-SECOND LIMIT
VEO can generate up to 8 seconds per prompt. You MUST merge consecutive short scenes when possible!

**MERGING RULES:**
- If Scene A is 4 seconds and Scene B is 3 seconds → MERGE into ONE 7-second scene
- If Scene A is 3 seconds, Scene B is 2 seconds, Scene C is 3 seconds → MERGE into ONE 8-second scene
- ONLY create separate scenes when they CANNOT fit within 8 seconds together
- When merging, combine ALL details from both scenes into one comprehensive description

**WHEN TO MERGE SCENES:**
✅ Same visual style and production quality
✅ Similar camera setup (both close-ups, both same angle)
✅ Combined duration ≤ 8 seconds
✅ Both scenes are part of a series
✅ Transition between them is a simple cut

**WHEN NOT TO MERGE:**
❌ Combined duration would exceed 8 seconds
❌ Completely different visual styles
❌ Major location change
❌ Different aspect ratios or camera setups

**GOAL: Minimize the number of scenes/prompts needed while keeping each under 8 seconds.**"""
            else:
                return """
## 🎯 AUTO SCENE DETECTION MODE (INTELLIGENT)
**Intelligently analyze the video and detect NATURAL scene changes.**

**SCENE DETECTION RULES:**
- Create a NEW scene when there's a real visual change
- Each scene should be MAX 8 seconds (VEO limit)
- If continuous action is longer than 8 seconds, split at natural points
- Be smart about what constitutes a "scene change"

**WHEN TO CREATE A NEW SCENE:**
✅ Camera cut or significant angle change
✅ Different character/subject becomes focus
✅ Location/background changes significantly
✅ Major action transition
✅ Scene would exceed 8 seconds

**WHEN TO KEEP IN SAME SCENE:**
✅ Same character doing continuous action
✅ Same environment and camera setup
✅ Duration ≤ 8 seconds

**GOAL: Intelligent scene detection based on actual visual changes.**"""

    def _get_analysis_system_instruction(self, scene_count_instruction: str, merge_short_scenes: bool) -> str:
        """Get the comprehensive system instruction for video analysis."""
        merge_instruction = ""
        if merge_short_scenes:
            merge_instruction = """
## 🔀 MERGING SHORT SCENES (CRITICAL FOR EFFICIENCY!)
If you have multiple short scenes (2-4 seconds each) with SIMILAR STYLE, MERGE THEM into one longer scene!

**HOW TO DESCRIBE A MERGED SCENE:**
In subject_description.physical_appearance, use:
"FIRST (0:00-0:04): [Description of first part]. SECOND (0:04-0:07): [Description of second part]."

In audio.dialogue, use:
"FIRST (0:00-0:04): '[Dialogue 1]' SECOND (0:04-0:07): '[Dialogue 2]'"

In recreation_notes, explain:
"This is a MERGED scene with TWO parts appearing in sequence. FIRST X SECONDS: [details]. CUT at X:XX. SECOND Y SECONDS: [details]."
"""

        return f"""You are an expert video analyst specializing in extracting REUSABLE STYLE TEMPLATES with DEEP SCENE-BY-SCENE ANALYSIS.

## 🎯 YOUR MISSION
Analyze this video to create a COMPREHENSIVE STYLE PROFILE with DETAILED SCENE BREAKDOWN.
The goal is to enable EXACT REPLICATION of each scene with different content.

{scene_count_instruction}
{merge_instruction}

⚠️ CRITICAL REQUIREMENTS:
1. Analyze with timestamps, camera positions, movements, and visual details
2. Be DYNAMIC - adapt your analysis to the actual content type
3. Do NOT generate prompts - focus ONLY on detailed analysis for reuse
4. Include SEQUENCE DESCRIPTIONS for longer scenes (what happens over time)

## 🔍 STEP 1: IDENTIFY VIDEO TYPE (REQUIRED FIRST)

Determine the PRIMARY content type:
- **live_action_talking_head**: Real person speaking to camera
- **live_action_cinematic**: Real footage with cinematic style
- **live_action_product**: Real product demonstration/showcase
- **3d_animation**: 3D rendered characters/scenes
- **2d_animation**: 2D animated content
- **motion_graphics**: Text animations, infographics, abstract visuals
- **screen_recording**: Software demos, tutorials
- **mixed_media**: Combination of multiple types

## 📝 STEP 2: TRANSCRIPT WITH TIMESTAMPS

- Transcribe EVERY SINGLE WORD with timestamps
- Format: [0:00-0:03] "Exact words spoken"
- Note pauses, emphasis, and tone changes
- Capture text overlays with their timing

## 🎬 STEP 3: INTELLIGENT SCENE DETECTION & ANALYSIS (MOST IMPORTANT!)

For EACH distinct scene in the video, provide ALL of these nested objects:

### Scene Identification:
- **scene_number**: Sequential number
- **timestamp_start**: When scene begins (e.g., "0:00")
- **timestamp_end**: When scene ends (e.g., "0:08")
- **duration_seconds**: Length in seconds (aim for 5-8 seconds when possible)
- **scene_type**: hook/intro/main_content/transition/cta/outro

### subject_description (REQUIRED - ALL FIELDS):
- **type**: person/animated_character/object/product/mascot/etc
- **what_is_it**: Detailed description of the subject
- **design_style**: For animated: Pixar/anime/cartoon/realistic
- **physical_appearance**: Age, gender, ethnicity, hair, face, body (for people) OR shape, texture, material (for objects)
- **distinctive_features**: Unique identifying features
- **colors**: Main colors of the subject
- **expression**: Current emotional expression
- **pose_action**: What they're doing, body position
- **energy_level**: Calm/moderate/energetic/intense
- **voice_character**: Voice tone and style if speaking

### visual_composition (REQUIRED - ALL FIELDS):
- **shot_type**: extreme_close_up/close_up/medium_close_up/medium/medium_wide/wide/extreme_wide
- **camera_angle**: eye_level/low_angle/high_angle/dutch_angle/birds_eye/worms_eye
- **camera_position**: front/side/three_quarter/profile/over_shoulder/behind
- **camera_movement**: static/pan_left/pan_right/tilt_up/tilt_down/zoom_in/zoom_out/dolly/tracking/handheld
- **framing**: centered/rule_of_thirds_left/rule_of_thirds_right/headroom/leadroom

### subject_in_frame (REQUIRED - ALL FIELDS):
- **position_in_frame**: center/left_third/right_third/top/bottom/full_frame
- **size_percentage**: percentage of frame occupied (e.g., "60%")
- **action**: What is the subject doing throughout this scene?
- **gesture**: Specific hand/body movements throughout the scene
- **facial_expression**: Emotion and intensity changes during the scene
- **eye_direction**: camera/left/right/up/down and any changes

### background (REQUIRED - ALL FIELDS):
- **description**: What's visible behind subject
- **blur_level**: none/slight/medium/heavy (bokeh level)
- **visible_elements**: Array of items in frame ["item1", "item2"]
- **lighting**: How this specific scene is lit
- **environment_style**: Photorealistic/stylized/abstract/minimal

### motion_dynamics (REQUIRED - ALL FIELDS):
- **movement_speed**: static/slow/medium/fast
- **transition_in**: How scene starts (cut/fade/wipe/zoom/morph)
- **transition_out**: How scene ends
- **energy_level**: calm/moderate/energetic/intense

### text_graphics (REQUIRED - ALL FIELDS):
- **text_overlay**: Any text shown (or "None")
- **text_position**: Where text appears (or "N/A")
- **text_animation**: How text animates (or "N/A")
- **graphics**: Icons, shapes, effects (or "None")

### audio (REQUIRED - ALL FIELDS):
- **dialogue**: Exact words spoken in this scene
- **music_mood**: Background music feel (or "None")
- **sound_effects**: Any SFX used (or "None")

### recreation_notes (REQUIRED):
Detailed notes on how to recreate this exact scene with different content - describe camera setup, subject positioning, lighting, and mood so someone can replicate this scene with different dialogue.

## OUTPUT FORMAT (JSON)

Return ONLY valid JSON with this structure:
{{
  "video_type": {{
    "primary_type": "3d_animation/2d_animation/live_action_talking_head/motion_graphics/etc",
    "sub_type": "Pixar style/anime/flat design/etc",
    "description": "Brief description of what this video is"
  }},
  "transcript": "Full word-for-word transcript",
  "style_analysis": {{
    "visual_style": "Comprehensive visual style description",
    "production_quality": "high-end/mid-tier/casual",
    "color_palette": "All colors used",
    "color_mood": "Warm/cool/vibrant/muted",
    "lighting": "Lighting style",
    "camera_work": "Shot types and movements",
    "pacing": "Editing pacing",
    "mood": "Overall emotional tone",
    "character_description": "Character description",
    "environment_description": "Environment description"
  }},
  "content_analysis": {{
    "hook_type": "How it grabs attention",
    "structure": "Content organization",
    "target_audience": "Who this is for"
  }},
  "scene_breakdown": [
    {{
      "scene_number": 1,
      "timestamp_start": "0:00",
      "timestamp_end": "0:08",
      "duration_seconds": 8,
      "scene_type": "hook",
      "subject_description": {{ "type": "...", "what_is_it": "...", "design_style": "...", "physical_appearance": "...", "distinctive_features": "...", "colors": "...", "expression": "...", "pose_action": "...", "energy_level": "...", "voice_character": "..." }},
      "visual_composition": {{ "shot_type": "...", "camera_angle": "...", "camera_position": "...", "camera_movement": "...", "framing": "..." }},
      "subject_in_frame": {{ "position_in_frame": "...", "size_percentage": "...", "action": "...", "gesture": "...", "facial_expression": "...", "eye_direction": "..." }},
      "background": {{ "description": "...", "blur_level": "...", "visible_elements": ["..."], "lighting": "...", "environment_style": "..." }},
      "motion_dynamics": {{ "movement_speed": "...", "transition_in": "...", "transition_out": "...", "energy_level": "..." }},
      "text_graphics": {{ "text_overlay": "...", "text_position": "...", "text_animation": "...", "graphics": "..." }},
      "audio": {{ "dialogue": "...", "music_mood": "...", "sound_effects": "..." }},
      "recreation_notes": "Detailed instructions..."
    }}
  ]
}}

## 🚨 CRITICAL: FILL IN ALL FIELDS!
- DO NOT leave fields empty or null
- Every scene must have ALL nested objects filled
- Include recreation_notes for each scene
- Be EXTREMELY detailed - the goal is EXACT REPLICATION"""

    def analyze_video_url_comprehensive(
        self,
        video_url: str,
        model: str = "gemini-2.5-flash",
        extract_transcript: bool = True,
        analyze_style: bool = True,
        target_scene_count: Optional[int] = None,
        merge_short_scenes: bool = True,
        skip_scene_breakdown: bool = False
    ) -> Dict[str, Any]:
        """
        Comprehensively analyze a video URL.
        Returns video type, transcript, style analysis, and scene breakdown.
        """
        file_path = None
        uploaded_file = None
        
        try:
            # Download video
            logger.info(f"Downloading video from: {video_url}")
            file_path = self._download_video(video_url)
            
            if not file_path:
                return {"success": False, "error": "Failed to download video"}
            
            # Upload to Gemini
            logger.info("Uploading video to Gemini...")
            uploaded_file = genai.upload_file(file_path, mime_type="video/mp4")
            
            # Wait for processing
            while uploaded_file.state.name == "PROCESSING":
                time.sleep(2)
                uploaded_file = genai.get_file(uploaded_file.name)
            
            if uploaded_file.state.name != "ACTIVE":
                return {"success": False, "error": f"Video processing failed: {uploaded_file.state.name}"}
            
            # Build system instruction
            scene_instruction = self._get_scene_count_instruction(target_scene_count, merge_short_scenes)
            system_instruction = self._get_analysis_system_instruction(scene_instruction, merge_short_scenes)
            
            # Create model and analyze
            gemini_model = genai.GenerativeModel(
                model_name=model,
                system_instruction=system_instruction
            )
            
            # Build user prompt based on whether scene breakdown is needed
            if skip_scene_breakdown:
                # Lightweight prompt for Script-to-Video (style reference only)
                user_prompt = """Analyze this video to extract style information for creative inspiration.

Focus on:
1. **video_type**: Identify the primary type, sub-type, and description
2. **transcript**: Extract all spoken dialogue with timestamps
3. **style_analysis**: Detailed style information including:
   - visual_style
   - color_palette
   - lighting
   - camera_work
   - pacing
   - mood
   - character_description (if applicable)
   - environment_description

**DO NOT include scene_breakdown** - we only need the overall style information.

Return valid JSON with these fields only."""
            else:
                # Full detailed prompt for Video Replicator (exact replication)
                user_prompt = """Analyze this video to create a REUSABLE STYLE TEMPLATE with INTELLIGENT SCENE DETECTION.

## 🧠 SMART SCENE DETECTION (CRITICAL!):
**BE INTELLIGENT about scene detection! Don't artificially split continuous action.**

**ONLY create separate scenes when there are REAL changes:**
- Camera cut or significant angle change
- Different character/subject becomes focus
- Location/background changes significantly  
- Major action transition

**DO NOT split if it's the same character in same location doing continuous action!**

**AIM FOR 5-8 SECOND SCENES** (VEO's optimal length) unless there are real scene changes.

## 🚨 CRITICAL: FILL IN ALL FIELDS IN scene_breakdown!
Every scene must have ALL nested objects with ALL their fields filled:
1. subject_description with ALL fields
2. visual_composition with ALL fields
3. subject_in_frame with ALL fields
4. background with ALL fields
5. motion_dynamics with ALL fields
6. text_graphics with ALL fields
7. audio with ALL fields
8. recreation_notes

Be obsessively detailed. Adapt your analysis to what's actually in the video.
Return valid JSON."""

            response = gemini_model.generate_content(
                [uploaded_file, user_prompt],
                generation_config=genai.GenerationConfig(
                    temperature=0.2,
                    max_output_tokens=32768  # Increased for detailed analysis
                )
            )
            
            # Parse response
            response_text = self._clean_json_response(response.text)
            analysis = json.loads(response_text)
            
            return {
                "success": True,
                "analysis": analysis
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            return {"success": False, "error": f"Failed to parse AI response: {e}"}
        except Exception as e:
            logger.error(f"Video analysis failed: {e}")
            return {"success": False, "error": str(e)}
        finally:
            # Cleanup
            if file_path:
                self._cleanup_file(file_path)
            if uploaded_file:
                try:
                    genai.delete_file(uploaded_file.name)
                except:
                    pass

    def generate_single_scene_prompt(
        self,
        scene_analysis: Dict[str, Any],
        dialogue: str,
        video_style: Optional[Dict[str, Any]] = None,
        video_type: Optional[Dict[str, Any]] = None,
        model: str = "gemini-2.5-flash",
        aspect_ratio: str = "VIDEO_ASPECT_RATIO_PORTRAIT",
        include_music: bool = True,
        include_text_overlays: bool = True,
        include_sound_effects: bool = True,
        prompt_detail_level: str = "detailed",
        max_duration_seconds: int = 8
    ) -> Dict[str, Any]:
        """
        Generate an ULTRA-DETAILED VEO prompt for a single scene.
        Creates comprehensive prompts for PERFECT REPLICATION.
        """
        ratio_map = {
            "VIDEO_ASPECT_RATIO_PORTRAIT": "9:16 vertical (portrait)",
            "VIDEO_ASPECT_RATIO_LANDSCAPE": "16:9 horizontal (landscape)",
            "VIDEO_ASPECT_RATIO_SQUARE": "1:1 square"
        }
        aspect_desc = ratio_map.get(aspect_ratio, "9:16 vertical")
        
        # Extract ALL scene details
        subject_desc = scene_analysis.get("subject_description", {})
        visual_comp = scene_analysis.get("visual_composition", {})
        subject_frame = scene_analysis.get("subject_in_frame", {})
        background = scene_analysis.get("background", {})
        motion = scene_analysis.get("motion_dynamics", {})
        text_gfx = scene_analysis.get("text_graphics", {})
        audio = scene_analysis.get("audio", {})
        recreation_notes = scene_analysis.get("recreation_notes", "")
        
        # ENFORCE DURATION LIMIT
        duration = min(scene_analysis.get("duration_seconds", max_duration_seconds), max_duration_seconds)
        
        # Build video context
        video_context = ""
        if video_type:
            video_context = f"""
## VIDEO TYPE (CRITICAL - Match this style EXACTLY):
- **Primary Type**: {video_type.get('primary_type', 'unknown')}
- **Sub Type**: {video_type.get('sub_type', 'N/A')}
- **Description**: {video_type.get('description', 'N/A')}"""
        
        # Build style context
        style_context = ""
        if video_style:
            style_context = f"""
## VISUAL STYLE (CRITICAL - Replicate EXACTLY):
- **Visual Style**: {video_style.get('visual_style', 'N/A')}
- **Production Quality**: {video_style.get('production_quality', 'N/A')}
- **Animation Style**: {video_style.get('animation_style', 'N/A')}
- **Color Palette**: {video_style.get('color_palette', 'N/A')}
- **Lighting**: {video_style.get('lighting', 'N/A')}
- **Camera Work**: {video_style.get('camera_work', 'N/A')}
- **Mood**: {video_style.get('mood', 'N/A')}"""

        # Type-specific instructions
        primary_type = video_type.get('primary_type', '').lower() if video_type else ''
        type_specific = ""
        if '3d' in primary_type or 'animation' in primary_type:
            type_specific = """
## 3D ANIMATION SPECIFIC:
- Specify exact render style (Pixar photorealistic, stylized, low-poly, etc.)
- Describe surface materials (shiny plastic, matte rubber, translucent glass, etc.)
- Include texture descriptions (smooth, bumpy, fabric, metal, organic)
- Describe 3D lighting (rim light, key light position, ambient occlusion)
- Specify animation style (snappy cartoon, smooth realistic, squash-and-stretch)"""
        elif '2d' in primary_type or 'anime' in primary_type:
            type_specific = """
## 2D ANIMATION SPECIFIC:
- Specify exact 2D style (anime, western cartoon, flat design, hand-drawn)
- Describe line work (thick black lines, no outlines, colored lines)
- Specify coloring (cel-shaded, gradient shading, flat colors, watercolor)
- Describe animation technique (frame-by-frame, tweened, limited animation)"""
        elif 'live' in primary_type or 'talking' in primary_type:
            type_specific = """
## LIVE ACTION SPECIFIC:
- Detailed physical appearance (age, gender, ethnicity, hair, facial features)
- Complete wardrobe description (colors, textures, fit, accessories)
- Real-world setting description (indoor/outdoor, lighting conditions, props)
- Camera feel (DSLR, smartphone, professional, handheld, tripod)"""

        # Audio instructions
        audio_instructions = ""
        if include_music:
            music_mood = audio.get('music_mood', 'None')
            audio_instructions += f"\n- **Background Music**: {music_mood if music_mood and music_mood.lower() != 'none' else 'Subtle background music matching scene mood'}"
        else:
            audio_instructions += "\n- **Background Music**: No background music"
        
        if include_sound_effects:
            sound_fx = audio.get('sound_effects', 'None')
            audio_instructions += f"\n- **Sound Effects**: {sound_fx if sound_fx and sound_fx.lower() != 'none' else 'Appropriate sound effects'}"
        else:
            audio_instructions += "\n- **Sound Effects**: No sound effects"
        
        # Text instructions
        if include_text_overlays:
            text_overlay = text_gfx.get('text_overlay', 'None')
            text_instructions = f"""
## TEXT & GRAPHICS:
- **Text Overlay**: "{text_overlay}"
- **Text Position**: {text_gfx.get('text_position', 'N/A')}
- **Text Animation**: {text_gfx.get('text_animation', 'N/A')}"""
        else:
            text_instructions = """
## 🚫 STRICTLY NO TEXT ON VIDEO:
- **ABSOLUTELY NO text overlays of any kind**
- **NO titles, subtitles, captions, or labels**
- **NO floating text, animated text, or kinetic typography**
- **Dialogue is SPOKEN ONLY - never displayed as text**"""

        # Detail level instructions
        if prompt_detail_level == "ultra_detailed":
            detail_instructions = """
## ULTRA-DETAILED REQUIREMENTS (1200-2000 WORDS MINIMUM):
Generate EXTREMELY COMPREHENSIVE prompts with EXHAUSTIVE detail:

### MANDATORY SECTIONS (ALL REQUIRED):
1. **COMPLETE VISUAL DESCRIPTION** (300+ words):
   - Every single color, shade, tint, and hue visible
   - All textures: smooth, rough, glossy, matte, fabric weave, skin texture
   - Material properties: metal shine, plastic reflection, wood grain, glass transparency
   - Surface qualities: wet, dry, dusty, clean, worn, new
   - Lighting reflections and how they interact with each surface

2. **EXHAUSTIVE LIGHTING SETUP** (200+ words):
   - Primary light source: position, intensity, color temperature (warm/cool)
   - Secondary lights: fill lights, rim lights, background lights
   - Shadow placement: hard shadows, soft shadows, direction, intensity
   - Ambient lighting: overall brightness, mood lighting
   - Light quality: harsh, soft, diffused, direct
   - Color grading: overall color tone, saturation, contrast

3. **PRECISE CAMERA SPECIFICATIONS** (200+ words):
   - Exact shot type: extreme close-up, close-up, medium, wide, etc.
   - Camera angle: eye level, low angle, high angle, dutch angle
   - Camera position: front, side, three-quarter, profile, over shoulder
   - Camera movement: static, pan, tilt, zoom, dolly, tracking, handheld
   - Lens characteristics: focal length, depth of field, bokeh quality
   - Framing: rule of thirds, centered, headroom, leadroom

4. **DETAILED CHARACTER/SUBJECT DESCRIPTION** (300+ words):
   - Physical appearance: age, gender, ethnicity, height, build
   - Facial features: eyes, nose, mouth, jawline, cheekbones, skin tone
   - Hair: color, style, length, texture, movement
   - Clothing: every garment, colors, patterns, fit, fabric, accessories
   - Expression: micro-expressions, emotion intensity, eye contact
   - Posture: body position, stance, gesture, hand placement
   - Energy level: calm, animated, intense, relaxed

5. **COMPREHENSIVE ACTION SEQUENCE** (300+ words):
   - Second-by-second breakdown of ALL movements
   - Facial expression changes with precise timing
   - Hand gestures: start, peak, end positions
   - Body language shifts throughout the scene
   - Eye movements: where they look, when they blink
   - Mouth movements: speech synchronization, pauses
   - Breathing patterns: chest movement, rhythm

6. **ENVIRONMENT & BACKGROUND DETAILS** (200+ words):
   - Complete background description: walls, furniture, props
   - Spatial relationships: what's left, right, behind, in front
   - Atmospheric elements: dust particles, steam, fog, clarity
   - Background activity: movement, life, static elements
   - Depth layers: foreground, midground, background elements
   - Environmental mood: cozy, sterile, busy, calm

7. **PRECISE TIMING BREAKDOWN** (100+ words):
   - Exact timing for every action, expression, word
   - Synchronization between dialogue and movement
   - Pause durations, breath timing, gesture timing
   - Transition timing between expressions/actions"""
        elif prompt_detail_level == "detailed":
            detail_instructions = """
## DETAILED REQUIREMENTS (800-1200 WORDS):
Generate COMPREHENSIVE prompts with thorough detail:
- Complete visual description with colors, textures, materials
- Detailed lighting setup with multiple light sources
- Precise camera specifications and movement
- Full character/subject description with clothing and expression
- Action sequence with timing breakdown
- Environment details with background elements
- Mood, atmosphere, and energy level descriptions"""
        else:
            detail_instructions = """
## BASIC REQUIREMENTS (500-800 WORDS):
Include essential visual elements with good detail:
- Character/subject description with main features and clothing
- Camera setup, lighting, and basic composition
- Key actions, movements, and expressions
- Dialogue timing and delivery
- Background and environment basics"""

        system_instruction = f"""You are a MASTER VEO prompt engineer specializing in ULTRA-DETAILED VIDEO REPLICATION.

Your task: Create EXTREMELY COMPREHENSIVE VEO prompts that will generate videos IDENTICAL in style to the reference, but with new dialogue.

## 🚨 CRITICAL CONSTRAINTS:
1. **MAX {max_duration_seconds} SECONDS** - The video MUST be {duration} seconds or less
2. **EXACT STYLE MATCH** - Every visual detail must match the reference video's style
3. **EXACT DIALOGUE** - Use the user's dialogue word-for-word in quotes
4. **ULTRA-COMPREHENSIVE DETAIL** - Include ALL visual information needed for perfect replication
5. **CONTINUOUS ACTION** - Describe the FULL SEQUENCE of actions, movements, and expressions
6. **MINIMUM 1200 WORDS** - Each prompt must be extremely detailed and comprehensive

{video_context}
{style_context}
{type_specific}
{detail_instructions}

## MANDATORY PROMPT STRUCTURE (Follow this EXACTLY):

### 1. OPENING STATEMENT (Shot & Format):
Start with: "[SHOT TYPE], [CAMERA ANGLE], [CAMERA POSITION]. {aspect_desc} format."

### 2. SUBJECT/CHARACTER (ULTRA-DETAILED - 300+ WORDS):
**PHYSICAL FORM & IDENTITY:**
- **Type & Classification**: Exact type (human, animated character, object, etc.)
- **Design Philosophy**: Overall aesthetic approach and style
- **Dimensional Properties**: Height, width, proportions, scale relationships
- **Surface Materials**: Primary and secondary materials with specific properties
- **Color Palette**: Primary colors, secondary colors, accent colors with hex codes if possible
- **Texture Mapping**: Surface textures, roughness, smoothness, patterns
- **Distinctive Identifiers**: Unique features that make this subject recognizable
- **Current State**: Emotional state, physical condition, energy level
- **Pose Architecture**: Body position, limb placement, weight distribution
- **Micro-Details**: Small but important visual elements, imperfections, wear patterns

**FOR HUMAN SUBJECTS - COMPLETE PHYSICAL DESCRIPTION:**
- **Age & Demographics**: Apparent age, gender, ethnicity, cultural markers
- **Facial Architecture**: Bone structure, facial proportions, symmetry
- **Eyes**: Color, shape, size, expression, eyelashes, eyebrows, gaze direction
- **Nose**: Shape, size, nostril visibility, bridge characteristics
- **Mouth**: Lip shape, color, expression, teeth visibility, smile characteristics
- **Hair**: Color, style, length, texture, movement, styling products visible
- **Skin**: Tone, texture, blemishes, makeup, lighting interaction
- **Body Type**: Build, posture, muscle definition, clothing fit

**WARDROBE & STYLING (COMPLETE INVENTORY):**
- **Upper Body**: Every garment layer, colors, patterns, fit, fabric type
- **Lower Body**: Pants/skirt/dress details, length, style, material
- **Footwear**: Shoes, socks, visibility, style, condition
- **Accessories**: Jewelry, watches, glasses, hats, bags - every visible item
- **Fabric Properties**: How clothing moves, wrinkles, reflects light
- **Color Coordination**: How all elements work together visually

### 3. FRAMING & COMPOSITION (PRECISE SPECIFICATIONS - 150+ WORDS):
- **Subject Positioning**: Exact placement within frame (percentage from edges)
- **Size Relationship**: Percentage of frame occupied by subject
- **Visible Body Parts**: What parts are in frame, what's cropped out
- **Framing Rules**: Rule of thirds, golden ratio, centered, off-center
- **Headroom**: Space above subject's head
- **Leadroom**: Space in direction subject is facing/moving
- **Edge Relationships**: How subject relates to frame boundaries
- **Depth Layers**: Foreground, midground, background element placement

### 4. BACKGROUND & ENVIRONMENT (COMPREHENSIVE - 200+ WORDS):
**SPATIAL ARCHITECTURE:**
- **Location Type**: Indoor/outdoor, specific environment classification
- **Architectural Elements**: Walls, ceiling, floor, structural components
- **Spatial Dimensions**: Room size, ceiling height, depth perception
- **Layout & Flow**: How space is organized, traffic patterns

**ENVIRONMENTAL INVENTORY:**
- **Left Side Elements**: Every object, furniture piece, decoration visible on left
- **Center Background**: What's directly behind subject, middle distance
- **Right Side Elements**: All items visible on right side of frame
- **Foreground Objects**: Items between camera and subject
- **Background Depth**: What's visible in far background, horizon line

**ATMOSPHERIC CONDITIONS:**
- **Air Quality**: Clear, hazy, dusty, steamy, particle visibility
- **Environmental Mood**: Cozy, sterile, busy, calm, energetic
- **Lighting Interaction**: How environment affects and reflects light
- **Color Temperature**: Warm, cool, neutral environmental tones

### 5. LIGHTING & COLOR (TECHNICAL SPECIFICATIONS - 200+ WORDS):
**PRIMARY LIGHTING SYSTEM:**
- **Key Light**: Position (clock position), intensity (percentage), color temperature (Kelvin)
- **Fill Light**: Secondary light source, intensity relative to key light
- **Rim/Back Light**: Edge lighting, separation from background
- **Ambient Light**: Overall environmental illumination level

**SHADOW ARCHITECTURE:**
- **Shadow Direction**: Where shadows fall, angle, length
- **Shadow Quality**: Hard, soft, diffused, sharp edges
- **Shadow Density**: How dark, transparency level
- **Multiple Shadow Sources**: Overlapping shadows from multiple lights

**COLOR GRADING SPECIFICATIONS:**
- **Overall Tone**: Warm, cool, neutral, specific color cast
- **Saturation Level**: Vibrant, muted, natural, enhanced
- **Contrast Ratio**: High contrast, low contrast, specific levels
- **Highlight Treatment**: How bright areas are handled
- **Shadow Detail**: Information retained in dark areas
- **Color Harmony**: How all colors work together in the scene

### 6. MOTION & DYNAMICS (SECOND-BY-SECOND - 300+ WORDS):
**CAMERA BEHAVIOR:**
- **Movement Type**: Static, pan, tilt, zoom, dolly, tracking, handheld
- **Movement Speed**: Slow, medium, fast, variable speed
- **Movement Quality**: Smooth, jerky, organic, mechanical
- **Start/End Positions**: Where camera begins and ends

**SUBJECT MOVEMENT CHOREOGRAPHY:**
Provide EXACT timing for EVERY second of the {duration}-second duration:

**SECONDS 0.0 - 1.0:**
- **Facial Expression**: Starting expression, micro-changes
- **Eye Movement**: Where looking, blink timing, focus shifts
- **Mouth Position**: Lip position, speech preparation, expression
- **Head Position**: Angle, tilt, rotation, stability
- **Body Posture**: Shoulder position, chest orientation, weight distribution
- **Hand Placement**: Left hand position, right hand position, finger placement
- **Gesture Initiation**: Any movement beginning, direction, speed
- **Dialogue Timing**: Exact words spoken, syllable timing

**SECONDS 1.0 - 2.0:**
[Continue with same level of detail for each second...]

**CONTINUE FOR FULL DURATION** - Every second must be accounted for with specific actions, expressions, and movements.

### 7. DIALOGUE INTEGRATION (EXACT SYNCHRONIZATION):
**SPEECH CONTENT:**
Include the dialogue in quotes: "{dialogue}"

**VOCAL DELIVERY SPECIFICATIONS:**
- **Pace**: Words per minute, rhythm, tempo changes
- **Emphasis**: Which words are stressed, volume changes
- **Emotional Tone**: Confidence, excitement, calm, intensity level
- **Articulation**: Clear, mumbled, precise, casual
- **Breath Patterns**: Where natural breaths occur, pause timing

**LIP SYNC REQUIREMENTS:**
- **Phoneme Accuracy**: Mouth shapes for specific sounds
- **Timing Precision**: Exact synchronization with audio
- **Natural Flow**: Realistic speech movement, not robotic

### 8. AUDIO ELEMENTS:
{audio_instructions}

{text_instructions}

### 9. TECHNICAL SPECIFICATIONS:
**Duration**: {duration} seconds (MAXIMUM {max_duration_seconds} seconds)
**Resolution**: 4K (3840×2160) or match source
**Frame Rate**: 30fps for smooth motion
**Aspect Ratio**: {aspect_desc}

### 10. QUALITY ASSURANCE CHECKLIST:
- ✅ Every visual element described in detail
- ✅ Complete timing breakdown for full duration
- ✅ Exact dialogue integration with timing
- ✅ Comprehensive lighting and color specifications
- ✅ Detailed character/subject description
- ✅ Complete environment and background inventory
- ✅ Precise camera and framing specifications
- ✅ Natural, realistic movement and expression
- ✅ Minimum 1200 words of detailed description

## OUTPUT FORMAT:
Return ONLY valid JSON:
{{
  "prompt": "Your complete ULTRA-DETAILED VEO prompt here (1200+ words)..."
}}

CRITICAL: The prompt must be so detailed that anyone reading it could visualize the exact video that will be generated. Include every visual element, timing, movement, and specification needed for perfect replication."""

        user_prompt = f"""Create a PERFECT ULTRA-DETAILED REPLICATION prompt for this scene:

## SCENE ANALYSIS DATA:
- **Scene Number**: {scene_analysis.get('scene_number', 1)}
- **Duration**: {duration} seconds (MAX {max_duration_seconds} SECONDS)
- **Scene Type**: {scene_analysis.get('scene_type', 'main_content')}

## SUBJECT/CHARACTER (Replicate EXACTLY):
- **Type**: {subject_desc.get('type', 'unknown')}
- **What is it**: {subject_desc.get('what_is_it', 'N/A')}
- **Design Style**: {subject_desc.get('design_style', 'N/A')}
- **Physical Appearance**: {subject_desc.get('physical_appearance', 'N/A')}
- **Distinctive Features**: {subject_desc.get('distinctive_features', 'N/A')}
- **Colors**: {subject_desc.get('colors', 'N/A')}
- **Expression**: {subject_desc.get('expression', 'N/A')}
- **Pose/Action**: {subject_desc.get('pose_action', 'N/A')}
- **Energy Level**: {subject_desc.get('energy_level', 'N/A')}
- **Voice Character**: {subject_desc.get('voice_character', 'N/A')}

## CAMERA & COMPOSITION:
- **Shot Type**: {visual_comp.get('shot_type', 'medium_shot')}
- **Camera Angle**: {visual_comp.get('camera_angle', 'eye_level')}
- **Camera Position**: {visual_comp.get('camera_position', 'front')}
- **Camera Movement**: {visual_comp.get('camera_movement', 'static')}
- **Framing**: {visual_comp.get('framing', 'centered')}

## SUBJECT IN FRAME:
- **Position**: {subject_frame.get('position_in_frame', 'center')}
- **Size**: {subject_frame.get('size_percentage', '60%')}
- **Action**: {subject_frame.get('action', 'N/A')}
- **Gesture**: {subject_frame.get('gesture', 'N/A')}
- **Facial Expression**: {subject_frame.get('facial_expression', 'N/A')}
- **Eye Direction**: {subject_frame.get('eye_direction', 'camera')}

## BACKGROUND & ENVIRONMENT:
- **Description**: {background.get('description', 'N/A')}
- **Blur Level**: {background.get('blur_level', 'slight')}
- **Visible Elements**: {background.get('visible_elements', [])}
- **Lighting**: {background.get('lighting', 'natural')}
- **Environment Style**: {background.get('environment_style', 'realistic')}

## MOTION & DYNAMICS:
- **Movement Speed**: {motion.get('movement_speed', 'static')}
- **Transition In**: {motion.get('transition_in', 'cut')}
- **Transition Out**: {motion.get('transition_out', 'cut')}
- **Energy Level**: {motion.get('energy_level', 'moderate')}

## ORIGINAL AUDIO REFERENCE:
- **Original Dialogue**: {audio.get('dialogue', 'N/A')}
- **Music Mood**: {audio.get('music_mood', 'None')}
- **Sound Effects**: {audio.get('sound_effects', 'None')}

## RECREATION GUIDANCE:
{recreation_notes}

## NEW DIALOGUE (USE EXACTLY AS WRITTEN):
"{dialogue}"

## CONTROL PARAMETERS:
- **Include Music**: {include_music}
- **Include Text Overlays**: {include_text_overlays}
- **Include Sound Effects**: {include_sound_effects}
- **Detail Level**: {prompt_detail_level}

## FORMAT: {aspect_desc}

Generate an EXTREMELY COMPREHENSIVE VEO prompt that will create a video IDENTICAL in style to the reference, with the new dialogue. The video MUST be {duration} seconds or less.

Return valid JSON with the complete prompt."""

        url = f"{GEMINI_API_BASE}/models/{model}:generateContent"
        body = {
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "generationConfig": {
                "temperature": 0.3,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 32768,  # Increased for ultra-detailed prompts
                "responseMimeType": "application/json"
            }
        }
        
        try:
            resp = requests.post(url, params=self._auth_params(), json=body, timeout=(60, 180))
            resp.raise_for_status()
            data = resp.json()
            
            if "candidates" in data and len(data["candidates"]) > 0:
                text = data["candidates"][0].get("content", {}).get("parts", [{}])[0].get("text", "")
                text = self._clean_json_response(text)
                
                parsed = json.loads(text)
                prompt = parsed.get("prompt", "")
                
                return {
                    "success": True,
                    "prompt": prompt,
                    "scene_number": scene_analysis.get("scene_number", 1),
                    "duration_seconds": duration
                }
            else:
                return {"success": False, "error": "No response from AI"}
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse prompt JSON: {e}")
            return {"success": False, "error": f"Failed to parse response: {e}"}
        except Exception as e:
            logger.error(f"Prompt generation failed: {e}")
            return {"success": False, "error": str(e)}

    def generate_all_scene_prompts(
        self,
        scenes: List[Dict[str, Any]],
        video_style: Optional[Dict[str, Any]] = None,
        video_type: Optional[Dict[str, Any]] = None,
        model: str = "gemini-2.5-flash",
        aspect_ratio: str = "VIDEO_ASPECT_RATIO_PORTRAIT",
        include_music: bool = True,
        include_text_overlays: bool = True,
        include_sound_effects: bool = True,
        prompt_detail_level: str = "detailed",
        max_duration_seconds: int = 8
    ) -> Dict[str, Any]:
        """
        Generate VEO prompts for ALL scenes in a SINGLE AI call.
        More efficient and maintains consistency across all prompts.
        """
        if not scenes:
            return {"success": True, "prompts": []}
        
        ratio_map = {
            "VIDEO_ASPECT_RATIO_PORTRAIT": "9:16 vertical (portrait)",
            "VIDEO_ASPECT_RATIO_LANDSCAPE": "16:9 horizontal (landscape)",
            "VIDEO_ASPECT_RATIO_SQUARE": "1:1 square"
        }
        aspect_desc = ratio_map.get(aspect_ratio, "9:16 vertical")
        
        # Build video context
        video_context = ""
        if video_type:
            video_context = f"""
## VIDEO TYPE (Apply to ALL scenes):
- **Primary Type**: {video_type.get('primary_type', 'unknown')}
- **Sub Type**: {video_type.get('sub_type', 'N/A')}
- **Description**: {video_type.get('description', 'N/A')}"""
        
        style_context = ""
        if video_style:
            style_context = f"""
## VISUAL STYLE (Apply CONSISTENTLY to ALL scenes):
- **Visual Style**: {video_style.get('visual_style', 'N/A')}
- **Production Quality**: {video_style.get('production_quality', 'N/A')}
- **Animation Style**: {video_style.get('animation_style', 'N/A')}
- **Color Palette**: {video_style.get('color_palette', 'N/A')}
- **Lighting**: {video_style.get('lighting', 'N/A')}
- **Camera Work**: {video_style.get('camera_work', 'N/A')}
- **Mood**: {video_style.get('mood', 'N/A')}"""

        # Control parameters
        audio_text = ""
        if include_music:
            audio_text += "Include background music matching the scene mood. "
        else:
            audio_text += "No background music. "
        if include_sound_effects:
            audio_text += "Include appropriate sound effects. "
        else:
            audio_text += "No sound effects. "
        
        if include_text_overlays:
            text_overlay_text = "Include text overlays if present in scene analysis."
        else:
            text_overlay_text = "🚫 STRICTLY NO TEXT ON VIDEO - Dialogue is SPOKEN ONLY, never displayed as text."
        
        detail_text = {
            "ultra_detailed": "ULTRA-DETAILED (1200-2000 words per prompt) - EXTREMELY COMPREHENSIVE",
            "detailed": "DETAILED (800-1200 words per prompt) - COMPREHENSIVE", 
            "basic": "BASIC (500-800 words per prompt) - ESSENTIAL DETAILS"
        }.get(prompt_detail_level, "ULTRA-DETAILED (1200-2000 words per prompt)")

        # Build scenes data
        scenes_text = ""
        for idx, scene in enumerate(scenes):
            analysis = scene.get("scene_analysis", {})
            dialogue = scene.get("dialogue", "")
            
            subject_desc = analysis.get("subject_description", {})
            visual_comp = analysis.get("visual_composition", {})
            background = analysis.get("background", {})
            motion = analysis.get("motion_dynamics", {})
            duration = min(analysis.get("duration_seconds", max_duration_seconds), max_duration_seconds)
            
            scenes_text += f"""
---
### SCENE {idx + 1}:
- **Scene Number**: {analysis.get('scene_number', idx + 1)}
- **Duration**: {duration} seconds (MAX {max_duration_seconds})
- **Scene Type**: {analysis.get('scene_type', 'main_content')}

**SUBJECT/CHARACTER**:
- Type: {subject_desc.get('type', 'unknown')}
- What is it: {subject_desc.get('what_is_it', 'N/A')}
- Design Style: {subject_desc.get('design_style', 'N/A')}
- Physical Appearance: {subject_desc.get('physical_appearance', 'N/A')}
- Colors: {subject_desc.get('colors', 'N/A')}
- Expression: {subject_desc.get('expression', 'N/A')}
- Pose/Action: {subject_desc.get('pose_action', 'N/A')}

**CAMERA & COMPOSITION**:
- Shot Type: {visual_comp.get('shot_type', 'medium_shot')}
- Camera Angle: {visual_comp.get('camera_angle', 'eye_level')}
- Camera Movement: {visual_comp.get('camera_movement', 'static')}

**BACKGROUND**:
- Description: {background.get('description', 'N/A')}
- Blur Level: {background.get('blur_level', 'slight')}
- Lighting: {background.get('lighting', 'natural')}

**MOTION**:
- Movement Speed: {motion.get('movement_speed', 'static')}
- Energy Level: {motion.get('energy_level', 'moderate')}

**DIALOGUE** (USE EXACTLY):
"{dialogue}"

**RECREATION NOTES**:
{analysis.get('recreation_notes', 'N/A')}
"""

        system_instruction = f"""You are a MASTER VEO prompt engineer. Generate ULTRA-DETAILED prompts for ALL scenes in ONE response.

## 🚨 CRITICAL RULES:
1. Generate EXACTLY {len(scenes)} prompts - one for each scene
2. Each prompt MUST be {max_duration_seconds} seconds or less
3. ALL prompts must have CONSISTENT visual style
4. Use the EXACT dialogue provided for each scene
5. Return prompts in the SAME ORDER as the scenes
6. **MINIMUM 1200 WORDS PER PROMPT** - Each prompt must be EXTREMELY detailed and comprehensive

{video_context}
{style_context}

## CONTROL PARAMETERS:
- **Detail Level**: {detail_text}
- **Audio**: {audio_text}
- **Text Overlays**: {text_overlay_text}
- **Format**: {aspect_desc}

## EACH PROMPT MUST INCLUDE (ULTRA-DETAILED):
1. **Shot type, camera angle, format** (50+ words)
2. **Subject/character description** - EXTREMELY detailed (300+ words)
   - Complete physical description, clothing, expression, pose
   - Materials, textures, colors, distinctive features
3. **Framing and composition** (100+ words)
   - Exact positioning, size, visible parts, composition rules
4. **Background and environment** (200+ words)
   - Complete environmental inventory, spatial relationships
   - Atmospheric conditions, lighting interaction
5. **Lighting and color** (200+ words)
   - Primary/secondary lights, shadows, color grading
   - Technical specifications, color temperature
6. **Motion and action sequence** (300+ words)
   - Second-by-second breakdown of ALL movements
   - Facial expressions, gestures, body language changes
7. **Dialogue in quotes** (50+ words)
   - Exact dialogue with timing and delivery specifications
8. **Audio elements** (50+ words)
9. **Duration and technical specs** (50+ words)

## MANDATORY STRUCTURE FOR EACH PROMPT:
Each prompt must follow this exact format and include ALL sections:

```
[SHOT TYPE], [CAMERA ANGLE], [CAMERA POSITION]. {aspect_desc} format.

SUBJECT/CHARACTER (ULTRA-DETAILED - 300+ WORDS):
[Complete physical description, clothing, expression, materials, colors, distinctive features, pose, energy level]

FRAMING & COMPOSITION (100+ WORDS):
[Exact positioning, size percentage, visible parts, composition rules, headroom, leadroom]

BACKGROUND & ENVIRONMENT (200+ WORDS):
[Complete environmental description, spatial layout, atmospheric conditions, all visible elements]

LIGHTING & COLOR (200+ WORDS):
[Primary lighting, secondary lights, shadows, color grading, technical specifications]

MOTION & DYNAMICS (300+ WORDS):
[Second-by-second breakdown of movements, expressions, gestures for full duration]

DIALOGUE: "[exact dialogue]"

AUDIO: [audio specifications]

DURATION: [X.X] seconds
```

## OUTPUT FORMAT (JSON):
{{
  "prompts": [
    "Complete ultra-detailed prompt for scene 1 (1200+ words)...",
    "Complete ultra-detailed prompt for scene 2 (1200+ words)...",
    ...
  ]
}}

CRITICAL: Each prompt must be EXTREMELY comprehensive with minimum 1200 words. Return EXACTLY {len(scenes)} prompts in the "prompts" array, in order. Every visual element, timing, movement, and specification must be included for perfect video replication."""

        user_prompt = f"""Generate VEO prompts for ALL {len(scenes)} scenes below.

{scenes_text}

## REQUIREMENTS:
1. Generate EXACTLY {len(scenes)} prompts
2. Keep CONSISTENT visual style across all prompts
3. Use the EXACT dialogue for each scene
4. Each prompt should be {detail_text.split('(')[0].strip()}
5. Each scene is MAX {max_duration_seconds} seconds

Return valid JSON with a "prompts" array containing {len(scenes)} prompts."""

        url = f"{GEMINI_API_BASE}/models/{model}:generateContent"
        body = {
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "generationConfig": {
                "temperature": 0.3,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 65536,  # Increased for bulk ultra-detailed prompts
                "responseMimeType": "application/json"
            }
        }
        
        try:
            resp = requests.post(url, params=self._auth_params(), json=body, timeout=(120, 300))
            resp.raise_for_status()
            data = resp.json()
            
            if "candidates" in data and len(data["candidates"]) > 0:
                text = data["candidates"][0].get("content", {}).get("parts", [{}])[0].get("text", "")
                text = self._clean_json_response(text)
                
                parsed = json.loads(text)
                prompts = parsed.get("prompts", [])
                
                # Validate count
                if len(prompts) != len(scenes):
                    logger.warning(f"Expected {len(scenes)} prompts, got {len(prompts)}")
                    while len(prompts) < len(scenes):
                        prompts.append("")
                    prompts = prompts[:len(scenes)]
                
                return {
                    "success": True,
                    "prompts": prompts
                }
            else:
                return {"success": False, "error": "No response from AI"}
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse bulk prompts JSON: {e}")
            return {"success": False, "error": f"Failed to parse response: {e}"}
        except Exception as e:
            logger.error(f"Bulk prompt generation failed: {e}")
            return {"success": False, "error": str(e)}

    def translate_text(
        self,
        text: str,
        model: str = "gemini-2.5-flash",
        include_diacritics: bool = True
    ) -> Dict[str, Any]:
        """Translate text between Arabic and English."""
        try:
            diacritics_note = ""
            if include_diacritics:
                diacritics_note = """
If translating TO Arabic, include full diacritics (تشكيل/Tashkeel) for proper pronunciation.
Example: أَهْلاً بِكُمْ (not أهلا بكم)
Diacritics ensure accurate voice synthesis and natural pronunciation.
"""
            
            system_instruction = f"""You are a professional translator specializing in Arabic and English.

## TASK
Translate the provided text:
- If the text is in Arabic, translate to English
- If the text is in English, translate to Arabic
{diacritics_note}

## TRANSLATION QUALITY
- Maintain the original meaning and tone
- Use natural, fluent language
- Preserve any emphasis or emotion
- Keep proper nouns as-is when appropriate

## OUTPUT FORMAT (JSON)
{{
  "translated_text": "The translation",
  "source_language": "arabic" or "english",
  "target_language": "arabic" or "english"
}}

Return ONLY valid JSON."""
            
            url = f"{GEMINI_API_BASE}/models/{model}:generateContent"
            body = {
                "contents": [{"role": "user", "parts": [{"text": f"Translate this text:\n\n{text}"}]}],
                "systemInstruction": {"parts": [{"text": system_instruction}]},
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 4096,
                    "responseMimeType": "application/json"
                }
            }
            
            resp = requests.post(url, params=self._auth_params(), json=body, timeout=(30, 60))
            resp.raise_for_status()
            data = resp.json()
            
            if "candidates" in data and len(data["candidates"]) > 0:
                response_text = data["candidates"][0].get("content", {}).get("parts", [{}])[0].get("text", "")
                response_text = self._clean_json_response(response_text)
                
                result = json.loads(response_text)
                result["success"] = True
                return result
            else:
                return {"success": False, "error": "No response from AI"}
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse translation response: {e}")
            return {"success": False, "error": f"Failed to parse response: {e}"}
        except Exception as e:
            logger.error(f"Translation failed: {e}")
            return {"success": False, "error": str(e)}

    def translate_all_dialogues(
        self,
        dialogues: List[str],
        model: str = "gemini-2.5-flash",
        include_diacritics: bool = True
    ) -> Dict[str, Any]:
        """Translate all dialogues in a single AI call."""
        if not dialogues:
            return {"success": True, "translations": []}
        
        try:
            diacritics_note = ""
            if include_diacritics:
                diacritics_note = """
If translating TO Arabic, include full diacritics (تشكيل/Tashkeel) for proper pronunciation.
Example: أَهْلاً بِكُمْ (not أهلا بكم)
"""
            
            # Build dialogues list
            dialogues_text = ""
            for idx, d in enumerate(dialogues):
                dialogues_text += f"\n{idx + 1}. \"{d}\""
            
            system_instruction = f"""You are a professional translator specializing in Arabic and English.

## TASK
Translate ALL the provided texts:
- If text is in Arabic, translate to English
- If text is in English, translate to Arabic
{diacritics_note}

## OUTPUT FORMAT (JSON)
{{
  "translations": [
    {{"index": 0, "original": "...", "translated": "...", "source_language": "...", "target_language": "..."}},
    {{"index": 1, "original": "...", "translated": "...", "source_language": "...", "target_language": "..."}},
    ...
  ]
}}

Return EXACTLY {len(dialogues)} translations in the same order."""
            
            url = f"{GEMINI_API_BASE}/models/{model}:generateContent"
            body = {
                "contents": [{"role": "user", "parts": [{"text": f"Translate these {len(dialogues)} texts:{dialogues_text}"}]}],
                "systemInstruction": {"parts": [{"text": system_instruction}]},
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 16384,
                    "responseMimeType": "application/json"
                }
            }
            
            resp = requests.post(url, params=self._auth_params(), json=body, timeout=(60, 120))
            resp.raise_for_status()
            data = resp.json()
            
            if "candidates" in data and len(data["candidates"]) > 0:
                response_text = data["candidates"][0].get("content", {}).get("parts", [{}])[0].get("text", "")
                response_text = self._clean_json_response(response_text)
                
                result = json.loads(response_text)
                translations = result.get("translations", [])
                
                # Ensure we have the right count
                while len(translations) < len(dialogues):
                    idx = len(translations)
                    translations.append({
                        "index": idx,
                        "original": dialogues[idx],
                        "translated": dialogues[idx],
                        "source_language": "unknown",
                        "target_language": "unknown"
                    })
                
                return {
                    "success": True,
                    "translations": translations[:len(dialogues)]
                }
            else:
                return {"success": False, "error": "No response from AI"}
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse bulk translation response: {e}")
            return {"success": False, "error": f"Failed to parse response: {e}"}
        except Exception as e:
            logger.error(f"Bulk translation failed: {e}")
            return {"success": False, "error": str(e)}

    # ============================================================================
    # Script-to-Video Methods
    # ============================================================================

    def generate_storyboard_concepts(
        self,
        script: str,
        model: str = "gemini-2.5-flash",
        aspect_ratio: str = "VIDEO_ASPECT_RATIO_PORTRAIT",
        num_concepts: int = 3,
        style_reference_url: Optional[str] = None,
        saved_analysis: Optional[Dict[str, Any]] = None,
        replication_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Generate multiple creative storyboard concepts for a script.
        """
        ratio_map = {
            "VIDEO_ASPECT_RATIO_PORTRAIT": "9:16 vertical",
            "VIDEO_ASPECT_RATIO_LANDSCAPE": "16:9 widescreen",
            "VIDEO_ASPECT_RATIO_SQUARE": "1:1 square"
        }
        aspect_desc = ratio_map.get(aspect_ratio, "9:16 vertical")
        
        style_analysis = saved_analysis
        
        # If style reference URL provided and no saved analysis, analyze it
        if style_reference_url and not saved_analysis:
            try:
                logger.info(f"Analyzing style reference: {style_reference_url}")
                result = self.analyze_video_url_comprehensive(
                    video_url=style_reference_url,
                    model=model,
                    extract_transcript=True,
                    analyze_style=True
                )
                if result.get("success"):
                    style_analysis = result.get("analysis", {})
            except Exception as e:
                logger.warning(f"Failed to analyze style reference: {e}")
        
        if replication_mode and style_analysis:
            num_concepts = 1
        
        # Build system instruction based on mode
        if replication_mode and style_analysis:
            scene_breakdown = style_analysis.get("scene_breakdown", [])
            scene_info = ""
            if scene_breakdown:
                scene_info = f"\n\n## REFERENCE VIDEO SCENE BREAKDOWN ({len(scene_breakdown)} scenes):\n"
                for scene in scene_breakdown:
                    scene_info += f"""
### Scene {scene.get('scene_number', '?')}: {scene.get('timestamp_start', '?')} - {scene.get('timestamp_end', '?')}
- Shot Type: {scene.get('visual_composition', {}).get('shot_type', 'N/A')}
- Camera Angle: {scene.get('visual_composition', {}).get('camera_angle', 'N/A')}
- Recreation Notes: {scene.get('recreation_notes', 'N/A')}
"""
            
            system_instruction = f"""You are a creative director generating a storyboard that EXACTLY REPLICATES a reference video style.

## YOUR TASK
Generate EXACTLY 1 storyboard concept that REPLICATES the analyzed reference video SCENE-BY-SCENE.

## 🚨 CRITICAL RULES:
1. **PRESERVE EXACT SCRIPT TEXT** - Use the EXACT words from the script.
2. **REPLICATE SCENE-BY-SCENE** - Match each scene's camera angle, position, movement.
3. **MATCH TIMING** - Match the pacing and scene durations from the reference.
{scene_info}

## OUTPUT FORMAT (JSON)
{{
  "concepts": [
    {{
      "id": "replication_1",
      "style_name": "Style Replication",
      "style_icon": "🎬",
      "creative_concept": "Exact replication of reference video style",
      "visual_approach": "[Match reference exactly]",
      "character_description": "[Match reference]",
      "environment_description": "[Match reference]",
      "mood_and_tone": "[Match reference]",
      "scenes": [
        {{
          "scene_number": 1,
          "duration": "8s",
          "dialogue": "EXACT words from script",
          "visual_description": "[Match reference Scene 1]",
          "camera": "[Match reference camera work]",
          "mood": "[Match reference mood]"
        }}
      ]
    }}
  ]
}}"""
        elif style_analysis:
            system_instruction = f"""You are a creative director generating storyboard concepts that MATCH a reference video style.

## YOUR TASK
Generate {num_concepts} creative storyboard concepts that MATCH the analyzed reference video style.

## 🚨 CRITICAL RULES:
1. **PRESERVE EXACT SCRIPT TEXT** - Use the EXACT words from the script.
2. **REPLICATE REFERENCE STYLE** - Match the visual approach, camera work, lighting, pacing.
3. **SCENE SPLITTING** - Split ONLY at sentence boundaries. NEVER split mid-sentence.

## OUTPUT FORMAT (JSON)
{{
  "concepts": [
    {{
      "id": "concept_1",
      "style_name": "[Dynamic - based on reference]",
      "style_icon": "[Appropriate emoji]",
      "creative_concept": "[Inspired by reference style]",
      "visual_approach": "[Match reference visual approach]",
      "character_description": "[Match reference if applicable]",
      "environment_description": "[Match reference environment]",
      "mood_and_tone": "[Match reference mood]",
      "scenes": [
        {{
          "scene_number": 1,
          "duration": "8s",
          "dialogue": "EXACT words from script",
          "visual_description": "[Match reference visual style]",
          "camera": "[Match reference camera work]",
          "mood": "[Match reference mood]"
        }}
      ]
    }}
  ]
}}"""
        else:
            system_instruction = f"""You are an expert creative director generating high-converting video storyboards.

## YOUR TASK
Generate {num_concepts} COMPLETELY DIFFERENT creative approaches for this script.
Each concept should be optimized for ENGAGEMENT with a STRONG HOOK.

## 🚨 CRITICAL RULES:
1. **PRESERVE EXACT SCRIPT TEXT** - Use the EXACT words from the script.
2. **STRONG HOOK** - First 3 seconds MUST grab attention.
3. **SCENE SPLITTING** - Split ONLY at sentence boundaries.

## OUTPUT FORMAT (JSON)
{{
  "concepts": [
    {{
      "id": "concept_1",
      "style_name": "[Creative unique name]",
      "style_icon": "[Appropriate emoji]",
      "creative_concept": "[Your creative vision]",
      "visual_approach": "[Detailed visual approach]",
      "character_description": "[If applicable]",
      "environment_description": "[Specific environment]",
      "mood_and_tone": "[Mood description]",
      "scenes": [
        {{
          "scene_number": 1,
          "duration": "8s",
          "dialogue": "EXACT words from script",
          "visual_description": "[Creative visual - HOOK in first 3 seconds]",
          "camera": "[Specific camera work]",
          "mood": "[Scene mood]"
        }}
      ]
    }}
  ]
}}"""

        user_prompt = f"""Generate {num_concepts} creative storyboard concepts for this script:

## SCRIPT (USE EXACT WORDS - NO CHANGES):
{script}

## FORMAT: {aspect_desc}

Return valid JSON with creative concepts."""

        if style_analysis:
            user_prompt += f"""

## 🎨 STYLE REFERENCE ANALYSIS (REPLICATE THIS STYLE)
{json.dumps(style_analysis.get('style_analysis', {}), indent=2, ensure_ascii=False)[:2000]}
"""

        url = f"{GEMINI_API_BASE}/models/{model}:generateContent"
        body = {
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "generationConfig": {
                "temperature": 0.9,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 32768,
                "responseMimeType": "application/json"
            }
        }
        
        try:
            resp = requests.post(url, params=self._auth_params(), json=body, timeout=(30, 300))
            resp.raise_for_status()
            data = resp.json()
            
            if "candidates" in data and len(data["candidates"]) > 0:
                text = data["candidates"][0].get("content", {}).get("parts", [{}])[0].get("text", "")
                text = self._clean_json_response(text)
                
                try:
                    parsed = json.loads(text)
                    return {"success": True, "concepts": parsed.get("concepts", [])}
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse storyboard JSON: {e}")
                    return {"success": False, "error": f"Failed to parse response: {e}"}
            else:
                return {"success": False, "error": "No response from AI"}
                
        except Exception as e:
            logger.error(f"Storyboard generation failed: {e}")
            return {"success": False, "error": str(e)}

    def generate_replication_prompts(
        self,
        script: str,
        video_analysis: Dict[str, Any],
        model: str = "gemini-2.5-flash",
        aspect_ratio: str = "VIDEO_ASPECT_RATIO_PORTRAIT"
    ) -> Dict[str, Any]:
        """
        Generate detailed VEO prompts directly from script + scene analysis (REPLICATION MODE).
        """
        ratio_map = {
            "VIDEO_ASPECT_RATIO_PORTRAIT": "9:16 vertical",
            "VIDEO_ASPECT_RATIO_LANDSCAPE": "16:9 widescreen",
            "VIDEO_ASPECT_RATIO_SQUARE": "1:1 square"
        }
        aspect_desc = ratio_map.get(aspect_ratio, "9:16 vertical")
        
        scene_breakdown = video_analysis.get("scene_breakdown", [])
        video_type = video_analysis.get("video_type", {})
        style_analysis = video_analysis.get("style_analysis", {})
        
        scene_details = ""
        for idx, scene in enumerate(scene_breakdown, 1):
            subject_desc = scene.get("subject_description", {})
            visual_comp = scene.get("visual_composition", {})
            background = scene.get("background", {})
            
            scene_details += f"""
### SCENE {idx} TEMPLATE:
- **Timestamp**: {scene.get('timestamp_start', '?')} - {scene.get('timestamp_end', '?')} ({scene.get('duration_seconds', 8)}s)
- **Subject**: {subject_desc.get('what_is_it', 'N/A')}
- **Shot Type**: {visual_comp.get('shot_type', 'medium')}
- **Camera Angle**: {visual_comp.get('camera_angle', 'eye_level')}
- **Background**: {background.get('description', 'N/A')}
- **Recreation Notes**: {scene.get('recreation_notes', 'N/A')}
"""

        system_instruction = f"""You are an expert VEO prompt engineer creating DETAILED prompts for video generation.

## YOUR TASK
Take the user's NEW SCRIPT and create detailed VEO prompts that EXACTLY REPLICATE the visual style of the analyzed reference video.

## REFERENCE VIDEO STYLE:
- **Video Type**: {video_type.get('primary_type', 'unknown')}
- **Visual Style**: {style_analysis.get('visual_style', 'N/A')}
- **Color Palette**: {style_analysis.get('color_palette', 'N/A')}
- **Lighting**: {style_analysis.get('lighting', 'N/A')}
- **Mood**: {style_analysis.get('mood', 'N/A')}

## SCENE TEMPLATES:
{scene_details}

## 🚨 CRITICAL RULES:
1. **PRESERVE EXACT SCRIPT** - Use the EXACT words from the user's script.
2. **REPLICATE VISUAL STYLE** - Each prompt must match the reference scene's visual style.
3. **DETAILED PROMPTS** - Each prompt must be 200-400 words with ALL visual details.
4. **MAX 8 SECONDS** - Each scene must be 8 seconds or less.

## OUTPUT FORMAT (JSON):
{{
  "prompts": [
    {{
      "scene_number": 1,
      "dialogue": "EXACT words from user's script for this scene",
      "duration_seconds": 8,
      "prompt": "A detailed 200-400 word VEO prompt..."
    }}
  ],
  "style_summary": "Brief summary of the replicated style"
}}"""

        user_prompt = f"""Generate detailed VEO replication prompts for this script:

## USER'S NEW SCRIPT (USE EXACT WORDS):
{script}

## FORMAT: {aspect_desc}

Split the script into {len(scene_breakdown)} scenes and create detailed prompts.
Return valid JSON."""

        url = f"{GEMINI_API_BASE}/models/{model}:generateContent"
        body = {
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "generationConfig": {
                "temperature": 0.4,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 32768,
                "responseMimeType": "application/json"
            }
        }
        
        try:
            resp = requests.post(url, params=self._auth_params(), json=body, timeout=(30, 300))
            resp.raise_for_status()
            data = resp.json()
            
            if "candidates" in data and len(data["candidates"]) > 0:
                text = data["candidates"][0].get("content", {}).get("parts", [{}])[0].get("text", "")
                text = self._clean_json_response(text)
                
                try:
                    parsed = json.loads(text)
                    return {
                        "success": True,
                        "prompts": parsed.get("prompts", []),
                        "style_summary": parsed.get("style_summary", "")
                    }
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse replication prompts JSON: {e}")
                    return {"success": False, "error": f"Failed to parse response: {e}"}
            else:
                return {"success": False, "error": "No response from AI"}
                
        except Exception as e:
            logger.error(f"Replication prompt generation failed: {e}")
            return {"success": False, "error": str(e)}

    def generate_prompts_from_storyboard(
        self,
        script: str,
        storyboard: Dict[str, Any],
        model: str = "gemini-2.5-flash",
        aspect_ratio: str = "VIDEO_ASPECT_RATIO_PORTRAIT"
    ) -> Dict[str, Any]:
        """
        Generate detailed VEO prompts from a selected/edited storyboard.
        """
        ratio_map = {
            "VIDEO_ASPECT_RATIO_PORTRAIT": "9:16 vertical",
            "VIDEO_ASPECT_RATIO_LANDSCAPE": "16:9 widescreen",
            "VIDEO_ASPECT_RATIO_SQUARE": "1:1 square"
        }
        aspect_desc = ratio_map.get(aspect_ratio, "9:16 vertical")
        
        storyboard_str = json.dumps(storyboard, indent=2, ensure_ascii=False)
        
        system_instruction = f"""You are generating DETAILED VEO video prompts from a storyboard.

## YOUR TASK
Take the provided storyboard and generate HIGHLY DETAILED prompts for each scene.

## 🚨 CRITICAL RULES:
1. **PRESERVE EXACT DIALOGUE** - Use the EXACT words from the storyboard dialogue.
2. **MAINTAIN STYLE CONSISTENCY** - Replicate the storyboard's visual style in every scene.
3. **NO TEXT ON VIDEO** - Dialogue is SPOKEN only, never displayed as text.

## FOR EACH SCENE, GENERATE:
1. Full visual description (200-400 words)
2. Detailed character appearance (CONSISTENT across all scenes)
3. Environment and lighting details
4. Camera setup and movement
5. Performance cues (expressions, gestures)
6. EXACT dialogue

## OUTPUT FORMAT (JSON)
{{
  "prompts": [
    {{
      "scene_number": 1,
      "prompt": "# VEO PROMPT: Scene 1\\n\\n[FULL DETAILED PROMPT WITH EXACT DIALOGUE]",
      "duration_seconds": 8,
      "success": true
    }}
  ],
  "total_scenes": 3,
  "successful_count": 3,
  "failed_count": 0
}}"""

        user_prompt = f"""Generate detailed VEO prompts from this storyboard:

## ORIGINAL SCRIPT (PRESERVE EXACT WORDS):
{script}

## STORYBOARD (REPLICATE THIS STYLE):
{storyboard_str}

## FORMAT: {aspect_desc}

Return valid JSON with detailed prompts."""

        url = f"{GEMINI_API_BASE}/models/{model}:generateContent"
        body = {
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "generationConfig": {
                "temperature": 0.7,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 32768,
                "responseMimeType": "application/json"
            }
        }
        
        try:
            resp = requests.post(url, params=self._auth_params(), json=body, timeout=(30, 300))
            resp.raise_for_status()
            data = resp.json()
            
            if "candidates" in data and len(data["candidates"]) > 0:
                text = data["candidates"][0].get("content", {}).get("parts", [{}])[0].get("text", "")
                text = self._clean_json_response(text)
                
                try:
                    parsed = json.loads(text)
                    return {
                        "success": True,
                        "prompts": parsed.get("prompts", []),
                        "total_scenes": parsed.get("total_scenes", len(parsed.get("prompts", []))),
                        "successful_count": parsed.get("successful_count", len(parsed.get("prompts", []))),
                        "failed_count": parsed.get("failed_count", 0)
                    }
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse prompts JSON: {e}")
                    return {"success": False, "error": f"Failed to parse response: {e}"}
            else:
                return {"success": False, "error": "No response from AI"}
                
        except Exception as e:
            logger.error(f"Prompt generation from storyboard failed: {e}")
            return {"success": False, "error": str(e)}
