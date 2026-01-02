"""
Video Replicator API Router
Endpoints for video analysis and prompt generation
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.services.google_ai_service import GoogleAIService

router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class AnalyzeVideoUrlRequest(BaseModel):
    video_url: str
    model: str = "gemini-2.5-flash"
    extract_transcript: bool = True
    analyze_style: bool = True
    target_scene_count: Optional[int] = None
    merge_short_scenes: bool = True
    skip_scene_breakdown: bool = False


class SubjectDescription(BaseModel):
    type: Optional[str] = None
    what_is_it: Optional[str] = None
    design_style: Optional[str] = None
    physical_appearance: Optional[str] = None
    distinctive_features: Optional[str] = None
    colors: Optional[str] = None
    expression: Optional[str] = None
    pose_action: Optional[str] = None
    energy_level: Optional[str] = None
    voice_character: Optional[str] = None


class VisualComposition(BaseModel):
    shot_type: Optional[str] = None
    camera_angle: Optional[str] = None
    camera_position: Optional[str] = None
    camera_movement: Optional[str] = None
    framing: Optional[str] = None


class SubjectInFrame(BaseModel):
    position_in_frame: Optional[str] = None
    size_percentage: Optional[str] = None
    action: Optional[str] = None
    gesture: Optional[str] = None
    facial_expression: Optional[str] = None
    eye_direction: Optional[str] = None


class Background(BaseModel):
    description: Optional[str] = None
    blur_level: Optional[str] = None
    visible_elements: Optional[List[str]] = None
    lighting: Optional[str] = None
    environment_style: Optional[str] = None


class MotionDynamics(BaseModel):
    movement_speed: Optional[str] = None
    transition_in: Optional[str] = None
    transition_out: Optional[str] = None
    energy_level: Optional[str] = None


class TextGraphics(BaseModel):
    text_overlay: Optional[str] = None
    text_position: Optional[str] = None
    text_animation: Optional[str] = None
    graphics: Optional[str] = None


class Audio(BaseModel):
    dialogue: Optional[str] = None
    music_mood: Optional[str] = None
    sound_effects: Optional[str] = None


class SceneAnalysis(BaseModel):
    scene_number: Optional[int] = None
    timestamp_start: Optional[str] = None
    timestamp_end: Optional[str] = None
    duration_seconds: Optional[float] = None
    scene_type: Optional[str] = None
    subject_description: Optional[SubjectDescription] = None
    visual_composition: Optional[VisualComposition] = None
    subject_in_frame: Optional[SubjectInFrame] = None
    background: Optional[Background] = None
    motion_dynamics: Optional[MotionDynamics] = None
    text_graphics: Optional[TextGraphics] = None
    audio: Optional[Audio] = None
    recreation_notes: Optional[str] = None


class VideoType(BaseModel):
    primary_type: str
    sub_type: Optional[str] = None
    description: Optional[str] = None


class StyleAnalysis(BaseModel):
    visual_style: Optional[str] = None
    color_palette: Optional[str] = None
    lighting: Optional[str] = None
    camera_work: Optional[str] = None
    pacing: Optional[str] = None
    mood: Optional[str] = None
    character_description: Optional[str] = None
    environment_description: Optional[str] = None


class ContentAnalysis(BaseModel):
    hook_type: Optional[str] = None
    structure: Optional[str] = None
    target_audience: Optional[str] = None


class VideoAnalysisResult(BaseModel):
    video_type: Optional[VideoType] = None
    transcript: Optional[str] = None
    style_analysis: Optional[StyleAnalysis] = None
    content_analysis: Optional[ContentAnalysis] = None
    scene_breakdown: Optional[List[SceneAnalysis]] = None


class AnalyzeVideoUrlResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    analysis: Optional[VideoAnalysisResult] = None


class GenerateScenePromptRequest(BaseModel):
    scene_analysis: Dict[str, Any]
    dialogue: str
    video_style: Optional[Dict[str, Any]] = None
    video_type: Optional[Dict[str, Any]] = None
    model: str = "gemini-2.5-flash"
    aspect_ratio: str = "VIDEO_ASPECT_RATIO_PORTRAIT"
    include_music: bool = True
    include_text_overlays: bool = True
    include_sound_effects: bool = True
    prompt_detail_level: str = "detailed"
    max_duration_seconds: int = 8


class GenerateScenePromptResponse(BaseModel):
    prompt: str
    scene_number: int
    duration_seconds: float


class GenerateAllPromptsRequest(BaseModel):
    scenes: List[Dict[str, Any]]
    video_style: Optional[Dict[str, Any]] = None
    video_type: Optional[Dict[str, Any]] = None
    model: str = "gemini-2.5-flash"
    aspect_ratio: str = "VIDEO_ASPECT_RATIO_PORTRAIT"
    include_music: bool = True
    include_text_overlays: bool = True
    include_sound_effects: bool = True
    prompt_detail_level: str = "detailed"
    max_duration_seconds: int = 8


class PromptResult(BaseModel):
    scene_number: int
    prompt: str
    duration_seconds: float
    success: bool
    error: Optional[str] = None


class GenerateAllPromptsResponse(BaseModel):
    prompts: List[PromptResult]
    total_scenes: int
    successful_count: int
    failed_count: int


class TranslateScriptRequest(BaseModel):
    text: str
    model: str = "gemini-2.5-flash"
    include_diacritics: bool = True


class TranslateScriptResponse(BaseModel):
    translated_text: str
    source_language: str
    target_language: str


class TranslateAllRequest(BaseModel):
    dialogues: List[str]
    model: str = "gemini-2.5-flash"
    include_diacritics: bool = True


class TranslationResult(BaseModel):
    index: int
    original: str
    translated: str
    source_language: str
    target_language: str
    success: bool
    error: Optional[str] = None


class TranslateAllResponse(BaseModel):
    translations: List[TranslationResult]
    total_count: int
    successful_count: int
    failed_count: int


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/analyze-video-url", response_model=AnalyzeVideoUrlResponse)
async def analyze_video_url(payload: AnalyzeVideoUrlRequest):
    """
    Analyze a video URL to extract transcript and style details.
    Supports Instagram, TikTok, YouTube, and direct video URLs.
    """
    try:
        service = GoogleAIService()
        result = service.analyze_video_url_comprehensive(
            video_url=payload.video_url,
            model=payload.model,
            extract_transcript=payload.extract_transcript,
            analyze_style=payload.analyze_style,
            target_scene_count=payload.target_scene_count,
            merge_short_scenes=payload.merge_short_scenes,
            skip_scene_breakdown=payload.skip_scene_breakdown
        )
        
        if not result.get("success"):
            return AnalyzeVideoUrlResponse(
                success=False,
                error=result.get("error", "Analysis failed")
            )
        
        analysis = result.get("analysis", {})
        
        # Parse scene breakdown
        scene_breakdown = None
        raw_scenes = analysis.get("scene_breakdown", [])
        if raw_scenes:
            scene_breakdown = []
            for scene in raw_scenes:
                if not isinstance(scene, dict):
                    continue
                scene_breakdown.append(SceneAnalysis(
                    scene_number=scene.get("scene_number"),
                    timestamp_start=scene.get("timestamp_start"),
                    timestamp_end=scene.get("timestamp_end"),
                    duration_seconds=scene.get("duration_seconds"),
                    scene_type=scene.get("scene_type"),
                    subject_description=SubjectDescription(**scene.get("subject_description", {})) if scene.get("subject_description") else None,
                    visual_composition=VisualComposition(**scene.get("visual_composition", {})) if scene.get("visual_composition") else None,
                    subject_in_frame=SubjectInFrame(**scene.get("subject_in_frame", {})) if scene.get("subject_in_frame") else None,
                    background=Background(**scene.get("background", {})) if scene.get("background") else None,
                    motion_dynamics=MotionDynamics(**scene.get("motion_dynamics", {})) if scene.get("motion_dynamics") else None,
                    text_graphics=TextGraphics(**scene.get("text_graphics", {})) if scene.get("text_graphics") else None,
                    audio=Audio(**scene.get("audio", {})) if scene.get("audio") else None,
                    recreation_notes=scene.get("recreation_notes")
                ))
        
        # Build response
        video_type = None
        if analysis.get("video_type"):
            vt = analysis["video_type"]
            video_type = VideoType(
                primary_type=vt.get("primary_type", "unknown"),
                sub_type=vt.get("sub_type"),
                description=vt.get("description")
            )
        
        style_analysis = None
        if analysis.get("style_analysis"):
            sa = analysis["style_analysis"]
            style_analysis = StyleAnalysis(
                visual_style=sa.get("visual_style"),
                color_palette=sa.get("color_palette"),
                lighting=sa.get("lighting"),
                camera_work=sa.get("camera_work"),
                pacing=sa.get("pacing"),
                mood=sa.get("mood"),
                character_description=sa.get("character_description"),
                environment_description=sa.get("environment_description")
            )
        
        content_analysis = None
        if analysis.get("content_analysis"):
            ca = analysis["content_analysis"]
            content_analysis = ContentAnalysis(
                hook_type=ca.get("hook_type"),
                structure=ca.get("structure"),
                target_audience=ca.get("target_audience")
            )
        
        return AnalyzeVideoUrlResponse(
            success=True,
            analysis=VideoAnalysisResult(
                video_type=video_type,
                transcript=analysis.get("transcript"),
                style_analysis=style_analysis,
                content_analysis=content_analysis,
                scene_breakdown=scene_breakdown
            )
        )
        
    except Exception as e:
        return AnalyzeVideoUrlResponse(
            success=False,
            error=str(e)
        )


@router.post("/generate-scene-prompt", response_model=GenerateScenePromptResponse)
async def generate_scene_prompt(payload: GenerateScenePromptRequest):
    """Generate a VEO prompt for a single scene."""
    try:
        service = GoogleAIService()
        result = service.generate_single_scene_prompt(
            scene_analysis=payload.scene_analysis,
            dialogue=payload.dialogue,
            video_style=payload.video_style,
            video_type=payload.video_type,
            model=payload.model,
            aspect_ratio=payload.aspect_ratio,
            include_music=payload.include_music,
            include_text_overlays=payload.include_text_overlays,
            include_sound_effects=payload.include_sound_effects,
            prompt_detail_level=payload.prompt_detail_level,
            max_duration_seconds=payload.max_duration_seconds
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to generate prompt"))
        
        return GenerateScenePromptResponse(
            prompt=result["prompt"],
            scene_number=result.get("scene_number", 1),
            duration_seconds=result.get("duration_seconds", 8)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-all-prompts", response_model=GenerateAllPromptsResponse)
async def generate_all_prompts(payload: GenerateAllPromptsRequest):
    """Generate VEO prompts for all scenes at once."""
    try:
        service = GoogleAIService()
        results = []
        successful = 0
        failed = 0
        
        for idx, scene_data in enumerate(payload.scenes):
            try:
                result = service.generate_single_scene_prompt(
                    scene_analysis=scene_data.get("scene_analysis", {}),
                    dialogue=scene_data.get("dialogue", ""),
                    video_style=payload.video_style,
                    video_type=payload.video_type,
                    model=payload.model,
                    aspect_ratio=payload.aspect_ratio,
                    include_music=payload.include_music,
                    include_text_overlays=payload.include_text_overlays,
                    include_sound_effects=payload.include_sound_effects,
                    prompt_detail_level=payload.prompt_detail_level,
                    max_duration_seconds=payload.max_duration_seconds
                )
                
                if result.get("success"):
                    results.append(PromptResult(
                        scene_number=idx + 1,
                        prompt=result["prompt"],
                        duration_seconds=result.get("duration_seconds", 8),
                        success=True
                    ))
                    successful += 1
                else:
                    results.append(PromptResult(
                        scene_number=idx + 1,
                        prompt="",
                        duration_seconds=0,
                        success=False,
                        error=result.get("error", "Unknown error")
                    ))
                    failed += 1
                    
            except Exception as e:
                results.append(PromptResult(
                    scene_number=idx + 1,
                    prompt="",
                    duration_seconds=0,
                    success=False,
                    error=str(e)
                ))
                failed += 1
        
        return GenerateAllPromptsResponse(
            prompts=results,
            total_scenes=len(payload.scenes),
            successful_count=successful,
            failed_count=failed
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/translate-script", response_model=TranslateScriptResponse)
async def translate_script(payload: TranslateScriptRequest):
    """Translate text between Arabic and English."""
    try:
        service = GoogleAIService()
        result = service.translate_text(
            text=payload.text,
            model=payload.model,
            include_diacritics=payload.include_diacritics
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Translation failed"))
        
        return TranslateScriptResponse(
            translated_text=result["translated_text"],
            source_language=result.get("source_language", "unknown"),
            target_language=result.get("target_language", "unknown")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/translate-all", response_model=TranslateAllResponse)
async def translate_all_dialogues(payload: TranslateAllRequest):
    """Translate all dialogues at once."""
    try:
        service = GoogleAIService()
        results = []
        successful = 0
        failed = 0
        
        for idx, text in enumerate(payload.dialogues):
            if not text.strip():
                results.append(TranslationResult(
                    index=idx,
                    original=text,
                    translated=text,
                    source_language="",
                    target_language="",
                    success=True
                ))
                successful += 1
                continue
                
            try:
                result = service.translate_text(
                    text=text,
                    model=payload.model,
                    include_diacritics=payload.include_diacritics
                )
                
                if result.get("success"):
                    results.append(TranslationResult(
                        index=idx,
                        original=text,
                        translated=result["translated_text"],
                        source_language=result.get("source_language", "unknown"),
                        target_language=result.get("target_language", "unknown"),
                        success=True
                    ))
                    successful += 1
                else:
                    results.append(TranslationResult(
                        index=idx,
                        original=text,
                        translated=text,
                        source_language="",
                        target_language="",
                        success=False,
                        error=result.get("error", "Unknown error")
                    ))
                    failed += 1
                    
            except Exception as e:
                results.append(TranslationResult(
                    index=idx,
                    original=text,
                    translated=text,
                    source_language="",
                    target_language="",
                    success=False,
                    error=str(e)
                ))
                failed += 1
        
        return TranslateAllResponse(
            translations=results,
            total_count=len(payload.dialogues),
            successful_count=successful,
            failed_count=failed
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Script-to-Video Request/Response Models
# ============================================================================

class StoryboardScene(BaseModel):
    scene_number: int
    duration: str
    dialogue: str
    visual_description: str
    camera: str
    mood: str


class StoryboardConcept(BaseModel):
    id: str
    style_name: str
    style_icon: str
    creative_concept: str
    visual_approach: str
    character_description: Optional[str] = None
    environment_description: Optional[str] = None
    mood_and_tone: str
    scenes: List[StoryboardScene]


class GenerateStoryboardsRequest(BaseModel):
    script: str
    model: str = "gemini-2.5-flash"
    aspect_ratio: str = "VIDEO_ASPECT_RATIO_PORTRAIT"
    num_concepts: int = 3
    style_reference_url: Optional[str] = None
    video_analysis: Optional[Dict[str, Any]] = None
    replication_mode: bool = False


class GenerateStoryboardsResponse(BaseModel):
    concepts: List[StoryboardConcept]


class GenerateReplicationPromptsRequest(BaseModel):
    script: str
    video_analysis: Dict[str, Any]
    model: str = "gemini-2.5-flash"
    aspect_ratio: str = "VIDEO_ASPECT_RATIO_PORTRAIT"


class ReplicationPrompt(BaseModel):
    scene_number: int
    dialogue: str
    prompt: str
    duration_seconds: int


class GenerateReplicationPromptsResponse(BaseModel):
    prompts: List[ReplicationPrompt]
    total_scenes: int
    style_summary: Optional[str] = None


class GeneratePromptsFromStoryboardRequest(BaseModel):
    script: str
    storyboard: Dict[str, Any]
    model: str = "gemini-2.5-flash"
    aspect_ratio: str = "VIDEO_ASPECT_RATIO_PORTRAIT"


class StoryboardPromptResult(BaseModel):
    scene_number: int
    prompt: str
    duration_seconds: int
    success: bool
    error: Optional[str] = None


class GeneratePromptsFromStoryboardResponse(BaseModel):
    prompts: List[StoryboardPromptResult]
    total_scenes: int
    successful_count: int
    failed_count: int


# ============================================================================
# Script-to-Video API Endpoints
# ============================================================================

@router.post("/generate-storyboards", response_model=GenerateStoryboardsResponse)
async def generate_storyboards(payload: GenerateStoryboardsRequest):
    """
    Generate multiple creative storyboard concepts for a script.
    Step 1 of the script-to-video workflow.
    """
    try:
        service = GoogleAIService()
        result = service.generate_storyboard_concepts(
            script=payload.script,
            model=payload.model,
            aspect_ratio=payload.aspect_ratio,
            num_concepts=payload.num_concepts,
            style_reference_url=payload.style_reference_url,
            saved_analysis=payload.video_analysis,
            replication_mode=payload.replication_mode
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to generate storyboards"))
        
        concepts = []
        for c in result.get("concepts", []):
            scenes = []
            for s in c.get("scenes", []):
                scenes.append(StoryboardScene(
                    scene_number=s.get("scene_number", 1),
                    duration=s.get("duration", "8s"),
                    dialogue=s.get("dialogue", ""),
                    visual_description=s.get("visual_description", ""),
                    camera=s.get("camera", ""),
                    mood=s.get("mood", "")
                ))
            
            concepts.append(StoryboardConcept(
                id=c.get("id", ""),
                style_name=c.get("style_name", ""),
                style_icon=c.get("style_icon", "🎬"),
                creative_concept=c.get("creative_concept", ""),
                visual_approach=c.get("visual_approach", ""),
                character_description=c.get("character_description"),
                environment_description=c.get("environment_description"),
                mood_and_tone=c.get("mood_and_tone", ""),
                scenes=scenes
            ))
        
        return GenerateStoryboardsResponse(concepts=concepts)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-replication-prompts", response_model=GenerateReplicationPromptsResponse)
async def generate_replication_prompts(payload: GenerateReplicationPromptsRequest):
    """
    Generate detailed VEO prompts directly from script + scene analysis (REPLICATION MODE).
    Skips the storyboard step for exact video replication.
    """
    try:
        service = GoogleAIService()
        result = service.generate_replication_prompts(
            script=payload.script,
            video_analysis=payload.video_analysis,
            model=payload.model,
            aspect_ratio=payload.aspect_ratio
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to generate replication prompts"))
        
        prompts = []
        for p in result.get("prompts", []):
            prompts.append(ReplicationPrompt(
                scene_number=p.get("scene_number", 1),
                dialogue=p.get("dialogue", ""),
                prompt=p.get("prompt", ""),
                duration_seconds=p.get("duration_seconds", 8)
            ))
        
        return GenerateReplicationPromptsResponse(
            prompts=prompts,
            total_scenes=len(prompts),
            style_summary=result.get("style_summary")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-prompts-from-storyboard", response_model=GeneratePromptsFromStoryboardResponse)
async def generate_prompts_from_storyboard(payload: GeneratePromptsFromStoryboardRequest):
    """
    Generate detailed VEO prompts from a selected/edited storyboard.
    Step 3 of the script-to-video workflow.
    """
    try:
        service = GoogleAIService()
        result = service.generate_prompts_from_storyboard(
            script=payload.script,
            storyboard=payload.storyboard,
            model=payload.model,
            aspect_ratio=payload.aspect_ratio
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to generate prompts"))
        
        prompts = []
        for idx, p in enumerate(result.get("prompts", [])):
            prompts.append(StoryboardPromptResult(
                scene_number=p.get("scene_number", idx + 1),
                prompt=p.get("prompt", ""),
                duration_seconds=p.get("duration_seconds", 8),
                success=p.get("success", True),
                error=p.get("error")
            ))
        
        return GeneratePromptsFromStoryboardResponse(
            prompts=prompts,
            total_scenes=result.get("total_scenes", len(prompts)),
            successful_count=result.get("successful_count", len(prompts)),
            failed_count=result.get("failed_count", 0)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
