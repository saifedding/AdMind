from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base


class VideoStyleTemplate(Base):
    """Store analyzed video styles that can be reused for generating creative briefs."""
    __tablename__ = "video_style_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)  # User-friendly name
    description = Column(Text, nullable=True)  # Optional description
    video_url = Column(String, nullable=False)  # Original video URL
    thumbnail_url = Column(String, nullable=True)  # Thumbnail from video
    
    # Extracted style characteristics (JSON)
    style_characteristics = Column(JSON, nullable=False)
    # {
    #   "camera_work": "Smooth tracking shot, medium close-up...",
    #   "lighting": "Soft key light from front-left...",
    #   "color_grading": "Warm tones, slightly desaturated...",
    #   "setting": "Modern office with white walls...",
    #   "performance_style": "Confident, direct to camera...",
    #   "visual_aesthetic": "Clean, professional, minimalist...",
    #   "mood": "Inspiring, energetic...",
    #   "technical_details": {...}
    # }
    
    # Gemini analysis metadata
    analysis_metadata = Column(JSON, nullable=True)  # Full Gemini response
    gemini_file_uri = Column(String, nullable=True)  # Uploaded video URI in Gemini
    
    usage_count = Column(Integer, default=0, nullable=False)  # Track how often it's used
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
