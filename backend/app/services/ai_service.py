import json
import logging
from typing import Dict, Any, Optional
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger(__name__)

class AIService:
    """
    Service class for interacting with Google Gemini AI API
    to analyze ad content and generate insights.
    """
    
    def __init__(self):
        """Initialize the AI service with Google AI configuration."""
        if not settings.GOOGLE_AI_API_KEY:
            raise ValueError("GOOGLE_AI_API_KEY is not configured")
        
        # Configure the Google AI API
        genai.configure(api_key=settings.GOOGLE_AI_API_KEY)
        self.model = genai.GenerativeModel(settings.GOOGLE_AI_MODEL)
        
    def analyze_ad_content(self, ad_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze ad content using Google Gemini AI API.
        
        Args:
            ad_data: Dictionary containing ad information including:
                - ad_copy: Main ad text
                - main_title: Ad title
                - main_body_text: Ad body text
                - main_caption: Ad caption
                - cta_text: Call-to-action text
                - media_type: Type of media (video, image, etc.)
                - page_name: Advertiser page name
                - targeted_countries: List of targeted countries
                - card_titles: List of card titles (for carousel ads)
                - card_bodies: List of card body texts (for carousel ads)
                
        Returns:
            Dict containing AI analysis results
        """
        try:
            # Construct the analysis prompt
            prompt = self._build_analysis_prompt(ad_data)
            
            logger.info(f"Sending analysis request to Google AI for ad {ad_data.get('ad_archive_id', 'unknown')}")
            
            # Generate response from AI
            response = self.model.generate_content(prompt)
            
            # Parse the response
            analysis_result = self._parse_ai_response(response.text)
            
            # Add metadata
            analysis_result['ai_prompts'] = {
                'analysis_prompt': prompt,
                'model_used': settings.GOOGLE_AI_MODEL
            }
            analysis_result['raw_ai_response'] = {
                'full_response': response.text,
                'model': settings.GOOGLE_AI_MODEL
            }
            analysis_result['analysis_version'] = 'v1.0-gemini'
            
            logger.info(f"Successfully analyzed ad {ad_data.get('ad_archive_id', 'unknown')}")
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error analyzing ad content: {str(e)}")
            raise
    
    def _build_analysis_prompt(self, ad_data: Dict[str, Any]) -> str:
        """
        Build a comprehensive analysis prompt for the AI model.
        
        Args:
            ad_data: Dictionary containing ad information
            
        Returns:
            Formatted prompt string
        """
        # Extract relevant ad content
        ad_copy = ad_data.get('ad_copy', '')
        main_title = ad_data.get('main_title', '')
        main_body_text = ad_data.get('main_body_text', '')
        main_caption = ad_data.get('main_caption', '')
        cta_text = ad_data.get('cta_text', '')
        media_type = ad_data.get('media_type', '')
        page_name = ad_data.get('page_name', '')
        targeted_countries = ad_data.get('targeted_countries', [])
        card_titles = ad_data.get('card_titles', [])
        card_bodies = ad_data.get('card_bodies', [])
        
        # Build the comprehensive prompt
        prompt = f"""
You are an expert digital marketing analyst specializing in Facebook/Meta advertising. 
Analyze the following ad content and provide a comprehensive analysis in JSON format.

AD CONTENT TO ANALYZE:
======================
Advertiser: {page_name}
Main Title: {main_title}
Main Body Text: {main_body_text}
Ad Copy: {ad_copy}
Caption: {main_caption}
Call-to-Action: {cta_text}
Media Type: {media_type}
Target Countries: {', '.join(targeted_countries) if targeted_countries else 'Not specified'}
"""

        # Add carousel content if present
        if card_titles or card_bodies:
            prompt += f"\nCarousel Cards:\n"
            for i, (title, body) in enumerate(zip(card_titles or [], card_bodies or [])):
                prompt += f"Card {i+1} - Title: {title}, Body: {body}\n"

        # Add analysis instructions
        prompt += f"""

ANALYSIS REQUIREMENTS:
======================
Provide your analysis as a valid JSON object with the following structure:
{{
    "summary": "A comprehensive 2-3 sentence summary of the ad's main message and approach",
    "hook_score": 8.5,
    "overall_score": 7.2,
    "target_audience": "Specific target audience description",
    "content_themes": ["theme1", "theme2", "theme3"],
    "effectiveness_analysis": {{
        "strengths": ["strength1", "strength2"],
        "weaknesses": ["weakness1", "weakness2"],
        "recommendations": ["recommendation1", "recommendation2"]
    }},
    "ad_format_analysis": {{
        "format_effectiveness": "Analysis of the ad format choice",
        "media_type_appropriateness": "Assessment of media type choice",
        "cta_effectiveness": "Analysis of call-to-action effectiveness"
    }},
    "competitor_insights": {{
        "positioning": "How the brand positions itself",
        "unique_selling_points": ["USP1", "USP2"],
        "competitive_advantage": "Main competitive advantage highlighted"
    }},
    "performance_predictions": {{
        "predicted_engagement_rate": 2.5,
        "predicted_click_through_rate": 1.8,
        "audience_fit_score": 8.0,
        "conversion_potential": "high/medium/low"
    }},
    "confidence_score": 0.85
}}

SCORING CRITERIA:
=================
- hook_score (1-10): Rate how engaging and attention-grabbing the opening/hook is
- overall_score (1-10): Rate the overall effectiveness of the ad
- confidence_score (0-1): Your confidence level in this analysis

ANALYSIS FOCUS:
===============
- Identify the primary value proposition
- Assess the emotional appeal and psychological triggers
- Evaluate the clarity and persuasiveness of the message
- Consider the target market fit
- Analyze the call-to-action effectiveness
- Assess visual and textual harmony (if applicable)

Return ONLY the JSON object, no additional text or formatting.
"""
        
        return prompt
    
    def _parse_ai_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse the AI response and extract structured data.
        
        Args:
            response_text: Raw response text from AI
            
        Returns:
            Parsed analysis results
        """
        try:
            # Try to find JSON in the response
            response_text = response_text.strip()
            
            # Remove any markdown formatting
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            # Parse JSON
            analysis_result = json.loads(response_text)
            
            # Validate required fields and set defaults
            analysis_result.setdefault('summary', 'AI analysis completed')
            analysis_result.setdefault('hook_score', 5.0)
            analysis_result.setdefault('overall_score', 5.0)
            analysis_result.setdefault('confidence_score', 0.7)
            analysis_result.setdefault('target_audience', 'General audience')
            analysis_result.setdefault('content_themes', [])
            
            # Ensure scores are within valid range
            analysis_result['hook_score'] = max(0, min(10, float(analysis_result['hook_score'])))
            analysis_result['overall_score'] = max(0, min(10, float(analysis_result['overall_score'])))
            analysis_result['confidence_score'] = max(0, min(1, float(analysis_result['confidence_score'])))
            
            return analysis_result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            logger.error(f"Response text: {response_text}")
            
            # Return fallback analysis
            return {
                'summary': 'AI analysis completed with parsing error',
                'hook_score': 5.0,
                'overall_score': 5.0,
                'confidence_score': 0.5,
                'target_audience': 'General audience',
                'content_themes': [],
                'parse_error': str(e),
                'raw_response': response_text
            }
        except Exception as e:
            logger.error(f"Error parsing AI response: {e}")
            raise


# Create a singleton instance
try:
    ai_service = AIService() if settings.AI_ANALYSIS_ENABLED and settings.GOOGLE_AI_API_KEY else None
except Exception as e:
    # If there's an error creating the service (e.g., missing dependencies), set to None
    logger.warning(f"Failed to create AI service: {e}")
    ai_service = None


def get_ai_service() -> Optional[AIService]:
    """
    Get the AI service instance.
    
    Returns:
        AIService instance or None if not configured
    """
    return ai_service 