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
    
    # Duration field - calculated during scraping
    duration_days = Column(Integer, nullable=True, index=True)  # Number of days the ad has been running
    
    # Raw data from initial scrape
    raw_data = Column(JSON, nullable=True)
    
    # Foreign key to ad set
    ad_set_id = Column(Integer, ForeignKey("ad_sets.id"), nullable=True, index=True)
    
    # Relationships
    competitor = relationship("Competitor", back_populates="ads")
    analysis = relationship("AdAnalysis", uselist=False, back_populates="ad", cascade="all, delete-orphan")
    ad_set = relationship("AdSet", back_populates="ads", foreign_keys=[ad_set_id])
    
    # New structured fields for enhanced extraction
    meta = Column(JSON, nullable=True)
    targeting = Column(JSON, nullable=True)
    lead_form = Column(JSON, nullable=True)
    creatives = Column(JSON, nullable=True)

    def __repr__(self):
        return f"<Ad(id={self.id}, ad_archive_id='{self.ad_archive_id}')>"
    
    def to_dict(self):
        """Convert Ad instance to dictionary for JSON serialization"""
        date_found_iso = None
        if hasattr(self, 'date_found') and self.date_found is not None:
            date_found_iso = self.date_found.isoformat()
            
        created_at_iso = None
        if hasattr(self, 'created_at') and self.created_at is not None:
            created_at_iso = self.created_at.isoformat()
            
        updated_at_iso = None
        if hasattr(self, 'updated_at') and self.updated_at is not None:
            updated_at_iso = self.updated_at.isoformat()
            
        return {
            "id": self.id,
            "competitor_id": self.competitor_id,
            "ad_archive_id": self.ad_archive_id,
            "ad_set_id": self.ad_set_id,
            "date_found": date_found_iso,
            "created_at": created_at_iso,
            "updated_at": updated_at_iso,
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