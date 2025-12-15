# Design Document

## Overview

The Video Analysis Enhancement system builds upon the existing Google AI service to provide comprehensive marketing video analysis capabilities. The system leverages Google's Gemini AI models to extract detailed insights from video content, including transcripts, performance metrics, generation prompts, and strategic recommendations. This design enhances the current implementation with improved user experience, better error handling, comprehensive reporting, and flexible analysis modes.

## Architecture

The system follows a layered architecture pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Analysis UI     │  │ Results Display │  │ Settings    │ │
│  │ Components      │  │ Components      │  │ Management  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Analysis        │  │ Cache           │  │ Settings    │ │
│  │ Endpoints       │  │ Management      │  │ Endpoints   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                  Service Layer                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Enhanced        │  │ Cache           │  │ Usage       │ │
│  │ Analysis        │  │ Service         │  │ Tracking    │ │
│  │ Service         │  │                 │  │ Service     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                 External Services                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Google Gemini   │  │ Video Download  │  │ File        │ │
│  │ API             │  │ Services        │  │ Storage     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Enhanced Analysis Service

The core service that orchestrates video analysis workflows:

```python
class EnhancedAnalysisService:
    def analyze_video(
        self, 
        video_source: VideoSource,
        analysis_mode: AnalysisMode,
        options: AnalysisOptions
    ) -> AnalysisResult
    
    def get_analysis_status(self, analysis_id: str) -> AnalysisStatus
    def get_cached_analysis(self, video_hash: str) -> Optional[AnalysisResult]
    def invalidate_cache(self, video_hash: str) -> bool
```

### Video Source Handler

Manages different video input types and download strategies:

```python
class VideoSourceHandler:
    def download_video(self, source: VideoSource) -> LocalVideoFile
    def validate_source(self, source: VideoSource) -> ValidationResult
    def get_video_metadata(self, source: VideoSource) -> VideoMetadata
```

### Analysis Cache Manager

Handles intelligent caching of analysis results:

```python
class AnalysisCacheManager:
    def get_cache_key(self, video_hash: str, analysis_config: dict) -> str
    def store_analysis(self, cache_key: str, result: AnalysisResult) -> bool
    def retrieve_analysis(self, cache_key: str) -> Optional[AnalysisResult]
    def cleanup_expired_cache(self) -> int
```

### Usage Tracking Service

Monitors API usage and costs:

```python
class UsageTrackingService:
    def log_api_usage(self, usage_data: ApiUsageData) -> None
    def get_usage_summary(self, time_range: TimeRange) -> UsageSummary
    def estimate_analysis_cost(self, video_metadata: VideoMetadata) -> CostEstimate
```

## Data Models

### Analysis Request

```python
@dataclass
class AnalysisRequest:
    video_source: VideoSource
    analysis_mode: AnalysisMode  # LIGHT, HEAVY
    include_prompts: bool
    voice_energy: Optional[str]
    language: Optional[str]
    accent: Optional[str]
    custom_instruction: Optional[str]
    cache_enabled: bool = True
```

### Analysis Result

```python
@dataclass
class AnalysisResult:
    transcript: str
    beats: List[ContentBeat]
    summary: str
    strengths: List[str]
    recommendations: List[str]
    text_on_video: str
    voice_over: str
    storyboard: List[str]
    hook_score: float
    overall_score: float
    target_audience: str
    content_themes: List[str]
    generation_prompts: Optional[List[str]]
    analysis_metadata: AnalysisMetadata
```

### Content Beat

```python
@dataclass
class ContentBeat:
    start_time: str  # "00:00"
    end_time: str    # "00:05"
    summary: str
    why_it_works: str
    marketing_elements: List[str]
    effectiveness_score: float
```

### Analysis Metadata

```python
@dataclass
class AnalysisMetadata:
    analysis_id: str
    created_at: datetime
    model_used: str
    analysis_mode: AnalysisMode
    processing_time_seconds: float
    token_usage: TokenUsage
    estimated_cost: float
    cache_hit: bool
    video_metadata: VideoMetadata
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Complete Analysis Output
*For any* valid video input, the analysis result should contain all required fields (transcript, beats, summary, strengths, recommendations, scores, target_audience, content_themes) with non-empty values
**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4**

### Property 2: Score Range Validation
*For any* analysis result, both hook_score and overall_score should be numeric values between 0.0 and 10.0 inclusive
**Validates: Requirements 1.5**

### Property 3: Content Beat Chronological Order
*For any* analysis result, the content beats should be in chronological order with no overlapping time ranges and complete coverage of the video duration
**Validates: Requirements 1.3**

### Property 4: Generation Prompt Mode Consistency
*For any* analysis request in HEAVY mode, the result should include generation_prompts, and for LIGHT mode, generation_prompts should be null or empty
**Validates: Requirements 2.1, 8.1, 8.2, 8.4**

### Property 5: Prompt Word Count Compliance
*For any* generated prompt in HEAVY mode, the word count should be between 400 and 900 words
**Validates: Requirements 2.2**

### Property 6: Prompt Duration Constraints
*For any* generation prompt, the specified duration should be between 1.0 and 8.0 seconds
**Validates: Requirements 2.5**

### Property 7: Visual Consistency Across Prompts
*For any* set of generation prompts from the same video, character descriptions and environment descriptions should remain consistent across all prompts
**Validates: Requirements 2.4**

### Property 8: Cache Consistency
*For any* video with identical content hash and analysis configuration, repeated analysis requests should return equivalent results when cache is enabled
**Validates: Requirements 4.1**

### Property 9: API Key Rotation on Failure
*For any* failed API request due to authentication or rate limiting, the system should attempt the request with the next available API key before reporting failure
**Validates: Requirements 4.4, 7.3**

### Property 10: Usage Logging Completeness
*For any* successful API call, usage metadata including token counts and estimated costs should be logged to the database
**Validates: Requirements 4.3, 7.1**

### Property 11: Video Source Format Support
*For any* supported video URL format (Instagram, Facebook, direct MP4), the system should successfully detect the format and apply the appropriate download strategy
**Validates: Requirements 6.1, 6.2, 6.4**

### Property 12: Image-to-Video Mode Detection
*For any* analysis request with image input, the system should generate animation directions and include voice parameter specifications when provided
**Validates: Requirements 5.1, 5.3, 5.5**

### Property 13: Cache Mode Matching
*For any* cached analysis result, it should only be returned if the analysis mode (LIGHT/HEAVY) matches the requested mode
**Validates: Requirements 8.3**

### Property 14: Error Message Provision
*For any* processing error, the system should provide a non-empty error message with actionable information
**Validates: Requirements 7.2**

### Property 15: Configuration Validation
*For any* system configuration change, invalid configurations should be rejected and valid configurations should be accepted and applied
**Validates: Requirements 7.5**

## Error Handling

The system implements comprehensive error handling with graceful degradation:

### API Failure Handling
- Automatic API key rotation on authentication failures
- Exponential backoff for rate limiting
- Fallback to alternative AI providers when configured
- Clear error messages with suggested remediation steps

### Video Processing Errors
- Multiple download strategies with fallback mechanisms
- Validation of video format and size before processing
- Timeout handling for large video downloads
- Partial analysis recovery when possible

### Cache Management Errors
- Graceful handling of cache corruption or expiration
- Automatic cache cleanup for storage management
- Fallback to fresh analysis when cache retrieval fails

## Testing Strategy

### Unit Testing Approach
The system will use comprehensive unit tests to verify individual component functionality:

- **Service Layer Tests**: Mock external dependencies and test business logic
- **Data Model Tests**: Validate serialization, deserialization, and data integrity
- **Error Handling Tests**: Simulate failure conditions and verify recovery mechanisms
- **Cache Logic Tests**: Test cache key generation, storage, and retrieval logic

### Property-Based Testing Approach
The system will implement property-based tests using the Hypothesis library for Python to verify correctness properties across a wide range of inputs:

- **Configuration**: Each property test will run a minimum of 100 iterations
- **Test Tagging**: Each property-based test will include a comment referencing the specific correctness property from this design document
- **Format**: Tests will use the format `# Feature: video-analysis-enhancement, Property X: [property description]`

**Property-based testing requirements**:
- Use Hypothesis library for generating test data
- Generate realistic video metadata, analysis configurations, and API responses
- Test edge cases like empty videos, maximum duration videos, and malformed inputs
- Verify properties hold across different analysis modes and configuration combinations
- Test cache behavior with various TTL settings and storage conditions

**Unit testing requirements**:
- Focus on specific examples and integration points between components
- Test error conditions and boundary cases
- Verify API integration points with mocked responses
- Test configuration loading and validation logic

Together, unit tests and property-based tests provide comprehensive coverage: unit tests catch concrete implementation bugs, while property tests verify that the system maintains correctness guarantees across all possible inputs and configurations.