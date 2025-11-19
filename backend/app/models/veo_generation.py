from sqlalchemy import Column, Integer, BigInteger, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database import Base


class VeoGeneration(Base):
    """Store Veo-generated videos with their prompts and settings."""
    __tablename__ = "veo_generations"

    id = Column(Integer, primary_key=True, index=True)
    ad_id = Column(BigInteger, ForeignKey("ads.id"), nullable=True, index=True)
    prompt = Column(Text, nullable=False)
    prompt_hash = Column(String, nullable=True, index=True)  # Hash of prompt for grouping versions
    version_number = Column(Integer, default=1, nullable=False)  # Version for same prompt
    is_current = Column(Integer, default=1, nullable=False, index=True)  # 1 = current, 0 = archived
    video_url = Column(String, nullable=False)
    model_key = Column(String, nullable=False)
    aspect_ratio = Column(String, nullable=False)
    seed = Column(Integer, nullable=True)
    generation_metadata = Column(JSON, nullable=True)  # Store full response
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
