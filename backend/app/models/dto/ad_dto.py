from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime

from .competitor_dto import CompetitorResponseDTO


class ExtraTextItemDTO(BaseModel):
    """
    DTO for a single item in the extra_texts field.
    """
    text: str
    
    class Config:
        from_attributes = True


class CompetitorCreateDTO(BaseModel):
    """
    DTO for creating or finding competitor records.
    Used when ingesting ad data to ensure competitor exists.
    """
    name: str = Field(..., description="Competitor/page name")
    page_id: str = Field(..., description="Facebook page ID")
    is_active: bool = Field(default=True, description="Whether competitor is active")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class AdMeta(BaseModel):
    """
    DTO for ad meta information.
    """
    is_active: Optional[bool] = Field(None, description="Whether the ad is active")
    cta_type: Optional[str] = Field(None, description="Call to action type")
    display_format: Optional[str] = Field(None, description="Display format")
    start_date: Optional[str] = Field(None, description="Start date of the ad")
    end_date: Optional[str] = Field(None, description="End date of the ad")
    
    class Config:
        from_attributes = True


class AgeRange(BaseModel):
    min: int
    max: int


class Location(BaseModel):
    name: str
    num_obfuscated: int = 0
    type: str
    excluded: bool = False


class GenderAgeBreakdown(BaseModel):
    age_range: str
    male: Optional[int] = None
    female: Optional[int] = None
    unknown: Optional[int] = None


class CountryReachBreakdown(BaseModel):
    country: str
    age_gender_breakdowns: List[GenderAgeBreakdown]


class AdTargeting(BaseModel):
    """
    DTO for ad targeting information.
    """
    locations: Optional[List[str]] = Field(None, description="Targeted locations")
    age_range: Optional[str] = Field(None, description="Targeted age range")
    gender: Optional[str] = Field(None, description="Targeted gender")
    reach_breakdown: Optional[Dict[str, Any]] = Field(None, description="Reach breakdown")
    total_reach: Optional[int] = Field(None, description="Total reach")
    
    class Config:
        from_attributes = True


class LeadFormQuestion(BaseModel):
    """
    DTO for a lead form question.
    """
    question_id: str = Field(..., description="Question ID")
    question_text: str = Field(..., description="Question text")
    question_type: str = Field(..., description="Question type")
    options: Optional[List[str]] = Field(None, description="Question options")
    
    class Config:
        from_attributes = True


class LeadForm(BaseModel):
    """
    DTO for lead form information.
    """
    questions: Optional[Dict[str, Any]] = Field(None, description="Lead form questions")
    standalone_fields: Optional[List[str]] = Field(None, description="Standalone fields")
    
    class Config:
        from_attributes = True


class CreativeMedia(BaseModel):
    """
    DTO for creative media.
    """
    url: str = Field(..., description="Media URL")
    type: str = Field(..., description="Media type")
    
    class Config:
        from_attributes = True


class CreativeCta(BaseModel):
    text: Optional[str] = None
    type: Optional[str] = None


class CreativeLink(BaseModel):
    url: Optional[str] = None
    caption: Optional[str] = None


class Creative(BaseModel):
    """
    DTO for ad creative.
    """
    id: str = Field(..., description="Creative ID")
    title: Optional[str] = Field(None, description="Creative title")
    body: Optional[str] = Field(None, description="Creative body")
    caption: Optional[str] = Field(None, description="Creative caption")
    link_url: Optional[str] = Field(None, description="Creative link URL")
    link_description: Optional[str] = Field(None, description="Creative link description")
    media: Optional[List[CreativeMedia]] = Field(None, description="Creative media")
    
    class Config:
        from_attributes = True


class AdBase(BaseModel):
    ad_archive_id: str
    meta: Optional[AdMeta] = None
    targeting: Optional[AdTargeting] = None
    lead_form: Optional[LeadForm] = None
    creatives: List[Creative] = []


class AdCreate(AdBase):
    competitor_id: int


class AdUpdate(BaseModel):
    meta: Optional[AdMeta] = None
    targeting: Optional[AdTargeting] = None
    lead_form: Optional[LeadForm] = None
    creatives: Optional[List[Creative]] = None


class AdInDB(AdBase):
    id: int
    competitor_id: int
    date_found: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class AdResponse(AdBase):
    id: int
    competitor_id: int
    date_found: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class AdFilterParams(BaseModel):
    page: int = 1
    page_size: int = 20
    competitor_id: Optional[int] = None
    competitor_name: Optional[str] = None
    media_type: Optional[str] = None
    has_analysis: Optional[bool] = None
    min_hook_score: Optional[float] = None
    max_hook_score: Optional[float] = None
    min_overall_score: Optional[float] = None
    max_overall_score: Optional[float] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    is_active: Optional[bool] = None
    search: Optional[str] = None
    sort_by: Optional[str] = "date_found"
    sort_order: Optional[str] = "desc"


class PaginatedAdResponse(BaseModel):
    items: List[AdResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class AdvertiserInfo(BaseModel):
    page_id: str
    page_name: str
    page_url: Optional[str] = None
    page_likes: Optional[int] = None
    page_profile_picture: Optional[str] = None


class Campaign(BaseModel):
    campaign_id: str
    platforms: List[str] = []
    ads: List[AdResponse] = []


class AdsFullResponse(BaseModel):
    advertiser_info: AdvertiserInfo
    campaigns: List[Campaign] = []


class AdStats(BaseModel):
    total_ads: int = 0
    active_ads: int = 0
    with_lead_form: int = 0
    platforms: Dict[str, int] = {}
    media_types: Dict[str, int] = {}


class AdIngestionResponse(BaseModel):
    """
    Response model for ad ingestion operations.
    """
    success: bool = Field(..., description="Whether ingestion was successful")
    ad_id: Optional[int] = Field(None, description="ID of created/updated ad")
    competitor_id: Optional[int] = Field(None, description="ID of associated competitor")
    analysis_task_id: Optional[str] = Field(None, description="ID of triggered analysis task")
    message: str = Field(..., description="Human-readable result message")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "ad_id": 123,
                "competitor_id": 456,
                "analysis_task_id": "some-task-id",
                "message": "Ad ingested successfully and analysis task started."
            }
        }


class AdAnalysisResponseDTO(BaseModel):
    """
    DTO for AI analysis data in ad responses.
    """
    id: int = Field(..., description="Analysis ID")
    summary: Optional[str] = Field(None, description="AI-generated summary")
    hook_score: Optional[float] = Field(None, description="Hook effectiveness score (1-10)")
    overall_score: Optional[float] = Field(None, description="Overall ad effectiveness score (1-10)")
    confidence_score: Optional[float] = Field(None, description="AI confidence level (0-1)")
    target_audience: Optional[str] = Field(None, description="Target audience description")
    content_themes: Optional[List[str]] = Field(None, description="Identified content themes")
    analysis_version: Optional[str] = Field(None, description="Analysis version used")
    created_at: datetime = Field(..., description="Analysis creation timestamp")
    updated_at: datetime = Field(..., description="Analysis update timestamp")
    
    class Config:
        from_attributes = True


class AdResponseDTO(BaseModel):
    """
    DTO for ad data in list responses.
    """
    id: int = Field(..., description="Ad ID")
    ad_archive_id: str = Field(..., description="Facebook Ad Library ID")
    competitor: CompetitorResponseDTO = Field(..., description="Competitor information")
    
    # Ad content
    ad_copy: Optional[str] = Field(None, description="Main ad text/copy")
    main_title: Optional[str] = Field(None, description="Main title")
    main_body_text: Optional[str] = Field(None, description="Main body text")
    main_caption: Optional[str] = Field(None, description="Main caption")
    
    # Media information
    media_type: Optional[str] = Field(None, description="Type of media")
    media_url: Optional[str] = Field(None, description="Primary media URL")
    main_image_urls: Optional[List[str]] = Field(None, description="Main image URLs")
    main_video_urls: Optional[List[str]] = Field(None, description="Main video URLs")
    
    # Page information
    page_name: Optional[str] = Field(None, description="Page name")
    page_id: Optional[str] = Field(None, description="Page ID")
    
    # Platform and targeting
    publisher_platform: Optional[List[str]] = Field(None, description="Publisher platforms")
    targeted_countries: Optional[List[str]] = Field(None, description="Targeted countries")
    
    # Performance indicators
    impressions_text: Optional[str] = Field(None, description="Impressions text")
    spend: Optional[str] = Field(None, description="Spend amount")
    
    # Call-to-action
    cta_text: Optional[str] = Field(None, description="CTA text")
    cta_type: Optional[str] = Field(None, description="CTA type")
    
    # Dates
    date_found: datetime = Field(..., description="When ad was discovered")
    start_date: Optional[str] = Field(None, description="Ad start date")
    end_date: Optional[str] = Field(None, description="Ad end date")
    is_active: Optional[bool] = Field(None, description="Whether ad is active")
    
    # Timestamps
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")
    
    # AI Analysis (optional)
    analysis: Optional[AdAnalysisResponseDTO] = Field(None, description="AI analysis data")
    
    # New fields to match frontend_payload_final.json
    meta: Optional[AdMeta] = Field(None, description="Meta information about the ad")
    targeting: Optional[AdTargeting] = Field(None, description="Targeting information")
    lead_form: Optional[LeadForm] = Field(None, description="Lead form information")
    creatives: List[Creative] = Field(default_factory=list, description="Ad creatives")
    
    class Config:
        from_attributes = True


class AdDetailResponseDTO(BaseModel):
    """
    DTO for detailed ad data in single ad responses.
    """
    id: int = Field(..., description="Ad ID")
    ad_archive_id: str = Field(..., description="Facebook Ad Library ID")
    competitor: CompetitorResponseDTO = Field(..., description="Competitor information")
    
    # All ad content
    ad_copy: Optional[str] = Field(None, description="Main ad text/copy")
    main_title: Optional[str] = Field(None, description="Main title")
    main_body_text: Optional[str] = Field(None, description="Main body text")
    main_caption: Optional[str] = Field(None, description="Main caption")
    main_link_url: Optional[str] = Field(None, description="Main link URL")
    main_link_description: Optional[str] = Field(None, description="Main link description")
    
    # Media information
    media_type: Optional[str] = Field(None, description="Type of media")
    media_url: Optional[str] = Field(None, description="Primary media URL")
    main_image_urls: Optional[List[str]] = Field(None, description="Main image URLs")
    main_video_urls: Optional[List[str]] = Field(None, description="Main video URLs")
    
    # Page information
    page_name: Optional[str] = Field(None, description="Page name")
    page_id: Optional[str] = Field(None, description="Page ID")
    page_like_count: Optional[int] = Field(None, description="Page like count")
    page_categories: Optional[List[str]] = Field(None, description="Page categories")
    page_profile_uri: Optional[str] = Field(None, description="Page profile URI")
    page_profile_picture_url: Optional[str] = Field(None, description="Page profile picture URL")
    
    # Platform and targeting
    publisher_platform: Optional[List[str]] = Field(None, description="Publisher platforms")
    targeted_countries: Optional[List[str]] = Field(None, description="Targeted countries")
    display_format: Optional[str] = Field(None, description="Display format")
    
    # Performance indicators
    impressions_text: Optional[str] = Field(None, description="Impressions text")
    impressions_index: Optional[int] = Field(None, description="Impressions index")
    spend: Optional[str] = Field(None, description="Spend amount")
    currency: Optional[str] = Field(None, description="Currency")
    
    # Call-to-action
    cta_text: Optional[str] = Field(None, description="CTA text")
    cta_type: Optional[str] = Field(None, description="CTA type")
    
    # Additional content
    extra_texts: Optional[List[ExtraTextItemDTO]] = Field(None, description="Extra text content")
    extra_links: Optional[List[str]] = Field(None, description="Extra links")
    
    # Content flags
    contains_sensitive_content: Optional[bool] = Field(None, description="Contains sensitive content")
    contains_digital_created_media: Optional[bool] = Field(None, description="Contains digital created media")
    
    # Dates
    date_found: datetime = Field(..., description="When ad was discovered")
    start_date: Optional[str] = Field(None, description="Ad start date")
    end_date: Optional[str] = Field(None, description="Ad end date")
    is_active: Optional[bool] = Field(None, description="Whether ad is active")
    
    # Timestamps
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")
    
    # AI Analysis (optional)
    analysis: Optional[AdAnalysisResponseDTO] = Field(None, description="AI analysis data")
    
    # Raw data (optional)
    raw_data: Optional[Dict[str, Any]] = Field(None, description="Raw API response data")
    
    # New fields to match frontend_payload_final.json
    meta: Optional[AdMeta] = Field(None, description="Meta information about the ad")
    targeting: Optional[AdTargeting] = Field(None, description="Targeting information")
    lead_form: Optional[LeadForm] = Field(None, description="Lead form information")
    creatives: List[Creative] = Field(default_factory=list, description="Ad creatives")
    
    class Config:
        from_attributes = True


class PaginationMetadata(BaseModel):
    """
    DTO for pagination metadata.
    """
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Number of items per page")
    total_items: int = Field(..., description="Total number of items")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there's a next page")
    has_previous: bool = Field(..., description="Whether there's a previous page")


class PaginatedAdResponseDTO(BaseModel):
    """
    DTO for paginated ad responses.
    """
    data: List[AdResponseDTO] = Field(..., description="List of ads")
    pagination: PaginationMetadata = Field(..., description="Pagination metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "data": [
                    {
                        "id": 1,
                        "ad_archive_id": "1557310628577134",
                        "competitor": {
                            "page_id": "1591077094491398",
                            "page_name": "Binghatti"
                        },
                        "ad_copy": "ندعوك لحضور فعالية حصرية",
                        "media_type": "video",
                        "page_name": "Binghatti",
                        "analysis": {
                            "hook_score": 8.5,
                            "overall_score": 7.8,
                            "summary": "Exclusive real estate event invitation"
                        }
                    }
                ],
                "pagination": {
                    "page": 1,
                    "page_size": 20,
                    "total_items": 150,
                    "total_pages": 8,
                    "has_next": True,
                    "has_previous": False
                }
            }
        }


class AdStatsResponseDTO(BaseModel):
    """
    DTO for ad statistics response.
    """
    total_ads: int = Field(..., description="Total number of ads")
    active_ads: int = Field(..., description="Number of active ads")
    total_competitors: int = Field(..., description="Total number of competitors")
    active_competitors: int = Field(..., description="Number of active competitors")
    analyzed_ads: int = Field(..., description="Number of ads with AI analysis")
    analysis_coverage: float = Field(..., description="Percentage of ads with analysis")
    
    # Media type breakdown
    media_type_breakdown: Dict[str, int] = Field(..., description="Breakdown by media type")
    
    # Platform breakdown
    platform_breakdown: Dict[str, int] = Field(..., description="Breakdown by platform")
    
    # Recent activity
    recent_ads_7_days: int = Field(..., description="Ads added in last 7 days")
    recent_ads_30_days: int = Field(..., description="Ads added in last 30 days")
    
    # Analysis scores
    avg_hook_score: Optional[float] = Field(None, description="Average hook score")
    avg_overall_score: Optional[float] = Field(None, description="Average overall score")
    
    # Last update
    last_updated: datetime = Field(..., description="When stats were last updated")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_ads": 1250,
                "active_ads": 890,
                "total_competitors": 45,
                "active_competitors": 38,
                "analyzed_ads": 1100,
                "analysis_coverage": 88.0,
                "media_type_breakdown": {
                    "image": 650,
                    "video": 400,
                    "carousel": 200
                },
                "platform_breakdown": {
                    "FACEBOOK": 800,
                    "INSTAGRAM": 450
                },
                "recent_ads_7_days": 85,
                "recent_ads_30_days": 320,
                "avg_hook_score": 7.2,
                "avg_overall_score": 6.8,
                "last_updated": "2024-01-15T10:30:00Z"
            }
        } 