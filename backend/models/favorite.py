from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.database import Base


class FavoriteList(Base):
    """Model for user's favorite lists"""
    __tablename__ = 'favorite_lists'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    user_id = Column(Integer, nullable=False, index=True)
    color = Column(String(20), nullable=True, default='blue')
    icon = Column(String(50), nullable=True, default='star')
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    items = relationship('FavoriteItem', back_populates='list', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'user_id': self.user_id,
            'color': self.color,
            'icon': self.icon,
            'is_default': self.is_default,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'item_count': len(self.items) if self.items else 0
        }


class FavoriteItem(Base):
    """Model for items in favorite lists"""
    __tablename__ = 'favorite_items'
    __table_args__ = (
        UniqueConstraint('list_id', 'ad_id', name='uq_list_ad'),
    )

    id = Column(Integer, primary_key=True, index=True)
    list_id = Column(Integer, ForeignKey('favorite_lists.id', ondelete='CASCADE'), nullable=False, index=True)
    ad_id = Column(Integer, ForeignKey('ads.id', ondelete='CASCADE'), nullable=False, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    list = relationship('FavoriteList', back_populates='items')
    ad = relationship('Ad')

    def to_dict(self, include_ad=False):
        data = {
            'id': self.id,
            'list_id': self.list_id,
            'ad_id': self.ad_id,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_ad and self.ad:
            data['ad'] = self.ad.to_dict()
        return data
