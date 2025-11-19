"""
OpenRouter Service - Fallback provider for video analysis and prompt generation
Uses OpenRouter API to access multiple AI models
"""
import logging
import json
import base64
from typing import Dict, Any, Optional, List
import requests

logger = logging.getLogger(__name__)

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

class OpenRouterService:
    """Service for analyzing videos and generating prompts using OpenRouter API"""
    
    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("OpenRouter API key is required")
        self.api_key = api_key
        self.base_url = OPENROUTER_BASE_URL
    
    def analyze_video(self, video_url: str, system_instruction: str, custom_instruction: str = None) -> Dict[str, Any]:
        """Analyze video using OpenRouter API with Gemini 2.5 Flash.

        NOTE: OpenRouter's chat API is OpenAI-compatible and Gemini can fetch
        remote media by URL. We therefore send the original video_url in a
        text-only prompt instead of trying to inline the binary as image_url
        (which caused "Failed to extract 1 image(s)" errors).

        Args:
            video_url: Publicly accessible URL of the video file
            system_instruction: System prompt for analysis
            custom_instruction: Optional custom instruction

        Returns:
            Dict with analysis results
        """

        # Append custom instruction if provided
        full_instruction = system_instruction
        if custom_instruction:
            full_instruction += f"\n\nADDITIONAL CUSTOM INSTRUCTION:\n{custom_instruction}"

        # Use Gemini 2.0 Flash model on OpenRouter
        model = "nvidia/nemotron-nano-12b-v2-vl:free"

        logger.info(f"Analyzing video with {model} via OpenRouter...")

        try:
            result = self._call_model(
                model=model,
                video_url=video_url,
                instruction=full_instruction,
                response_type="analysis",
            )
            logger.info(f"✓ Success with {model} via OpenRouter")
            return result
        except Exception as e:
            logger.error(f"{model} via OpenRouter failed: {e}")
            raise Exception(f"OpenRouter video analysis failed: {e}")
    
    def generate_prompts(self, context: str, instruction: str) -> List[str]:
        """
        Generate prompts using DeepSeek R1T2 Chimera (free model)
        
        Args:
            context: Context for prompt generation
            instruction: Instruction for what kind of prompts to generate
        
        Returns:
            List of generated prompts
        """
        model = "tngtech/deepseek-r1t2-chimera:free"
        
        logger.info(f"Generating prompts with {model} via OpenRouter...")
        
        try:
            # Construct prompt for generation
            full_prompt = f"{instruction}\n\nContext:\n{context}\n\nGenerate creative and effective prompts based on the above context."
            
            result = self._call_text_model(
                model=model,
                prompt=full_prompt
            )
            
            # Parse prompts from response
            prompts_text = result.get("content", "")
            # Split by newlines and filter empty lines
            prompts = [p.strip() for p in prompts_text.split('\n') if p.strip()]
            
            logger.info(f"✓ Generated {len(prompts)} prompts with {model}")
            return prompts
        except Exception as e:
            logger.error(f"{model} via OpenRouter failed: {e}")
            raise Exception(f"OpenRouter prompt generation failed: {e}")
    
    def _call_model(self, model: str, video_url: str, instruction: str, response_type: str = "analysis") -> Dict[str, Any]:
        """Call OpenRouter API with video URL for analysis."""

        # Response schema for video analysis
        response_schema = {
            "type": "object",
            "properties": {
                "transcript": {"type": "string"},
                "beats": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "start": {"type": "string"},
                            "end": {"type": "string"},
                            "summary": {"type": "string"},
                            "why_it_works": {"type": "string"},
                        },
                    },
                },
                "summary": {"type": "string"},
                "text_on_video": {"type": "string"},
                "voice_over": {"type": "string"},
                "storyboard": {"type": "array", "items": {"type": "string"}},
                "generation_prompts": {"type": "array", "items": {"type": "string"}},
                "strengths": {"type": "array", "items": {"type": "string"}},
                "recommendations": {"type": "array", "items": {"type": "string"}},
            },
        }

        # Gemini on OpenRouter supports fetching media from a URL, so we
        # provide the video_url in plain text and ask for JSON only.
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": instruction,
                },
                {
                    "role": "user",
                    "content": (
                        "The video to analyze is available at this URL:\n"
                        f"{video_url}\n\n"
                        "Download and analyze that video. "
                        "Return ONLY JSON matching this schema:\n"
                        f"{json.dumps(response_schema)}"
                    ),
                },
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://admind.app",  # Optional: your app URL
            "X-Title": "AdMind Video Analyzer"  # Optional: your app name
        }
        
        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json=payload,
            timeout=600
        )
        
        if response.status_code >= 400:
            logger.error(f"OpenRouter error {response.status_code}: {response.text}")
            response.raise_for_status()
        
        data = response.json()

        # Extract content from OpenAI-compatible response
        content = data["choices"][0]["message"]["content"]

        # Models sometimes return JSON-like text with invalid escapes/control chars.
        # Try multiple strategies before falling back to raw text.
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as e1:
            logger.error(f"Failed to parse OpenRouter JSON response (strict): {e1}")
            # Try lenient parsing allowing control characters
            try:
                parsed = json.loads(content, strict=False)
            except Exception as e2:
                logger.error(f"Lenient parse failed: {e2}")
                # Sanitize common issues: stray control chars and unescaped backslashes
                try:
                    import re
                    sanitized = re.sub(r"[\x00-\x1F]", " ", content)
                    # Heuristic: ensure backslashes are escaped when followed by a non-escape char
                    # Avoid double-escaping valid sequences like \n, \t, \", \\.
                    sanitized = re.sub(r"\\(?![\\\/bfnrt\"u])", r"\\\\", sanitized)
                    parsed = json.loads(sanitized, strict=False)
                except Exception as e3:
                    logger.error(f"Sanitized parse failed: {e3}")
                    parsed = {"raw": content}

        # Attach token usage and zero cost information if available
        try:
            usage = data.get("usage") or {}
            token_usage = None
            if isinstance(usage, dict):
                prompt_tokens = usage.get("prompt_tokens")
                completion_tokens = usage.get("completion_tokens")
                total_tokens = usage.get("total_tokens")

                if isinstance(prompt_tokens, int) or isinstance(completion_tokens, int) or isinstance(total_tokens, int):
                    if not isinstance(prompt_tokens, int) or prompt_tokens < 0:
                        prompt_tokens = 0
                    if not isinstance(completion_tokens, int) or completion_tokens < 0:
                        completion_tokens = 0
                    if not isinstance(total_tokens, int) or total_tokens < 0:
                        total_tokens = prompt_tokens + completion_tokens

                    token_usage = {
                        "provider": "openrouter",
                        "model": model,
                        "prompt_tokens": prompt_tokens,
                        "completion_tokens": completion_tokens,
                        "total_tokens": total_tokens,
                    }

            if isinstance(parsed, dict) and token_usage:
                parsed.setdefault("token_usage", token_usage)
                # OpenRouter free models: cost is always zero
                parsed.setdefault("cost", {
                    "currency": "USD",
                    "total": 0.0,
                    "details": {
                        "prompt_cost": 0.0,
                        "completion_cost": 0.0,
                    },
                })
        except Exception:
            # Never break analysis due to usage/cost enrichment
            pass

        return parsed
    
    def _call_text_model(self, model: str, prompt: str) -> Dict[str, Any]:
        """Call OpenRouter API for text generation"""
        
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 2000
        }
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://admind.app",
            "X-Title": "AdMind Prompt Generator"
        }
        
        response = requests.post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        if response.status_code >= 400:
            logger.error(f"OpenRouter error {response.status_code}: {response.text}")
            response.raise_for_status()
        
        data = response.json()
        
        # Extract content
        content = data["choices"][0]["message"]["content"]
        
        return {"content": content}
