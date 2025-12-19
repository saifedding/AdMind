from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CategoryCreateDTO(BaseModel):
    """DTO for creating a new category"""
    name: str = Field(..., min_length=1, max_length=100, description="Category name")


class CategoryUpdateDTO(BaseModel):
    """DTO for updating an existing category"""
    name: str = Field(..., min_length=1, max_length=100, description="Category name")


class CategoryResponseDTO(BaseModel):
    """DTO for category response data"""
    id: int
    name: str
    competitor_count: int = Field(0, description="Number of competitors in this category")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CategoryWithStatsDTO(BaseModel):
    """DTO for category with detailed statistics"""
    id: int
    name: str
    competitor_count: int = Field(0, description="Number of competitors in this category")
    total_ads: int = Field(0, description="Total number of ads from competitors in this category")
    active_ads: int = Field(0, description="Number of active ads from competitors in this category")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
