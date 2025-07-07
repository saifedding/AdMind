from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean, func, Float, ARRAY
from sqlalchemy.orm import relationship
from app.database import Base


class Ad(Base):
    __tablename__ = "ads"

    # Core identification fields
    id = Column(Integer, primary_key=True, index=True)
    competitor_id = Column(Integer, ForeignKey("competitors.id"), nullable=False, index=True)
    ad_archive_id = Column(String, unique=True, nullable=False, index=True)
    
    # Basic tracking fields
    date_found = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Raw data from initial scrape
    raw_data = Column(JSON, nullable=True)
    
    # Relationships
    competitor = relationship("Competitor", back_populates="ads")
    analysis = relationship("AdAnalysis", uselist=False, back_populates="ad", cascade="all, delete-orphan")
    
    # New structured fields for enhanced extraction
    meta = Column(JSON, nullable=True)
    targeting = Column(JSON, nullable=True)
    lead_form = Column(JSON, nullable=True)
    creatives = Column(JSON, nullable=True)

    def __repr__(self):
        return f"<Ad(id={self.id}, ad_archive_id='{self.ad_archive_id}')>"
    
    def to_dict(self):
        """Convert Ad instance to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "competitor_id": self.competitor_id,
            "ad_archive_id": self.ad_archive_id,
            "date_found": self.date_found.isoformat() if self.date_found else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "raw_data": self.raw_data,
            "meta": self.meta,
            "targeting": self.targeting,
            "lead_form": self.lead_form,
            "creatives": self.creatives
        }
    
    def to_enhanced_format(self):
        """Convert to the new enhanced frontend format"""
        return {
            "ad_archive_id": self.ad_archive_id,
            "meta": self.meta,
            "targeting": self.targeting,
            "lead_form": self.lead_form,
            "creatives": self.creatives
        } 