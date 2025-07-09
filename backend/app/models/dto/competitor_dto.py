from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CompetitorCreateDTO(BaseModel):
    """DTO for creating a new competitor"""
    name: str = Field(..., description="Competitor name", min_length=1, max_length=255)
    page_id: str = Field(..., description="Facebook page ID", min_length=1, max_length=100)
    is_active: bool = Field(True, description="Whether the competitor is active")


class CompetitorUpdateDTO(BaseModel):
    """DTO for updating an existing competitor"""
    name: Optional[str] = Field(None, description="Competitor name", min_length=1, max_length=255)
    page_id: Optional[str] = Field(None, description="Facebook page ID", min_length=1, max_length=100)
    is_active: Optional[bool] = Field(None, description="Whether the competitor is active")


class CompetitorResponseDTO(BaseModel):
    """DTO for competitor response data"""
    id: int
    name: str
    page_id: str
    page_url: Optional[str] = None
    is_active: bool
    ads_count: Optional[int] = Field(0, description="Number of ads for this competitor")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CompetitorDetailResponseDTO(BaseModel):
    """DTO for detailed competitor response with additional stats"""
    id: int
    name: str
    page_id: str
    is_active: bool
    ads_count: int = Field(0, description="Total number of ads")
    active_ads_count: int = Field(0, description="Number of active ads")
    analyzed_ads_count: int = Field(0, description="Number of analyzed ads")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PaginatedCompetitorResponseDTO(BaseModel):
    """DTO for paginated competitor response"""
    data: List[CompetitorResponseDTO]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool


class CompetitorFilterParams(BaseModel):
    """DTO for competitor filtering parameters"""
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=100, description="Number of items per page")
    is_active: Optional[bool] = Field(None, description="Filter by active status")
    search: Optional[str] = Field(None, description="Search in competitor names")
    sort_by: Optional[str] = Field("created_at", description="Sort by field")
    sort_order: Optional[str] = Field("desc", description="Sort order (asc/desc)")


class CompetitorStatsResponseDTO(BaseModel):
    """DTO for competitor statistics"""
    total_competitors: int
    active_competitors: int
    inactive_competitors: int
    competitors_with_ads: int
    total_ads_across_competitors: int
    avg_ads_per_competitor: float 