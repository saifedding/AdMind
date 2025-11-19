from sqlalchemy import Column, Integer, String, DateTime, Float, Text
from sqlalchemy.sql import func
from app.database import Base


class ApiUsage(Base):
    """Track API usage per model and key for billing and rate limiting."""
    __tablename__ = "api_usage"

    id = Column(Integer, primary_key=True, index=True)
    
    # Model and provider info
    model_name = Column(String(255), nullable=False, index=True)
    provider = Column(String(50), nullable=False, index=True)  # "gemini", "openrouter", etc.
    
    # API key info (for multi-key rotation tracking)
    api_key_index = Column(Integer, nullable=True, index=True)
    
    # Token usage
    prompt_tokens = Column(Integer, default=0)
    cached_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    
    # Cost tracking
    estimated_cost_usd = Column(Float, default=0.0)
    
    # Request metadata
    request_type = Column(String(100), nullable=True)  # "analysis", "followup", "regenerate", etc.
    ad_id = Column(Integer, nullable=True, index=True)  # Link to ad if applicable
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Optional: Store raw response for debugging
    raw_metadata = Column(Text, nullable=True)
    
    def __repr__(self):
        return f"<ApiUsage(id={self.id}, model={self.model_name}, tokens={self.total_tokens}, cost=${self.estimated_cost_usd})>"
