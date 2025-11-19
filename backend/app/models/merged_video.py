from sqlalchemy import Column, Integer, BigInteger, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database import Base


class MergedVideo(Base):
    """Store merged Veo videos with their source clips."""
    __tablename__ = "merged_videos"

    id = Column(Integer, primary_key=True, index=True)
    ad_id = Column(BigInteger, nullable=True, index=True)  # No FK constraint - supports both real ad IDs and timestamps
    video_url = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=True)
    clip_count = Column(Integer, nullable=False)
    source_clips = Column(JSON, nullable=False)  # List of video URLs that were merged
    created_at = Column(DateTime(timezone=True), server_default=func.now())
