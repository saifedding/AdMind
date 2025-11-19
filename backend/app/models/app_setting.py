from sqlalchemy import Column, Integer, String, Text

from app.database import Base


class AppSetting(Base):
    """Simple key/value application setting storage.

    Used to persist configurable values such as the Gemini system_instruction
    so they can be edited from the UI without changing code.
    """

    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
