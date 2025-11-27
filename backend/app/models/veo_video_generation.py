from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class VeoVideoGeneration(Base):
    """Store video generations with full history and version tracking.
    
    Each record represents one video generation attempt, tracking the exact prompt used,
    model settings, and generation metadata. Multiple videos can be generated for the
    same prompt segment, creating a complete version history.
    """
    __tablename__ = "veo_video_generations"
    
    id = Column(Integer, primary_key=True, index=True)
    segment_id = Column(Integer, ForeignKey("veo_prompt_segments.id", ondelete="CASCADE"), nullable=False, index=True)
    prompt_used = Column(Text, nullable=False)  # Actual prompt text used for THIS generation
    video_url = Column(String, nullable=False)
    model_key = Column(String, nullable=False)  # Video model used (e.g., "veo_3_1_t2v_portrait")
    aspect_ratio = Column(String, nullable=False)
    seed = Column(Integer, nullable=True)
    generation_time_seconds = Column(Integer, nullable=True)  # Actual time taken to generate
    generation_metadata = Column(JSON, nullable=True)  # Full API response and additional data
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    prompt_segment = relationship("VeoPromptSegment", back_populates="video_generations")
    
    __table_args__ = (
        Index('idx_segment_created', 'segment_id', 'created_at'),
    )
