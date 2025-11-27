from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class VeoPromptSegment(Base):
    """Store individual prompt segments from creative briefs with edit history.
    
    Each segment represents one video prompt with its original and current (edited) text.
    Tracks all video generations created from this prompt.
    """
    __tablename__ = "veo_prompt_segments"
    
    id = Column(Integer, primary_key=True, index=True)
    brief_id = Column(Integer, ForeignKey("veo_creative_briefs.id", ondelete="CASCADE"), nullable=False, index=True)
    segment_index = Column(Integer, nullable=False)  # Order in brief (0, 1, 2...)
    original_prompt = Column(Text, nullable=False)  # Original AI-generated prompt text
    current_prompt = Column(Text, nullable=False)  # Current version (may be user-edited)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    brief = relationship("VeoCreativeBrief", back_populates="segments")
    video_generations = relationship("VeoVideoGeneration", back_populates="prompt_segment", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_brief_segment', 'brief_id', 'segment_index'),
    )
