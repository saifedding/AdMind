from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


class Category(Base):
    """Category model for organizing competitors"""
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship to competitors
    competitors = relationship("Competitor", back_populates="category")

    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}')>"
