from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class VeoScriptSession(Base):
    """Store script sessions with full configuration for recovery and history tracking.
    
    Each session represents one script generation with all its configuration,
    creative briefs, prompts, and video generations.
    """
    __tablename__ = "veo_script_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    script = Column(Text, nullable=False)
    selected_styles = Column(JSON, nullable=False)  # List of style IDs like ["podcast", "walking"]
    character_preset_id = Column(String, nullable=True)
    gemini_model = Column(String, nullable=False)  # Model used to generate creative briefs
    aspect_ratio = Column(String, nullable=False)
    video_model_key = Column(String, nullable=False)  # Default video model for this session
    style_template_id = Column(Integer, nullable=True)
    workflow_type = Column(String, nullable=True)  # "text-to-video" or "image-to-video"
    session_metadata = Column(JSON, nullable=True)  # Extra config like seed, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    creative_briefs = relationship("VeoCreativeBrief", back_populates="session", cascade="all, delete-orphan")
