import json
import os
import sys
import time
from typing import Dict, Any

# Ensure project root on path
PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.app.services.openrouter_service import OpenRouterService  # type: ignore
from backend.app.database import SessionLocal  # type: ignore
from backend.app.models import AppSetting  # type: ignore

TEST_VIDEO_URL = (
    "https://video.xx.fbcdn.net/o1/v/t2/f2/m366/"
    "AQMcpfLwCRGbnKGp9OEIB4THteaDiEUEmhu-ix8hDJn0Nj0C8UckhDjLOtOWtQt6qOLJOjHvME9lyDWbRBpbKYgUYORIjUioV6fM9vO1BapEVA.mp4"
    "?_nc_cat=106&_nc_oc=AdmBedpfAsXEdn4kOWVTN2VO2_sZLI2kqN0KxCRYE4hAz4nQuRddIdNAVzKpOuJUz-4&_nc_sid=5e9851&_nc_ht=video.fdxb3-1.fna.fbcdn.net"
    "&_nc_ohc=boliWlv_lAUQ7kNvwG7KejE&efg=eyJ2ZW5jb2RlX3RhZyI6Inhwdl9wcm9ncmVzc2l2ZS5WSV9VU0VDQVNFX1BST0RVQ1RfVFlQRS4uQzMuNzIwLmRhc2hfaDI2NC1iYXNpYy1nZW4yXzcyMHAiLCJ4cHZfYXNzZXRfaWQiOjEzNDE1MzMwNDA5Nzg0NTYsImFzc2V0X2FnZV9kYXlzIjo1MiwidmlfdXNlY2FzZV9pZCI6MTA3OTksImR1cmF0aW9uX3MiOjIyLCJ1cmxnZW5fc291cmNlIjoid3d3In0%3D&ccb=17-1&vs=c29207875f5d20d2"
    "&_nc_vs=HBksFQIYRWZiX2VwaGVtZXJhbC81MTQ3NTA4NUI0REUyODE3QzIzQ0I4NzA0NTkwNEU5QV9tdF8xX3ZpZGVvX2Rhc2hpbml0Lm1wNBUAAsgBEgAVAhhAZmJfcGVybWFuZW50L0ZCNDlDMUZEREI3RUYxRUNCNUI0QTZERDFCMDVBNTkxX2F1ZGlvX2Rhc2hpbml0Lm1wNBUCAsgBEgAoABgAGwKIB3VzZV9vaWwBMRJwcm9ncmVzc2l2ZV9yZWNpcGUBMRUAACawqOWFwIfiBBUCKAJDMywXQDauFHrhR64YGWRhc2hfaDI2NC1iYXNpYy1nZW4yXzcyMHARAHUAZd6oAQA&_nc_gid=oF0reklH1iR83F4eM5neNw&_nc_zt=28&oh=00_AfgNiveytV1fYXpwQNeCIwf53yvR3iu73MXqHnItYhJAxw&oe=6920E55E"
)


def _load_openrouter_key() -> str:
    # Prefer env for easy local testing
    env_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if env_key:
        return env_key
    # Fallback to DB setting
    try:
        db = SessionLocal()
        try:
            s = db.query(AppSetting).filter(AppSetting.key == "openrouter_api_key").first()
            if s and s.value:
                data = json.loads(s.value) if isinstance(s.value, str) else s.value
                if isinstance(data, dict):
                    return (data.get("api_key") or "").strip()
        finally:
            db.close()
    except Exception:
        pass
    return ""


def _normalize_result(result: Dict[str, Any]) -> Dict[str, Any]:
    # If service returned a raw JSON string due to invalid escapes, parse here
    if isinstance(result, dict) and isinstance(result.get("raw"), str):
        try:
            parsed = json.loads(result["raw"])  # may still raise
            return parsed
        except Exception:
            # best-effort: return as-is
            return result
    return result


def test_openrouter_reads_video_url():
    api_key = _load_openrouter_key()
    assert api_key, "Missing OpenRouter API key in env or app_settings.openrouter_api_key"

    service = OpenRouterService(api_key)

    started = time.time()
    result = service.analyze_video(
        TEST_VIDEO_URL,
        "You are a video analyst. Return JSON with transcript, beats, summary, storyboard, generation_prompts.",
        None,
    )
    elapsed = time.time() - started

    assert isinstance(result, dict), f"Result must be dict, got: {type(result)}"

    normalized = _normalize_result(result)
    # Accept either properly structured response or raw fallback with content
    has_structured = any(
        bool(normalized.get(k)) for k in (
            "transcript",
            "beats",
            "summary",
            "storyboard",
            "generation_prompts",
        )
    )
    has_raw = isinstance(result.get("raw"), (str, dict))

    assert has_structured or has_raw, f"Unexpected empty result: {result}"

    # Basic sanity check that it likely processed the video (not guaranteed):
    # - elapsed time is > 3s (model had to fetch/process)
    # - transcript length if present
    assert elapsed > 3, f"Call finished suspiciously fast ({elapsed:.2f}s)."
    if normalized.get("transcript"):
        assert len(str(normalized["transcript"])) >= 20


if __name__ == "__main__":
    # Allow running directly: prints a quick summary
    api_key = _load_openrouter_key()
    if not api_key:
        print("Missing OPENROUTER_API_KEY; set env or configure in DB")
        sys.exit(1)
    svc = OpenRouterService(api_key)
    t0 = time.time()
    res = svc.analyze_video(
        TEST_VIDEO_URL,
        "You are a video analyst. Return JSON with transcript, beats, summary, storyboard, generation_prompts.",
        None,
    )
    dt = time.time() - t0
    norm = _normalize_result(res)
    print(f"Elapsed: {dt:.2f}s")
    print("Keys:", list(norm.keys()))
    print("Transcript preview:", str(norm.get("transcript", ""))[:160])
