from sqlalchemy import Column, Integer, BigInteger, String, Text, Float, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship
from app.database import Base


class AdAnalysis(Base):
    __tablename__ = "ad_analyses"

    id = Column(Integer, primary_key=True, index=True)
    ad_id = Column(BigInteger, ForeignKey("ads.id"), nullable=False, index=True)
    is_current = Column(Integer, default=1, nullable=False, index=True)  # 1 = current, 0 = archived
    version_number = Column(Integer, default=1, nullable=False)  # Incremental version number
    used_video_url = Column(String, nullable=True)  # The video URL that was analyzed
    summary = Column(Text, nullable=True)
    hook_score = Column(Float, nullable=True)  # Score for how engaging the hook is
    overall_score = Column(Float, nullable=True)  # Overall ad effectiveness score
    
    # JSONB columns for flexible AI data storage
    ai_prompts = Column(JSON, nullable=True)  # Store the prompts sent to AI
    raw_ai_response = Column(JSON, nullable=True)  # Store complete AI response
    
    # Additional analysis fields
    target_audience = Column(String, nullable=True)
    ad_format_analysis = Column(JSON, nullable=True)  # Analysis of ad format effectiveness
    competitor_insights = Column(JSON, nullable=True)  # Insights about competitor strategy
    content_themes = Column(JSON, nullable=True)  # Identified themes in the ad content
    performance_predictions = Column(JSON, nullable=True)  # Predicted performance metrics
    
    # Metadata
    analysis_version = Column(String, nullable=True)  # Track AI model version used
    confidence_score = Column(Float, nullable=True)  # AI confidence in the analysis
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    ad = relationship("Ad", back_populates="analysis")

    def __repr__(self):
        return f"<AdAnalysis(id={self.id}, ad_id={self.ad_id}, overall_score={self.overall_score})>" 