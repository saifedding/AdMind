from sqlalchemy import Column, Integer, String, DateTime, JSON, func
from app.database import Base


class TaskStatus(Base):
    """Model for tracking task status and results"""
    __tablename__ = "task_status"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, nullable=False)  # pending, running, completed, failed
    result = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<TaskStatus(id={self.id}, task_id='{self.task_id}', status='{self.status}')>" 