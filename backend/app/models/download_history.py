from sqlalchemy import Column, Integer, String, DateTime, JSON, func, BigInteger
from sqlalchemy.orm import relationship
from app.database import Base


class DownloadHistory(Base):
    __tablename__ = "download_history"

    id = Column(Integer, primary_key=True, index=True)
    ad_id = Column(BigInteger, nullable=True, index=True)  # Can be null for downloads without ad_id
    ad_archive_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=True)  # Extracted title from ad
    
    # Media counts
    video_hd_count = Column(Integer, default=0)
    video_sd_count = Column(Integer, default=0)
    image_count = Column(Integer, default=0)
    
    # URLs stored as JSON arrays
    video_hd_urls = Column(JSON, nullable=True)
    video_sd_urls = Column(JSON, nullable=True)
    video_urls = Column(JSON, nullable=True)
    image_urls = Column(JSON, nullable=True)
    
    # Media details (type, url, etc.)
    media = Column(JSON, nullable=True)
    
    # Save path if downloaded to disk
    save_path = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<DownloadHistory(id={self.id}, ad_archive_id='{self.ad_archive_id}', title='{self.title}')>"
