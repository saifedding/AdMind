from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func

from app.database import Base


class SavedImage(Base):
    __tablename__ = "saved_images"

    id = Column(Integer, primary_key=True, index=True)
    media_id = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=True)
    prompt = Column(Text, nullable=True)
    model = Column(String, nullable=True)
    aspect_ratio = Column(String, nullable=True)
    encoded_image = Column(Text, nullable=True)
    fife_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
