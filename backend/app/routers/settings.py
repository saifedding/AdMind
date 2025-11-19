from fastapi import APIRouter, HTTPException, Depends, Response
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import logging
import hashlib
import json
from datetime import datetime
import requests

from app.database import get_db
from app.models import AppSetting, VeoGeneration, MergedVideo, AdAnalysis, ApiUsage
from app.services.google_ai_service import get_default_system_instruction, GoogleAIService
from sqlalchemy import func


router = APIRouter()
logger = logging.getLogger(__name__)


SETTINGS_KEY_GEMINI_SYSTEM_INSTRUCTION = "gemini_system_instruction"
SETTINGS_KEY_GEMINI_API_KEYS = "gemini_api_keys"
SETTINGS_KEY_OPENROUTER_API_KEY = "openrouter_api_key"
SETTINGS_KEY_VEO_ACCESS_TOKEN = "veo_access_token"
SETTINGS_KEY_VEO_SESSION_COOKIE = "veo_session_cookie"
SETTINGS_KEY_VEO_SANDBOX_API_KEY = "veo_sandbox_api_key"
SETTINGS_KEY_AI_MODEL = "ai_model"
SETTINGS_KEY_CACHE_ENABLED = "gemini_cache_enabled"
SETTINGS_KEY_CACHE_TTL_HOURS = "gemini_cache_ttl_hours"


class AISystemInstruction(BaseModel):
    system_instruction: str
    source: str = "db"


class GeminiApiKeys(BaseModel):
    keys: List[str] = []


class GeminiApiKeyTest(BaseModel):
    key: str
    is_valid: bool
    error: Optional[str] = None


class OpenRouterApiKey(BaseModel):
    api_key: str


class AiModelSetting(BaseModel):
    model_name: str


class CacheEnabledSetting(BaseModel):
    enabled: bool


class CacheTTLSetting(BaseModel):
    ttl_hours: int  # Time to live in hours (default: 24)


class KeyUsageStats(BaseModel):
    """Usage statistics for a single API key."""
    key_index: int
    key_preview: str
    total_requests: int
    total_prompt_tokens: int
    total_cached_tokens: int
    total_completion_tokens: int
    total_tokens: int
    estimated_cost_usd: float
    last_used: Optional[str] = None


class AllKeysUsageResponse(BaseModel):
    """Usage statistics for all API keys."""
    keys_stats: List[KeyUsageStats]
    total_requests: int
    total_cost_usd: float


class ModelUsageStats(BaseModel):
    """Usage statistics for a single model."""
    model_name: str
    provider: str
    total_requests: int
    total_prompt_tokens: int
    total_cached_tokens: int
    total_completion_tokens: int
    total_tokens: int
    estimated_cost_usd: float
    last_used: Optional[str] = None


class AllModelsUsageResponse(BaseModel):
    """Usage statistics grouped by model."""
    models_stats: List[ModelUsageStats]
    total_requests: int
    total_cost_usd: float


class VeoToken(BaseModel):
    token: str


class VeoSessionCookie(BaseModel):
    cookie: str


class VeoGenerateRequest(BaseModel):
    prompt: str
    aspect_ratio: Optional[str] = "VIDEO_ASPECT_RATIO_PORTRAIT"
    video_model_key: Optional[str] = "veo_3_1_t2v_portrait"
    seed: Optional[int] = 9831
    timeout_sec: Optional[int] = 600
    poll_interval_sec: Optional[int] = 5


class VeoGenerateResponse(BaseModel):
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    video_url: Optional[str] = None


class VeoCredits(BaseModel):
    credits: int
    userPaygateTier: str


class VeoSandboxApiKey(BaseModel):
    api_key: str


class VeoGenerationCreate(BaseModel):
    model_config = {"protected_namespaces": ()}
    
    ad_id: Optional[int] = None
    prompt: str
    video_url: str
    model_key: str
    aspect_ratio: str
    seed: Optional[int] = None
    generation_metadata: Optional[Dict[str, Any]] = None


class VeoGenerationResponse(BaseModel):
    model_config = {"protected_namespaces": (), "from_attributes": True}
    
    id: int
    ad_id: Optional[int]
    prompt: str
    prompt_hash: Optional[str]
    version_number: int
    is_current: int
    video_url: str
    model_key: str
    aspect_ratio: str
    seed: Optional[int]
    generation_metadata: Optional[Dict[str, Any]]
    created_at: str


class TrimTime(BaseModel):
    startTime: float
    endTime: float


class MergeVideosRequest(BaseModel):
    video_urls: List[str]
    ad_id: Optional[int] = None
    output_filename: Optional[str] = None
    trim_times: Optional[List[TrimTime]] = None


class MergeVideosResponse(BaseModel):
    success: bool
    merge_id: Optional[int] = None
    output_path: Optional[str] = None
    public_url: Optional[str] = None
    system_path: Optional[str] = None
    file_size: Optional[int] = None
    video_count: Optional[int] = None
    error: Optional[str] = None
    message: str


class MergedVideoResponse(BaseModel):
    id: int
    ad_id: Optional[int]
    video_url: str
    file_size: Optional[int]
    clip_count: int
    source_clips: List[str]
    created_at: str
    
    class Config:
        from_attributes = True


@router.get("/ai/system-instruction", response_model=AISystemInstruction)
async def get_ai_system_instruction(db: Session = Depends(get_db)) -> AISystemInstruction:
    setting = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY_GEMINI_SYSTEM_INSTRUCTION).first()
    if setting and setting.value:
        raw = setting.value
        system_instruction = raw
        try:
            loaded = json.loads(raw)
            if isinstance(loaded, dict) and "system_instruction" in loaded:
                system_instruction = str(loaded["system_instruction"])
            elif isinstance(loaded, str):
                system_instruction = loaded
        except Exception:
            system_instruction = raw
        return AISystemInstruction(system_instruction=system_instruction, source="db")
    # No override set yet; expose the built-in default prompt so the UI can prefill it.
    default_value = get_default_system_instruction()
    return AISystemInstruction(system_instruction=default_value, source="default")


@router.put("/ai/system-instruction", response_model=AISystemInstruction)
async def update_ai_system_instruction(payload: AISystemInstruction, db: Session = Depends(get_db)) -> AISystemInstruction:
    value = payload.system_instruction or ""
    try:
        setting = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY_GEMINI_SYSTEM_INSTRUCTION).first()
        json_value = json.dumps({"system_instruction": value})
        if setting is None:
            setting = AppSetting(key=SETTINGS_KEY_GEMINI_SYSTEM_INSTRUCTION, value=json_value)
            db.add(setting)
        else:
            setting.value = json_value
        db.commit()
        db.refresh(setting)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update AI system instruction: {e}")
    return AISystemInstruction(system_instruction=value, source="db")


@router.get("/ai/veo-token", response_model=VeoToken)
async def get_veo_token(db: Session = Depends(get_db)) -> VeoToken:
    setting = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY_VEO_ACCESS_TOKEN).first()
    token = ""
    if setting and setting.value:
        raw = setting.value
        if isinstance(raw, dict):
            value = raw.get("token")
            if isinstance(value, str):
                token = value
            elif value is not None:
                token = str(value)
            else:
                token = json.dumps(raw)
        elif isinstance(raw, str):
            try:
                loaded = json.loads(raw)
                if isinstance(loaded, dict) and "token" in loaded:
                    value = loaded.get("token")
                    if isinstance(value, str):
                        token = value
                    elif value is not None:
                        token = str(value)
                    else:
                        token = raw
                elif isinstance(loaded, str):
                    token = loaded
                else:
                    token = raw
            except Exception:
                token = raw
        else:
            token = str(raw)
    return VeoToken(token=token)


@router.put("/ai/veo-token", response_model=VeoToken)
async def update_veo_token(payload: VeoToken, db: Session = Depends(get_db)) -> VeoToken:
    value = payload.token or ""
    try:
        setting = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY_VEO_ACCESS_TOKEN).first()
        json_value = json.dumps({"token": value})
        if setting is None:
            setting = AppSetting(key=SETTINGS_KEY_VEO_ACCESS_TOKEN, value=json_value)
            db.add(setting)
        else:
            setting.value = json_value
        db.commit()
        db.refresh(setting)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update Veo token: {e}")
    return VeoToken(token=value)


@router.get("/ai/veo-session-cookie", response_model=VeoSessionCookie)
async def get_veo_session_cookie(db: Session = Depends(get_db)) -> VeoSessionCookie:
    setting = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY_VEO_SESSION_COOKIE).first()
    cookie = ""
    if setting and setting.value:
        raw = setting.value
        if isinstance(raw, dict):
            value = raw.get("cookie")
            if isinstance(value, str):
                cookie = value
            elif value is not None:
                cookie = str(value)
            else:
                cookie = json.dumps(raw)
        elif isinstance(raw, str):
            try:
                loaded = json.loads(raw)
                if isinstance(loaded, dict) and "cookie" in loaded:
                    value = loaded.get("cookie")
                    if isinstance(value, str):
                        cookie = value
                    elif value is not None:
                        cookie = str(value)
                    else:
                        cookie = raw
                elif isinstance(loaded, str):
                    cookie = loaded
                else:
                    cookie = raw
            except Exception:
                cookie = raw
        else:
            cookie = str(raw)
    return VeoSessionCookie(cookie=cookie)


@router.put("/ai/veo-session-cookie", response_model=VeoSessionCookie)
async def update_veo_session_cookie(payload: VeoSessionCookie, db: Session = Depends(get_db)) -> VeoSessionCookie:
    value = payload.cookie or ""
    try:
        setting = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY_VEO_SESSION_COOKIE).first()
        json_value = json.dumps({"cookie": value})
        if setting is None:
            setting = AppSetting(key=SETTINGS_KEY_VEO_SESSION_COOKIE, value=json_value)
            db.add(setting)
        else:
            setting.value = json_value
        db.commit()
        db.refresh(setting)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update Veo session cookie: {e}")
    # After saving the session cookie, immediately try to refresh the Veo access token
    # using the Labs session endpoint so upcoming Veo calls have a valid token.
    try:
        service = GoogleAIService()
        token = service._fetch_veo_access_token_via_session()
        if not token:
            raise HTTPException(
                status_code=400,
                detail="Failed to refresh Veo access token from Labs session; please verify the session cookie.",
            )
    except HTTPException:
        # Propagate validation errors as-is
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to refresh Veo access token from Labs session: {e}",
        )

    return VeoSessionCookie(cookie=value)


@router.get("/ai/veo-sandbox-api-key", response_model=VeoSandboxApiKey)
async def get_veo_sandbox_api_key(db: Session = Depends(get_db)) -> VeoSandboxApiKey:
    setting = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY_VEO_SANDBOX_API_KEY).first()
    api_key = ""
    if setting and setting.value:
        raw = setting.value
        if isinstance(raw, dict):
            value = raw.get("api_key")
            if isinstance(value, str):
                api_key = value
            elif value is not None:
                api_key = str(value)
            else:
                api_key = json.dumps(raw)
        elif isinstance(raw, str):
            try:
                loaded = json.loads(raw)
                if isinstance(loaded, dict) and "api_key" in loaded:
                    value = loaded.get("api_key")
                    if isinstance(value, str):
                        api_key = value
                    elif value is not None:
                        api_key = str(value)
                    else:
                        api_key = raw
                elif isinstance(loaded, str):
                    api_key = loaded
                else:
                    api_key = raw
            except Exception:
                api_key = raw
        else:
            api_key = str(raw)
    return VeoSandboxApiKey(api_key=api_key)


@router.put("/ai/veo-sandbox-api-key", response_model=VeoSandboxApiKey)
async def update_veo_sandbox_api_key(payload: VeoSandboxApiKey, db: Session = Depends(get_db)) -> VeoSandboxApiKey:
    value = payload.api_key or ""
    try:
        setting = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY_VEO_SANDBOX_API_KEY).first()
        json_value = json.dumps({"api_key": value})
        if setting is None:
            setting = AppSetting(key=SETTINGS_KEY_VEO_SANDBOX_API_KEY, value=json_value)
            db.add(setting)
        else:
            setting.value = json_value
        db.commit()
        db.refresh(setting)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update Veo sandbox API key: {e}")
    return VeoSandboxApiKey(api_key=value)


@router.post("/ai/veo/generate-video", response_model=VeoGenerateResponse)
async def generate_veo_video(payload: VeoGenerateRequest) -> VeoGenerateResponse:
    """
    DEPRECATED: Use /ai/veo/generate-video-async for better concurrent handling.
    This endpoint blocks until video generation completes.
    """
    try:
        service = GoogleAIService()
        result = service.generate_video_from_prompt(
            prompt=payload.prompt,
            aspect_ratio=payload.aspect_ratio or "VIDEO_ASPECT_RATIO_PORTRAIT",
            video_model_key=payload.video_model_key or "veo_3_1_t2v_portrait",
            seed=payload.seed or 9831,
            timeout_sec=payload.timeout_sec or 600,
            poll_interval_sec=payload.poll_interval_sec or 5,
        )
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
        return VeoGenerateResponse(success=True, result=result, video_url=video_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Veo video: {e}")


class VeoGenerateAsyncRequest(BaseModel):
    """Request model for async video generation."""
    prompt: str
    aspect_ratio: Optional[str] = "VIDEO_ASPECT_RATIO_PORTRAIT"
    video_model_key: Optional[str] = "veo_3_1_t2v_portrait"
    seed: Optional[int] = 9831
    ad_id: Optional[int] = None
    timeout_sec: Optional[int] = 600
    poll_interval_sec: Optional[int] = 5


class VeoGenerateAsyncResponse(BaseModel):
    """Response model for async video generation."""
    success: bool
    task_id: str
    message: str
    estimated_time_seconds: Optional[int] = None


class VeoTaskStatusResponse(BaseModel):
    """Response model for task status polling."""
    task_id: str
    state: str  # PENDING, PROGRESS, SUCCESS, FAILURE
    status: Optional[str] = None  # Human-readable status message
    progress: Optional[int] = None  # 0-100
    result: Optional[Dict[str, Any]] = None  # Final result when SUCCESS
    error: Optional[str] = None  # Error message when FAILURE


@router.post("/ai/veo/generate-video-async", response_model=VeoGenerateAsyncResponse)
async def generate_veo_video_async(payload: VeoGenerateAsyncRequest) -> VeoGenerateAsyncResponse:
    """
    Start async video generation task. Returns immediately with task_id.
    Use /ai/veo/tasks/{task_id}/status to poll for completion.
    
    This allows multiple video generations to run concurrently without blocking.
    """
    try:
        from app.tasks.veo_generation_tasks import generate_veo_video_task
        
        # Dispatch async task
        task = generate_veo_video_task.delay(
            prompt=payload.prompt,
            aspect_ratio=payload.aspect_ratio or "VIDEO_ASPECT_RATIO_PORTRAIT",
            video_model_key=payload.video_model_key or "veo_3_1_t2v_portrait",
            seed=payload.seed or 9831,
            ad_id=payload.ad_id,
            timeout_sec=payload.timeout_sec or 600,
            poll_interval_sec=payload.poll_interval_sec or 5,
        )
        
        logger.info(f"Started async Veo generation task: {task.id}")
        
        return VeoGenerateAsyncResponse(
            success=True,
            task_id=task.id,
            message="Video generation started. Poll /ai/veo/tasks/{task_id}/status for updates.",
            estimated_time_seconds=payload.timeout_sec or 600
        )
        
    except Exception as e:
        logger.error(f"Failed to start async video generation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start video generation: {e}")


@router.get("/ai/veo/tasks/{task_id}/status", response_model=VeoTaskStatusResponse)
async def get_veo_task_status(task_id: str) -> VeoTaskStatusResponse:
    """
    Get the status of an async video generation task.
    
    States:
    - PENDING: Task is queued but not started
    - PROGRESS: Task is running (check progress field)
    - SUCCESS: Task completed (check result field for video_url)
    - FAILURE: Task failed (check error field)
    """
    try:
        from app.celery_worker import celery_app
        
        task_result = celery_app.AsyncResult(task_id)
        
        # Try to get the state - this might fail if backend data is corrupted
        try:
            task_state = task_result.state
        except (ValueError, KeyError) as e:
            # Corrupted task result in backend (likely from old format)
            logger.warning(f"Corrupted task result for {task_id}: {e}. Returning FAILURE state.")
            return VeoTaskStatusResponse(
                task_id=task_id,
                state='FAILURE',
                status='Task result corrupted',
                error=f'Task data is corrupted. Please retry the generation. Error: {str(e)}'
            )
        
        # Check if task exists by checking if it has been seen by any worker
        # PENDING can mean either "not started yet" or "doesn't exist"
        if task_state == 'PENDING':
            # Try to get more info - if result and info are both None, task likely doesn't exist
            if task_result.result is None and task_result.info is None:
                # Check if task was recently created (still in queue)
                return VeoTaskStatusResponse(
                    task_id=task_id,
                    state='PENDING',
                    status='Task is queued and waiting to start',
                    progress=0
                )
            return VeoTaskStatusResponse(
                task_id=task_id,
                state='PENDING',
                status='Task is queued and waiting to start',
                progress=0
            )
        
        elif task_state == 'PROGRESS':
            info = task_result.info or {}
            return VeoTaskStatusResponse(
                task_id=task_id,
                state='PROGRESS',
                status=info.get('status', 'Generating video...'),
                progress=info.get('progress', 50)
            )
        
        elif task_state == 'SUCCESS':
            result = task_result.result or {}
            return VeoTaskStatusResponse(
                task_id=task_id,
                state='SUCCESS',
                status='Video generation completed',
                progress=100,
                result=result
            )
        
        else:  # FAILURE or other error states
            # Handle exception information carefully
            error_msg = 'Unknown error'
            try:
                if isinstance(task_result.info, dict):
                    error_msg = task_result.info.get('error', str(task_result.info))
                elif isinstance(task_result.info, Exception):
                    error_msg = str(task_result.info)
                elif task_result.info is not None:
                    error_msg = str(task_result.info)
            except Exception:
                # If we can't get error info, use traceback if available
                if task_result.traceback:
                    error_msg = f"Task failed. Check logs for details. Task ID: {task_id}"
                    logger.error(f"Task {task_id} traceback: {task_result.traceback}")
            
            return VeoTaskStatusResponse(
                task_id=task_id,
                state='FAILURE',
                status='Video generation failed',
                error=error_msg
            )
        
    except Exception as e:
        logger.error(f"Failed to get task status for {task_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get task status: {e}")


@router.get("/ai/veo/credits", response_model=VeoCredits)
async def get_veo_credits() -> VeoCredits:
    try:
        service = GoogleAIService()
        data = service.get_veo_credits()
        return VeoCredits(credits=int(data.get("credits", 0)), userPaygateTier=str(data.get("userPaygateTier", "")))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Veo credits: {e}")


@router.get("/ai/veo/models")
async def get_veo_models() -> Dict[str, Any]:
    """Fetch available Veo video models from Google Labs API."""
    try:
        service = GoogleAIService()
        data = service.get_veo_models()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Veo models: {e}")


@router.post("/ai/veo/generations", response_model=VeoGenerationResponse)
async def create_veo_generation(payload: VeoGenerationCreate, db: Session = Depends(get_db)) -> VeoGenerationResponse:
    """Save a Veo-generated video with its prompt and settings. Archives previous generations of the same prompt."""
    try:
        # Create hash of prompt for grouping versions
        prompt_hash = hashlib.sha256(payload.prompt.encode()).hexdigest()[:16]
        
        # Find existing generations with same prompt hash and ad_id
        existing = db.query(VeoGeneration).filter(
            VeoGeneration.prompt_hash == prompt_hash,
            VeoGeneration.ad_id == payload.ad_id
        ).all()
        
        # Archive all existing generations (set is_current = 0)
        for gen in existing:
            gen.is_current = 0
        
        # Determine next version number
        version_number = max([g.version_number for g in existing], default=0) + 1
        
        generation = VeoGeneration(
            ad_id=payload.ad_id,
            prompt=payload.prompt,
            prompt_hash=prompt_hash,
            version_number=version_number,
            is_current=1,
            video_url=payload.video_url,
            model_key=payload.model_key,
            aspect_ratio=payload.aspect_ratio,
            seed=payload.seed,
            generation_metadata=payload.generation_metadata,
        )
        db.add(generation)
        db.commit()
        db.refresh(generation)
        return VeoGenerationResponse(
            id=generation.id,
            ad_id=generation.ad_id,
            prompt=generation.prompt,
            prompt_hash=generation.prompt_hash,
            version_number=generation.version_number,
            is_current=generation.is_current,
            video_url=generation.video_url,
            model_key=generation.model_key,
            aspect_ratio=generation.aspect_ratio,
            seed=generation.seed,
            generation_metadata=generation.generation_metadata,
            created_at=generation.created_at.isoformat() if generation.created_at else "",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save Veo generation: {e}")


@router.get("/ai/veo/generations", response_model=List[VeoGenerationResponse])
async def get_veo_generations(
    ad_id: Optional[int] = None,
    include_archived: bool = False,
    db: Session = Depends(get_db)
) -> List[VeoGenerationResponse]:
    """Retrieve Veo generations, optionally filtered by ad_id. By default only returns current versions."""
    try:
        query = db.query(VeoGeneration)
        if ad_id is not None:
            query = query.filter(VeoGeneration.ad_id == ad_id)
        if not include_archived:
            query = query.filter(VeoGeneration.is_current == 1)
        generations = query.order_by(VeoGeneration.created_at.desc()).all()
        logger.info(f"Retrieved {len(generations)} generations for ad_id={ad_id}, include_archived={include_archived}")
        return [
            VeoGenerationResponse(
                id=g.id,
                ad_id=g.ad_id,
                prompt=g.prompt,
                prompt_hash=g.prompt_hash,
                version_number=g.version_number,
                is_current=g.is_current,
                video_url=g.video_url,
                model_key=g.model_key,
                aspect_ratio=g.aspect_ratio,
                seed=g.seed,
                generation_metadata=g.generation_metadata,
                created_at=g.created_at.isoformat() if g.created_at else "",
            )
            for g in generations
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve Veo generations: {e}")


@router.post("/ai/veo/merge-videos", response_model=MergeVideosResponse)
async def merge_veo_videos(payload: MergeVideosRequest, db: Session = Depends(get_db)) -> MergeVideosResponse:
    """Merge multiple Veo video clips into one full video and save to database."""
    try:
        from app.services.video_merge_service import VideoMergeService
        
        if not payload.video_urls or len(payload.video_urls) < 2:
            raise HTTPException(
                status_code=400,
                detail="Need at least 2 video URLs to merge"
            )
        
        logger.info(f"Merging {len(payload.video_urls)} Veo clips...")
        
        merge_service = VideoMergeService()
        
        # Convert trim_times to dict format if provided
        trim_times_dict = None
        if payload.trim_times:
            trim_times_dict = [{'startTime': t.startTime, 'endTime': t.endTime} for t in payload.trim_times]
        
        result = merge_service.merge_videos(
            video_urls=payload.video_urls,
            output_filename=payload.output_filename,
            trim_times=trim_times_dict
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=500,
                detail=result.get('error', 'Failed to merge videos')
            )
        
        # Save to database
        merged_video = MergedVideo(
            ad_id=payload.ad_id,
            video_url=result.get('public_url'),
            file_path=result.get('output_path'),
            file_size=result.get('file_size'),
            clip_count=len(payload.video_urls),
            source_clips=payload.video_urls,
        )
        db.add(merged_video)
        db.commit()
        db.refresh(merged_video)
        
        return MergeVideosResponse(
            success=True,
            merge_id=merged_video.id,
            output_path=result.get('output_path'),
            public_url=result.get('public_url'),
            system_path=result.get('system_path'),
            file_size=result.get('file_size'),
            video_count=result.get('video_count'),
            message=f"Successfully merged {result.get('video_count')} videos"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to merge Veo videos: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to merge videos: {e}")


@router.post("/ai/download-instagram-preview")
async def download_instagram_preview(payload: dict, db: Session = Depends(get_db)):
    """Download Instagram video with audio for preview."""
    try:
        import subprocess
        from pathlib import Path
        from datetime import datetime
        
        logger.info(f"Download Instagram preview request: {payload}")
        
        instagram_url = payload.get('url')
        
        if not instagram_url:
            raise HTTPException(status_code=400, detail="No Instagram URL provided")
        
        # Create preview folder
        preview_folder = Path("media/downloads/instagram_preview")
        preview_folder.mkdir(parents=True, exist_ok=True)
        
        # Generate filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_filename = f"instagram_{timestamp}.mp4"
        output_path = preview_folder / output_filename
        
        # Download using yt-dlp with audio merged
        try:
            cmd = [
                'yt-dlp',
                '-f', 'bestvideo+bestaudio/best',
                '--merge-output-format', 'mp4',
                '--no-cache-dir',
                '--force-overwrites',
                '-o', str(output_path),
                '--no-playlist',
                instagram_url
            ]
            logger.info(f"Running command: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            
            if result.returncode != 0:
                logger.error(f"yt-dlp error: {result.stderr}")
                raise HTTPException(status_code=500, detail=f"Failed to download Instagram video: {result.stderr}")
            
            # Check if file exists and has content
            if not output_path.exists() or output_path.stat().st_size == 0:
                raise HTTPException(status_code=500, detail="Downloaded video file is empty")
            
            file_size_mb = output_path.stat().st_size / (1024 * 1024)
            logger.info(f"Downloaded Instagram preview: {output_filename} ({file_size_mb:.2f} MB)")
            
            return {
                "success": True,
                "preview_url": f"/media/downloads/instagram_preview/{output_filename}",
                "file_size_mb": round(file_size_mb, 2),
                "filename": output_filename
            }
            
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=500, detail="Download timeout")
        except Exception as e:
            logger.error(f"Failed to download Instagram preview: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to download: {str(e)}")
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Failed to download Instagram preview: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/get-instagram-video-url")
async def get_instagram_video_url(payload: dict, db: Session = Depends(get_db)):
    """Extract Instagram video URL without downloading."""
    try:
        import subprocess
        import json
        
        logger.info(f"Get Instagram video URL request: {payload}")
        
        instagram_url = payload.get('url')
        
        if not instagram_url:
            raise HTTPException(status_code=400, detail="No Instagram URL provided")
        
        # Use yt-dlp to extract video info (JSON only, no download)
        try:
            cmd = [
                'yt-dlp',
                '-j',  # Output JSON only, no download
                '--no-playlist',
                instagram_url
            ]
            logger.info(f"Running command: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode != 0:
                logger.error(f"yt-dlp error: {result.stderr}")
                raise HTTPException(status_code=500, detail=f"Failed to extract Instagram info: {result.stderr}")
            
            # Parse JSON output
            video_info = json.loads(result.stdout)
            
            logger.info(f"Video info keys: {list(video_info.keys())}")
            
            # Get video URL from formats (Instagram returns formats array)
            video_url = None
            if 'formats' in video_info:
                formats = video_info.get('formats', [])
                # Find format with both video and audio
                for fmt in reversed(formats):  # Start from best quality
                    has_video = fmt.get('vcodec') and fmt.get('vcodec') != 'none'
                    has_audio = fmt.get('acodec') and fmt.get('acodec') != 'none'
                    if has_video and has_audio and fmt.get('url'):
                        video_url = fmt.get('url')
                        logger.info(f"Selected format with audio: {fmt.get('format_id')} - {fmt.get('format_note')}")
                        break
                
                # If no format with both, try video-only
                if not video_url:
                    for fmt in reversed(formats):
                        if fmt.get('vcodec') != 'none' and fmt.get('url'):
                            video_url = fmt.get('url')
                            logger.info(f"Selected video-only format: {fmt.get('format_id')} - {fmt.get('format_note')}")
                            break
            
            # Fallback to requested_formats if available
            if not video_url and 'requested_formats' in video_info:
                requested = video_info.get('requested_formats', [])
                if requested and requested[0].get('url'):
                    video_url = requested[0].get('url')
            
            thumbnail = video_info.get('thumbnail')
            title = video_info.get('title', 'Instagram Reel')
            duration = video_info.get('duration')
            
            if not video_url:
                logger.error(f"No video URL found in: {video_info}")
                raise HTTPException(status_code=500, detail="Could not extract video URL from Instagram")
            
            logger.info(f"Extracted - Video: {video_url[:100] if video_url else 'None'}..., Thumbnail: {thumbnail}")
            
            return {
                "success": True,
                "video_url": video_url,
                "thumbnail": thumbnail,
                "title": title,
                "duration": duration,
                "instagram_url": instagram_url
            }
            
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=500, detail="Extraction timeout")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse yt-dlp output: {e}")
            raise HTTPException(status_code=500, detail="Failed to parse video info")
        except Exception as e:
            logger.error(f"Failed to extract Instagram info: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to extract: {str(e)}")
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Failed to download Instagram Reel: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/veo/download-clips")
async def download_clips(payload: dict, db: Session = Depends(get_db)):
    """Download multiple video clips to a local folder organized by ad_id."""
    try:
        import requests
        from pathlib import Path
        from datetime import datetime
        
        logger.info(f"Download clips request: {payload}")
        
        video_urls = payload.get('video_urls', [])
        ad_id = payload.get('ad_id')
        clip_metadata = payload.get('clip_metadata', [])  # List of {prompt_name, version}
        
        if not video_urls:
            logger.error("No video URLs provided")
            raise HTTPException(status_code=400, detail="No video URLs provided")
        
        logger.info(f"Downloading {len(video_urls)} clips for ad_id: {ad_id}")
        
        # Get ad info if ad_id provided
        ad_name = "unknown_ad"
        if ad_id:
            from app.models.ad import Ad
            ad = db.query(Ad).filter(Ad.id == ad_id).first()
            if ad:
                # Use competitor name + ad_archive_id for folder name
                if ad.competitor and ad.competitor.name:
                    competitor_name = ad.competitor.name.replace(' ', '_').replace('/', '_')[:30]
                    ad_name = f"{competitor_name}_ad_{ad.ad_archive_id[:10]}"
                else:
                    ad_name = f"ad_{ad.ad_archive_id[:10]}"
            else:
                ad_name = f"ad_{ad_id}"
        
        logger.info(f"Using folder name: {ad_name}")
        
        # Use single folder per ad (no versioning)
        download_folder = Path(f"media/downloads/{ad_name}")
        download_folder.mkdir(parents=True, exist_ok=True)
        
        # Load previous URLs from metadata
        metadata_file = download_folder / "metadata.json"
        previous_urls = {}
        
        if metadata_file.exists():
            import json
            try:
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                    previous_urls = metadata.get('video_urls_by_index', {})
                    
                    # Check if exact same URLs
                    if previous_urls == {str(i): url for i, url in enumerate(video_urls, 1)}:
                        logger.info(f"All URLs already downloaded, reusing folder: {download_folder}")
                        abs_folder_path = str(download_folder.absolute())
                        
                        # Convert container path to host path for Windows
                        import os
                        host_path = abs_folder_path
                        if abs_folder_path.startswith('/app/'):
                            relative_path = abs_folder_path[5:]
                            host_base = os.environ.get('HOST_PROJECT_PATH', 'C:/Users/ASUS/Documents/coding area/ads/backend')
                            host_path = os.path.join(host_base, relative_path).replace('/', '\\')
                        
                        existing_clips_list = list(download_folder.glob("clip_*.mp4"))
                        
                        return {
                            "success": True,
                            "folder_path": host_path,
                            "ad_name": ad_name,
                            "downloaded_count": len(video_urls),
                            "total_count": len(video_urls),
                            "files": [str(f) for f in existing_clips_list],
                            "reused": True
                        }
            except Exception as e:
                logger.warning(f"Failed to read metadata: {e}")
        
        logger.info(f"Using folder: {download_folder}")
        
        downloaded_files = []
        
        # Download each video
        import hashlib
        import re
        for i, url in enumerate(video_urls, 1):
            try:
                # Get metadata for this clip
                metadata = clip_metadata[i-1] if i-1 < len(clip_metadata) else {}
                prompt_name = metadata.get('prompt_name', f'Prompt_{i}')
                version = metadata.get('version', 1)
                
                # Clean prompt name for filename
                clean_prompt = re.sub(r'[^\w\s-]', '', prompt_name).strip().replace(' ', '_')[:30]
                
                # Create filename with URL hash to track which URL it came from
                url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
                filename = f"{clean_prompt}_v{version}_{url_hash}.mp4"
                file_path = download_folder / filename
                
                # Simple check: if file exists, skip download
                if file_path.exists():
                    file_size = file_path.stat().st_size
                    logger.info(f"Clip {i} already exists ({file_size} bytes), skipping download")
                    downloaded_files.append(str(file_path))
                    continue
                
                # Download clip
                logger.info(f"Downloading clip {i}/{len(video_urls)} from {url}")
                response = requests.get(url, timeout=60)
                response.raise_for_status()
                
                with open(file_path, 'wb') as f:
                    f.write(response.content)
                
                downloaded_files.append(str(file_path))
                logger.info(f"Downloaded {filename} ({len(response.content)} bytes)")
                
            except Exception as e:
                logger.error(f"Failed to download clip {i}: {e}")
                continue
        
        abs_folder_path = str(download_folder.absolute())
        
        # Save metadata file with URLs for future reference
        metadata_file = download_folder / "metadata.json"
        import json
        metadata = {
            "video_urls_by_index": {str(i): url for i, url in enumerate(video_urls, 1)},
            "downloaded_at": datetime.now().isoformat(),
            "ad_id": ad_id,
            "ad_name": ad_name
        }
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        logger.info(f"Saved metadata to {metadata_file}")
        
        # Convert container path to host path for Windows
        # Container path: /app/media/downloads/...
        # Host path: C:\Users\ASUS\Documents\coding area\ads\backend\media\downloads\...
        import os
        host_path = abs_folder_path
        if abs_folder_path.startswith('/app/'):
            # Get the relative path from /app/
            relative_path = abs_folder_path[5:]  # Remove '/app/'
            # Get the current working directory on host (from environment or default)
            host_base = os.environ.get('HOST_PROJECT_PATH', 'C:/Users/ASUS/Documents/coding area/ads/backend')
            host_path = os.path.join(host_base, relative_path).replace('/', '\\')
        
        logger.info(f"Container path: {abs_folder_path}, Host path: {host_path}")
        
        return {
            "success": True,
            "folder_path": host_path,
            "ad_name": ad_name,
            "downloaded_count": len(downloaded_files),
            "total_count": len(video_urls),
            "files": downloaded_files
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Failed to download clips: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to download clips: {str(e)}")


@router.get("/ai/veo/merged-videos", response_model=List[MergedVideoResponse])
async def get_merged_videos(ad_id: Optional[int] = None, db: Session = Depends(get_db)) -> List[MergedVideoResponse]:
    """Retrieve merged video history, optionally filtered by ad_id."""
    try:
        query = db.query(MergedVideo)
        if ad_id is not None:
            query = query.filter(MergedVideo.ad_id == ad_id)
        merged_videos = query.order_by(MergedVideo.created_at.desc()).all()
        return [
            MergedVideoResponse(
                id=m.id,
                ad_id=m.ad_id,
                video_url=m.video_url,
                file_size=m.file_size,
                clip_count=m.clip_count,
                source_clips=m.source_clips,
                created_at=m.created_at.isoformat() if m.created_at else "",
            )
            for m in merged_videos
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve merged videos: {e}")


# ========================================
# Gemini API Keys Management
# ========================================

@router.get("/ai/gemini-api-keys", response_model=GeminiApiKeys)
async def get_gemini_api_keys(db: Session = Depends(get_db)) -> GeminiApiKeys:
    """Get all configured Gemini API keys."""
    setting = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY_GEMINI_API_KEYS).first()
    keys = []
    if setting and setting.value:
        try:
            raw = setting.value
            if isinstance(raw, str):
                data = json.loads(raw)
            else:
                data = raw
            keys = data if isinstance(data, list) else []
        except Exception as e:
            logger.error(f"Failed to parse gemini_api_keys: {e}")
    return GeminiApiKeys(keys=keys)


@router.put("/ai/gemini-api-keys", response_model=GeminiApiKeys)
async def update_gemini_api_keys(payload: GeminiApiKeys, db: Session = Depends(get_db)) -> GeminiApiKeys:
    """Update Gemini API keys list."""
    try:
        setting = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY_GEMINI_API_KEYS).first()
        json_value = json.dumps(payload.keys)
        if setting is None:
            setting = AppSetting(key=SETTINGS_KEY_GEMINI_API_KEYS, value=json_value)
            db.add(setting)
        else:
            setting.value = json_value
        db.commit()
        logger.info(f"Updated gemini_api_keys with {len(payload.keys)} key(s)")
        return payload
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update API keys: {e}")


@router.post("/ai/gemini-api-keys/test", response_model=GeminiApiKeyTest)
async def test_gemini_api_key(payload: dict) -> GeminiApiKeyTest:
    """Test if a Gemini API key is valid."""
    key = payload.get("key", "")
    if not key:
        return GeminiApiKeyTest(key=key, is_valid=False, error="API key is empty")
    
    try:
        # Try a simple API call to test the key
        import requests
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
        test_payload = {
            "contents": [{"role": "user", "parts": [{"text": "test"}]}],
            "generation_config": {"temperature": 0.1}
        }
        resp = requests.post(url, params={"key": key}, json=test_payload, timeout=10)
        
        if resp.status_code == 200:
            return GeminiApiKeyTest(key=key, is_valid=True)
        elif resp.status_code == 400:
            # 400 means key is valid but request format issue - that's OK for our test
            return GeminiApiKeyTest(key=key, is_valid=True)
        elif resp.status_code == 403:
            return GeminiApiKeyTest(key=key, is_valid=False, error="API key is invalid or doesn't have permission")
        elif resp.status_code == 429:
            return GeminiApiKeyTest(key=key, is_valid=True, error="API key is valid but rate limited")
        elif resp.status_code == 503:
            return GeminiApiKeyTest(key=key, is_valid=True, error="API key is valid but service temporarily unavailable")
        else:
            return GeminiApiKeyTest(key=key, is_valid=False, error=f"HTTP {resp.status_code}: {resp.text[:100]}")
    except Exception as e:
        return GeminiApiKeyTest(key=key, is_valid=False, error=str(e))


# ========================================
# OpenRouter API Key Management
# ========================================

@router.get("/ai/openrouter-api-key", response_model=OpenRouterApiKey)
async def get_openrouter_api_key(db: Session = Depends(get_db)) -> OpenRouterApiKey:
    """Get OpenRouter API key."""
    setting = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY_OPENROUTER_API_KEY).first()
    api_key = ""
    if setting and setting.value:
        try:
            raw = setting.value
            if isinstance(raw, str):
                data = json.loads(raw)
            else:
                data = raw
            api_key = data.get("api_key", "") if isinstance(data, dict) else ""
        except Exception as e:
            logger.error(f"Failed to parse openrouter_api_key: {e}")
    return OpenRouterApiKey(api_key=api_key)


@router.put("/ai/openrouter-api-key", response_model=OpenRouterApiKey)
async def update_openrouter_api_key(payload: OpenRouterApiKey, db: Session = Depends(get_db)) -> OpenRouterApiKey:
    """Update OpenRouter API key."""
    try:
        setting = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY_OPENROUTER_API_KEY).first()
        json_value = json.dumps({"api_key": payload.api_key})
        if setting is None:
            setting = AppSetting(key=SETTINGS_KEY_OPENROUTER_API_KEY, value=json_value)
            db.add(setting)
        else:
            setting.value = json_value
        db.commit()
        logger.info(f"Updated openrouter_api_key")
        return payload
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update OpenRouter API key: {e}")


@router.get("/ai/model", response_model=AiModelSetting)
async def get_ai_model(db: Session = Depends(get_db)) -> AiModelSetting:
    """Get the default AI model used for analysis (e.g. gemini-2.5-flash-lite)."""
    setting = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY_AI_MODEL).first()
    default_model = "gemini-2.5-flash-lite"
    model_name = default_model
    if setting and setting.value:
        raw = setting.value
        try:
            if isinstance(raw, str):
                data = json.loads(raw)
            else:
                data = raw
            if isinstance(data, dict):
                val = data.get("model_name") or data.get("model") or data.get("value")
                if isinstance(val, str) and val.strip():
                    model_name = val.strip()
            elif isinstance(raw, str) and raw.strip():
                model_name = raw.strip()
        except Exception:
            if isinstance(raw, str) and raw.strip():
                model_name = raw.strip()
    return AiModelSetting(model_name=model_name)


@router.put("/ai/model", response_model=AiModelSetting)
async def update_ai_model(payload: AiModelSetting, db: Session = Depends(get_db)) -> AiModelSetting:
    """Update the default AI model used for analysis."""
    value = payload.model_name.strip() or "gemini-2.5-flash-lite"
    try:
        setting = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY_AI_MODEL).first()
        json_value = json.dumps({"model_name": value})
        if setting is None:
            setting = AppSetting(key=SETTINGS_KEY_AI_MODEL, value=json_value)
            db.add(setting)
        else:
            setting.value = json_value
        db.commit()
        db.refresh(setting)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update AI model: {e}")
    return AiModelSetting(model_name=value)


@router.get("/ai/cache-enabled", response_model=CacheEnabledSetting)
async def get_cache_enabled(db: Session = Depends(get_db)) -> CacheEnabledSetting:
    """Get whether Gemini caching is enabled (default: True)."""
    setting = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY_CACHE_ENABLED).first()
    enabled = True  # Default to enabled
    if setting and setting.value:
        try:
            raw = setting.value
            if isinstance(raw, str):
                data = json.loads(raw)
            else:
                data = raw
            if isinstance(data, dict):
                enabled = bool(data.get("enabled", True))
            elif isinstance(data, bool):
                enabled = data
        except Exception as e:
            logger.error(f"Failed to parse cache_enabled: {e}")
    return CacheEnabledSetting(enabled=enabled)


@router.put("/ai/cache-enabled", response_model=CacheEnabledSetting)
async def update_cache_enabled(payload: CacheEnabledSetting, db: Session = Depends(get_db)) -> CacheEnabledSetting:
    """Enable or disable Gemini caching system."""
    try:
        setting = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY_CACHE_ENABLED).first()
        json_value = json.dumps({"enabled": payload.enabled})
        if setting is None:
            setting = AppSetting(key=SETTINGS_KEY_CACHE_ENABLED, value=json_value)
            db.add(setting)
        else:
            setting.value = json_value
        db.commit()
        db.refresh(setting)
        logger.info(f"Updated cache_enabled to {payload.enabled}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update cache setting: {e}")
    return CacheEnabledSetting(enabled=payload.enabled)


@router.get("/ai/cache-ttl", response_model=CacheTTLSetting)
async def get_cache_ttl(db: Session = Depends(get_db)) -> CacheTTLSetting:
    """Get cache TTL in hours (default: 24 hours)."""
    setting = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY_CACHE_TTL_HOURS).first()
    ttl_hours = 24  # Default to 24 hours
    if setting and setting.value:
        try:
            raw = setting.value
            if isinstance(raw, str):
                data = json.loads(raw)
            else:
                data = raw
            if isinstance(data, dict):
                ttl_hours = int(data.get("ttl_hours", 24))
            elif isinstance(data, int):
                ttl_hours = data
        except Exception as e:
            logger.error(f"Failed to parse cache_ttl_hours: {e}")
    return CacheTTLSetting(ttl_hours=ttl_hours)


@router.put("/ai/cache-ttl", response_model=CacheTTLSetting)
async def update_cache_ttl(payload: CacheTTLSetting, db: Session = Depends(get_db)) -> CacheTTLSetting:
    """Update cache TTL in hours. Valid range: 1-720 hours (1 hour to 30 days)."""
    # Validate TTL range
    if payload.ttl_hours < 1 or payload.ttl_hours > 720:
        raise HTTPException(
            status_code=400, 
            detail="Cache TTL must be between 1 and 720 hours (30 days)"
        )
    
    try:
        setting = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY_CACHE_TTL_HOURS).first()
        json_value = json.dumps({"ttl_hours": payload.ttl_hours})
        if setting is None:
            setting = AppSetting(key=SETTINGS_KEY_CACHE_TTL_HOURS, value=json_value)
            db.add(setting)
        else:
            setting.value = json_value
        db.commit()
        db.refresh(setting)
        logger.info(f"Updated cache_ttl_hours to {payload.ttl_hours}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update cache TTL: {e}")
    return CacheTTLSetting(ttl_hours=payload.ttl_hours)


@router.get("/ai/usage-by-model", response_model=AllModelsUsageResponse)
async def get_usage_by_model(db: Session = Depends(get_db)) -> AllModelsUsageResponse:
    """Get real-time usage statistics grouped by model from ApiUsage table.
    
    This provides accurate, up-to-date usage tracking that's logged after every API call.
    """
    try:
        # Query aggregated usage by model
        results = db.query(
            ApiUsage.model_name,
            ApiUsage.provider,
            func.count(ApiUsage.id).label("total_requests"),
            func.sum(ApiUsage.prompt_tokens).label("total_prompt_tokens"),
            func.sum(ApiUsage.cached_tokens).label("total_cached_tokens"),
            func.sum(ApiUsage.completion_tokens).label("total_completion_tokens"),
            func.sum(ApiUsage.total_tokens).label("total_tokens"),
            func.sum(ApiUsage.estimated_cost_usd).label("estimated_cost_usd"),
            func.max(ApiUsage.created_at).label("last_used")
        ).group_by(
            ApiUsage.model_name,
            ApiUsage.provider
        ).all()
        
        models_stats = []
        total_requests_all = 0
        total_cost_all = 0.0
        
        for row in results:
            models_stats.append(ModelUsageStats(
                model_name=row.model_name,
                provider=row.provider,
                total_requests=row.total_requests or 0,
                total_prompt_tokens=row.total_prompt_tokens or 0,
                total_cached_tokens=row.total_cached_tokens or 0,
                total_completion_tokens=row.total_completion_tokens or 0,
                total_tokens=row.total_tokens or 0,
                estimated_cost_usd=round(row.estimated_cost_usd or 0.0, 6),
                last_used=row.last_used.isoformat() if row.last_used else None
            ))
            total_requests_all += row.total_requests or 0
            total_cost_all += row.estimated_cost_usd or 0.0
        
        # Sort by cost descending
        models_stats.sort(key=lambda x: x.estimated_cost_usd, reverse=True)
        
        return AllModelsUsageResponse(
            models_stats=models_stats,
            total_requests=total_requests_all,
            total_cost_usd=round(total_cost_all, 6)
        )
        
    except Exception as e:
        logger.error(f"Failed to get usage by model: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get usage stats: {e}")


@router.get("/ai/gemini-usage", response_model=AllKeysUsageResponse)
async def get_gemini_usage(db: Session = Depends(get_db)) -> AllKeysUsageResponse:
    """Get usage statistics and estimated billing for each Gemini API key.
    
    Analyzes historical usage from AdAnalysis records to calculate:
    - Total requests per key
    - Token usage (prompt, cached, completion)
    - Estimated costs based on current pricing
    """
    try:
        # Get API keys
        gemini_keys = _get_gemini_api_keys_list(db)
        if not gemini_keys:
            return AllKeysUsageResponse(keys_stats=[], total_requests=0, total_cost_usd=0.0)
        
        # Gemini pricing per 1M tokens (USD)
        # Source: https://ai.google.dev/gemini-api/docs/pricing
        pricing = {
            "gemini-2.5-flash-lite": {"prompt": 0.10, "cached_prompt": 0.01, "completion": 0.40},
            "gemini-2.0-flash": {"prompt": 0.10, "cached_prompt": 0.025, "completion": 0.40},
            "gemini-2.0-flash-001": {"prompt": 0.10, "cached_prompt": 0.025, "completion": 0.40},
        }
        default_pricing = {"prompt": 0.10, "cached_prompt": 0.025, "completion": 0.40}
        
        keys_stats = []
        total_requests_all = 0
        total_cost_all = 0.0
        
        for key_idx in range(len(gemini_keys)):
            # Query all analyses that used this key
            analyses = db.query(AdAnalysis).filter(
                AdAnalysis.raw_ai_response != None
            ).all()
            
            total_requests = 0
            total_prompt_tokens = 0
            total_cached_tokens = 0
            total_completion_tokens = 0
            last_used_dt = None
            
            for analysis in analyses:
                try:
                    raw = analysis.raw_ai_response
                    if isinstance(raw, str):
                        data = json.loads(raw)
                    elif isinstance(raw, dict):
                        data = raw
                    else:
                        continue
                    
                    # Check if this analysis used this key
                    used_key_idx = data.get("gemini_api_key_index")
                    if used_key_idx != key_idx:
                        continue
                    
                    total_requests += 1
                    
                    # Extract token usage
                    usage = data.get("usage_metadata", {})
                    prompt_tokens = usage.get("prompt_token_count", 0) or usage.get("promptTokenCount", 0)
                    cached_tokens = usage.get("cached_content_token_count", 0) or usage.get("cachedContentTokenCount", 0)
                    completion_tokens = usage.get("candidates_token_count", 0) or usage.get("candidatesTokenCount", 0)
                    
                    total_prompt_tokens += prompt_tokens
                    total_cached_tokens += cached_tokens
                    total_completion_tokens += completion_tokens
                    
                    # Track last used
                    if analysis.created_at:
                        if last_used_dt is None or analysis.created_at > last_used_dt:
                            last_used_dt = analysis.created_at
                    
                except Exception as e:
                    logger.warning(f"Failed to parse analysis {analysis.id}: {e}")
                    continue
            
            # Calculate estimated cost
            # Use default pricing for simplicity (could be enhanced to detect model from raw_ai_response)
            prompt_cost = (total_prompt_tokens / 1_000_000) * default_pricing["prompt"]
            cached_cost = (total_cached_tokens / 1_000_000) * default_pricing["cached_prompt"]
            completion_cost = (total_completion_tokens / 1_000_000) * default_pricing["completion"]
            estimated_cost = prompt_cost + cached_cost + completion_cost
            
            total_tokens = total_prompt_tokens + total_cached_tokens + total_completion_tokens
            
            # Mask key for security
            key_preview = gemini_keys[key_idx][:8] + "..." + gemini_keys[key_idx][-4:] if len(gemini_keys[key_idx]) > 12 else "***"
            
            keys_stats.append(KeyUsageStats(
                key_index=key_idx,
                key_preview=key_preview,
                total_requests=total_requests,
                total_prompt_tokens=total_prompt_tokens,
                total_cached_tokens=total_cached_tokens,
                total_completion_tokens=total_completion_tokens,
                total_tokens=total_tokens,
                estimated_cost_usd=round(estimated_cost, 4),
                last_used=last_used_dt.isoformat() if last_used_dt else None
            ))
            
            total_requests_all += total_requests
            total_cost_all += estimated_cost
        
        return AllKeysUsageResponse(
            keys_stats=keys_stats,
            total_requests=total_requests_all,
            total_cost_usd=round(total_cost_all, 4)
        )
        
    except Exception as e:
        logger.error(f"Failed to get Gemini usage stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get usage stats: {e}")


# ========================================
# Gemini Cache Management
# ========================================

class CacheInfo(BaseModel):
    """Information about a single cache."""
    cache_name: str
    expire_time: Optional[str] = None
    model: Optional[str] = None
    display_name: Optional[str] = None


class CacheStats(BaseModel):
    """Cache statistics for a single API key."""
    key_index: int
    key_preview: str
    cache_count: int
    caches: List[CacheInfo] = []
    error: Optional[str] = None


class AllCachesResponse(BaseModel):
    """Response containing cache info for all API keys."""
    total_caches: int
    keys_stats: List[CacheStats]


class DeleteCachesResponse(BaseModel):
    """Response after deleting caches."""
    success: bool
    deleted_count: int
    failed_count: int
    cleared_db_metadata: int
    message: str


def _list_caches_for_key(api_key: str) -> List[Dict[str, Any]]:
    """List all caches for a given API key."""
    url = "https://generativelanguage.googleapis.com/v1beta/cachedContents"
    try:
        resp = requests.get(url, params={"key": api_key}, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            return data.get("cachedContents", [])
        else:
            logger.warning(f"Failed to list caches: HTTP {resp.status_code}")
            return []
    except Exception as e:
        logger.error(f"Error listing caches: {e}")
        return []


def _delete_cache(cache_name: str, api_key: str) -> bool:
    """Delete a single cache."""
    url = f"https://generativelanguage.googleapis.com/v1beta/{cache_name}"
    try:
        resp = requests.delete(url, params={"key": api_key}, timeout=30)
        if resp.status_code in [200, 204]:
            logger.info(f"Deleted cache: {cache_name}")
            return True
        else:
            logger.warning(f"Failed to delete {cache_name}: HTTP {resp.status_code}")
            return False
    except Exception as e:
        logger.error(f"Error deleting {cache_name}: {e}")
        return False


def _clear_cache_metadata_from_db(db: Session) -> int:
    """Remove cache metadata from all stored analyses to prevent reuse."""
    try:
        analyses = db.query(AdAnalysis).all()
        updated_count = 0
        
        for analysis in analyses:
            if analysis.raw_ai_response:
                try:
                    raw = json.loads(analysis.raw_ai_response) if isinstance(analysis.raw_ai_response, str) else analysis.raw_ai_response
                    if isinstance(raw, dict):
                        changed = False
                        if "gemini_cache_name" in raw:
                            del raw["gemini_cache_name"]
                            changed = True
                        if "gemini_cache_expire_time" in raw:
                            del raw["gemini_cache_expire_time"]
                            changed = True
                        
                        if changed:
                            analysis.raw_ai_response = json.dumps(raw)
                            updated_count += 1
                except Exception as e:
                    logger.warning(f"Failed to process analysis {analysis.id}: {e}")
        
        if updated_count > 0:
            db.commit()
            logger.info(f"Cleared cache metadata from {updated_count} analyses")
        
        return updated_count
    except Exception as e:
        logger.error(f"Failed to clear database metadata: {e}")
        db.rollback()
        return 0


def _get_gemini_api_keys_list(db: Session) -> List[str]:
    """Load Gemini API keys from database."""
    setting = db.query(AppSetting).filter(AppSetting.key == SETTINGS_KEY_GEMINI_API_KEYS).first()
    keys = []
    if setting and setting.value:
        try:
            raw = setting.value
            if isinstance(raw, str):
                data = json.loads(raw)
            else:
                data = raw
            keys = data if isinstance(data, list) else []
        except Exception as e:
            logger.error(f"Failed to parse gemini_api_keys: {e}")
    return keys


@router.get("/ai/gemini-caches", response_model=AllCachesResponse)
async def get_all_gemini_caches(db: Session = Depends(get_db)) -> AllCachesResponse:
    """Get information about all Gemini caches across all API keys."""
    api_keys = _get_gemini_api_keys_list(db)
    
    if not api_keys:
        return AllCachesResponse(total_caches=0, keys_stats=[])
    
    keys_stats = []
    total_caches = 0
    
    for i, key in enumerate(api_keys, 1):
        key_preview = f"{key[:8]}****...****{key[-8:]}" if len(key) > 16 else key
        
        try:
            caches_raw = _list_caches_for_key(key)
            cache_infos = []
            
            for cache in caches_raw:
                cache_infos.append(CacheInfo(
                    cache_name=cache.get("name", ""),
                    expire_time=cache.get("expireTime"),
                    model=cache.get("model"),
                    display_name=cache.get("displayName")
                ))
            
            keys_stats.append(CacheStats(
                key_index=i,
                key_preview=key_preview,
                cache_count=len(cache_infos),
                caches=cache_infos
            ))
            total_caches += len(cache_infos)
            
        except Exception as e:
            logger.error(f"Failed to get caches for key #{i}: {e}")
            keys_stats.append(CacheStats(
                key_index=i,
                key_preview=key_preview,
                cache_count=0,
                caches=[],
                error=str(e)
            ))
    
    return AllCachesResponse(total_caches=total_caches, keys_stats=keys_stats)


@router.delete("/ai/gemini-caches", response_model=DeleteCachesResponse)
async def delete_all_gemini_caches(db: Session = Depends(get_db)) -> DeleteCachesResponse:
    """Delete ALL Gemini caches across all API keys and clear database metadata."""
    api_keys = _get_gemini_api_keys_list(db)
    
    if not api_keys:
        raise HTTPException(status_code=400, detail="No Gemini API keys configured")
    
    deleted_count = 0
    failed_count = 0
    
    # Delete all caches for each key
    for i, key in enumerate(api_keys, 1):
        logger.info(f"Processing API Key #{i}")
        caches = _list_caches_for_key(key)
        
        for cache in caches:
            cache_name = cache.get("name", "")
            if cache_name:
                if _delete_cache(cache_name, key):
                    deleted_count += 1
                else:
                    failed_count += 1
    
    # Clear metadata from database
    cleared_db_metadata = _clear_cache_metadata_from_db(db)
    
    return DeleteCachesResponse(
        success=True,
        deleted_count=deleted_count,
        failed_count=failed_count,
        cleared_db_metadata=cleared_db_metadata,
        message=f"Deleted {deleted_count} cache(s), cleared metadata from {cleared_db_metadata} analysis records"
    )
