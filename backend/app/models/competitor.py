from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Competitor(Base):
    __tablename__ = "competitors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    page_id = Column(String, unique=True, nullable=False, index=True)
    page_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    ads = relationship("Ad", back_populates="competitor")
    category = relationship("Category", back_populates="competitors")

    def __repr__(self):
        return f"<Competitor(id={self.id}, name='{self.name}', page_id='{self.page_id}')>" 