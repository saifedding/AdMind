from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class VeoCreativeBrief(Base):
    """Store creative brief variations generated for each style in a session.
    
    Each brief represents one style variation (e.g., "podcast", "walking")
    and contains multiple prompt segments.
    """
    __tablename__ = "veo_creative_briefs"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("veo_script_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    style_id = Column(String, nullable=False)  # e.g., "podcast", "walking", "testimonial"
    style_name = Column(String, nullable=False)  # e.g., "Podcast Style", "Walking Style"
    brief_metadata = Column(JSON, nullable=True)  # Full brief data and additional context
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session = relationship("VeoScriptSession", back_populates="creative_briefs")
    segments = relationship(
        "VeoPromptSegment",
        back_populates="brief",
        cascade="all, delete-orphan",
        order_by="VeoPromptSegment.segment_index"
    )
