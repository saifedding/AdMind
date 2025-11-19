import os
import json
import mimetypes
import logging
import time
import uuid
import re
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
        "6) Produce 'generation_prompts': an ordered list of LONG, HIGHLY DETAILED prompts to recreate the video as a sequence of 8-second clips. BEFORE writing any prompt, first study the ENTIRE video carefully to build a precise mental model of what is actually visible and audible: the exact people (age, gender expression, hair, clothing), environments, props, camera behavior, and visual style. Then, for each segment, re-watch that segment FRAME BY FRAME so that every meaningful visual/action change is captured. You must ONLY describe people, objects, environments, camera moves, lighting, and styles that are clearly present in the source footage. If you are uncertain about a detail, describe it generically (e.g. 'a person', 'a modern living room') rather than inventing a specific new element. For EACH 8-second prompt, output 400–900 words and strictly follow this MARKDOWN structure and headings (populate fully with concrete, specific guidance). The prompts should aim to faithfully replicate the original video's narrative, visuals, camera, lighting, movement, performance, and timing as closely as possible given the 8-second constraint (no creative paraphrasing or hallucinated details). Do not include on-screen text: \n"
        "# VEO 3 CREATIVE BRIEF: <TITLE>\n\n"
        "## TECHNICAL SPECIFICATIONS\n"
        "**Duration:** <ACTUAL duration in seconds for this clip, e.g. '6.8 seconds'. You MUST ensure the real described timeline is <= 8.0 seconds; if your first estimate is > 8.0 seconds you MUST shorten the described content (move excess sentences to the next prompt) and recompute the duration until it is strictly <= 8.0 seconds. Never output a Duration value greater than 8.0 seconds. When estimating how long spoken dialogue takes, assume a fast but natural human speaking rate of about 3.0–3.5 words per second (roughly 180–210 words per minute), and make sure the number of words in each line of dialogue can realistically fit inside the allocated seconds without sounding rushed or robotic.>\n**Resolution:** 4K (3840×2160)\n**Frame Rate:** 24fps (cinematic) or 30fps\n**Aspect Ratio:** <DETECT and state the actual aspect ratio of the input video, e.g. '9:16 vertical' or '16:9 widescreen'>\n**Style:** Hyper-realistic, photorealistic commercial cinematography\n**Color Grading:** <describe palette>\n\n---\n\n"
        "## 1. VISUAL NARRATIVE & ARTISTIC DIRECTION\n"
        "**Core Concept:** <clear intent>\n\n**Artistic Mandate:**\n- <bullet>\n- <bullet>\n- <bullet>\n\n---\n\n"
        "## 2. THE PROTAGONIST: <ROLE>\n\n### Physical Appearance & Ethnicity\n- <details>\n\n### Wardrobe & Styling\n- <details>\n\n### Character Energy\n- <details>\n\n---\n\n"
        "## 3. THE ENVIRONMENT: <LOCATION>\n\n### Location & Setting\n- <details>\n\n### Lighting & Atmosphere\n- <details>\n\n### Left/Right Side Elements\n- <details>\n\n---\n\n"
        "## 4. CINEMATOGRAPHY: SOPHISTICATED TRACKING SHOT\n\n### Camera Movement & Technique\n- <details>\n\n### Framing & Composition\n- <details>\n\n### Focus & Depth of Field\n- <details>\n\n---\n\n"
        "## 5. THE PERFORMANCE: AUTHENTIC STORYTELLING\n\n### Dialogue & Script (match lines and timing as heard)\n- <lines and timing>\n\n### Vocal Delivery Specifications\n- <accent, tone, pacing, aiming for slightly fast, natural, conversational human delivery (no robotic or monotone TTS cadence)>\n\n### Physical Performance & Body Language\n- <blocking>\n\n---\n\n"
        "## 6. EIGHT-SECOND TIMELINE: BEAT-BY-BEAT BREAKDOWN\n\n### SECONDS 0.0 - 1.5\n- Visual / Action / Audio\n\n### SECONDS 1.5 - 2.5\n- Visual / Action / Audio\n\n### SECONDS 2.5 - 4.5\n- Visual / Action / Audio\n\n### SECONDS 4.5 - 6.5\n- Visual / Action / Audio\n\n### SECONDS 6.5 - 8.0\n- Visual / Action / Audio\n\n(Do NOT describe or imply anything after 8.0 seconds in this prompt.)\n\n---\n\n"
        "## 7. BACKGROUND EXTRAS & ENVIRONMENTAL LIFE\n- <details>\n\n## 8. COLOR GRADING & VISUAL STYLE\n- <palette and references>\n\n## 9. AUDIO SPECIFICATIONS\n- <dialogue recording, ambient, foley, music>\n\n## 10. OPTIMIZATION & CHECKLIST\n- Avoid pitfalls, success criteria\n\n"
        "CRITICAL RULES: DO NOT include or require any on-screen text overlays in these prompts. Be concrete and specific. Match the source content as closely as possible, based ONLY on what is clearly visible or audible in the actual video segment. Absolutely NO hallucinations: never invent new people, clothing styles, props, products, logos, locations, camera moves, or design elements that are not present in the footage. If the video does not show something, you must not describe it. If you are unsure about a detail, describe it in neutral, generic terms instead of guessing. Each 8-second prompt must end at a natural pause or COMPLETE sentence so dialogue and action are never cut in the middle; if a sentence would cross the 8s boundary, move the ENTIRE sentence to the next prompt. The NEXT prompt must logically continue from where the previous one ended, with no overlap and no gaps in the sequence, forming one continuous timeline across all prompts. NOTHING that happens after 8.0 seconds is allowed in a single prompt. Keep the scope to the 8-second window while remaining richly detailed. For the entire video, you MUST minimize the total number of 8-second prompts while still following all rules: always fill each prompt with as much timeline as possible (strictly up to 8.0 seconds) while ending on a natural pause, and avoid creating unnecessarily short prompts (for example 1–3 seconds) unless the whole video is that short or there is a hard narrative break that forces an earlier cut. Prefer fewer, denser prompts instead of many tiny ones, and when possible aim for clip durations in the 7.0–8.0 second range so that almost the full 8 seconds are used before moving to the next prompt. Very short prompts (less than about 6 seconds) should only occur at the very end of the video or where a hard cut/scene change truly prevents extending the segment further without breaking these rules. "
        "Return strict JSON only."
    )


class GoogleAIService:
    """Thin wrapper over Google Generative Language (Gemini) REST API using API key.

    Expects env var GOOGLE_API_KEY. Does not store files persistently.
    """

    def __init__(self, api_key: Optional[str] = None):
        api_key_val = api_key or os.getenv("GOOGLE_API_KEY")
        self.api_key: str = str(api_key_val) if api_key_val else ""
        if not self.api_key:
            raise RuntimeError("GOOGLE_API_KEY is not set in environment")

    def _auth_params(self) -> Dict[str, str]:
        return {"key": self.api_key}

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

    def generate_transcript_and_analysis(self, file_uri: str, custom_instruction: str = None) -> Dict[str, Any]:
        """Calls Gemini with the uploaded file to return transcript + analysis.
        Returns dict with keys: transcript, beats, summary, strengths, recommendations.
        
        Args:
            file_uri: URI of the uploaded video file
            custom_instruction: Optional custom instruction to append to system prompt
        """
        url = f"{GEMINI_API_BASE}/models/gemini-2.5-flash:generateContent"
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

        # Ensure the file is processed and retrieve its mimeType
        try:
            file_info = self.wait_for_file_active(file_uri)
        except Exception as e:
            logger.warning(f"Proceeding without ACTIVE confirmation: {e}")
            file_info = {}

        mime_type = (file_info.get('file') or {}).get('mimeType') if isinstance(file_info, dict) else None

        payload = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"file_data": {"file_uri": file_uri, **({"mime_type": mime_type} if mime_type else {})}},
                        {"text": "Output JSON only matching this JSON Schema:\n" + json.dumps(response_schema)}
                    ]
                }
            ],
            "generation_config": {
                "temperature": 0.2,
                "response_mime_type": "application/json"
            }
        }
        resp = requests.post(url, params=self._auth_params(), json=payload, timeout=600)
        if resp.status_code >= 400:
            try:
                logger.error(f"Gemini error {resp.status_code}: {resp.text}")
            finally:
                resp.raise_for_status()
        data = resp.json()
        # Extract text from candidates[0].content.parts[0].text
        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(text)

            # Some responses return generation_prompts as many smaller chunks
            # (one section per item) instead of one full markdown block per
            # 8s segment. Regroup by treating every occurrence of
            # '# VEO 3 CREATIVE BRIEF' as the start of a new prompt. We do
            # NOT modify the text itself, only how items are grouped.
            try:
                gps = parsed.get("generation_prompts")
                if isinstance(gps, list) and gps and all(isinstance(s, str) for s in gps):
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
            except Exception as e:
                logger.warning(f"generation_prompts regrouping failed: {e}")

            return parsed
        except Exception:
            logger.warning("Falling back to raw response if JSON parsing fails")
            return {"raw": data}

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
