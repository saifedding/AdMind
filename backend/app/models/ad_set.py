from sqlalchemy import Column, Integer, BigInteger, String, DateTime, ForeignKey, Boolean, func, Index
from sqlalchemy.orm import relationship
from app.database import Base


class AdSet(Base):
    __tablename__ = "ad_sets"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Content signature - perceptual hash of the representative ad's media (stable visual identifier)
    content_signature = Column(String, unique=True, nullable=False, index=True)
    
    # Count of ad variants in this set
    variant_count = Column(Integer, default=0, nullable=False)

    # Earliest and latest discovery dates among ads in this set
    first_seen_date = Column(DateTime(timezone=True), nullable=True, index=True)
    last_seen_date = Column(DateTime(timezone=True), nullable=True, index=True)
    
    # Reference to the best/representative ad in the set
    best_ad_id = Column(BigInteger, ForeignKey("ads.id"), nullable=True, index=True)
    
    # User preferences
    is_favorite = Column(Boolean, default=False, nullable=False, index=True)
    
    # Standard timestamp fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationship to ads
    ads = relationship("Ad", back_populates="ad_set", foreign_keys="Ad.ad_set_id")
    
    # Relationship to the best ad
    best_ad = relationship("Ad", foreign_keys=[best_ad_id], post_update=True)
    
    def __repr__(self):
        return f"<AdSet(id={self.id}, content_signature='{self.content_signature}', variant_count={self.variant_count})>"
    
    def to_dict(self):
        """Convert AdSet instance to dictionary for JSON serialization"""
        created_at_iso = None
        if hasattr(self, 'created_at') and self.created_at is not None:
            created_at_iso = self.created_at.isoformat()
            
        updated_at_iso = None
        if hasattr(self, 'updated_at') and self.updated_at is not None:
            updated_at_iso = self.updated_at.isoformat()
            
        return {
            "id": self.id,
            "content_signature": self.content_signature,
            "variant_count": self.variant_count,
            "best_ad_id": self.best_ad_id,
            "created_at": created_at_iso,
            "updated_at": updated_at_iso
        } 