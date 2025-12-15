# Requirements Document

## Introduction

This specification defines enhancements to the existing video analysis system that leverages Google's Gemini AI to provide comprehensive marketing video analysis. The system currently analyzes video content to extract transcripts, performance metrics, marketing effectiveness scores, and detailed creative insights. This enhancement will improve the analysis capabilities, user experience, and reporting features to make the system more valuable for marketing professionals.

## Glossary

- **Video_Analysis_System**: The AI-powered system that processes marketing videos and advertisements to extract insights
- **Gemini_AI_Service**: Google's Generative AI service used for video content analysis
- **Marketing_Effectiveness_Score**: A numerical rating (0-10) evaluating how well a video performs for marketing purposes
- **Hook_Score**: A numerical rating (0-10) measuring how effectively a video captures viewer attention
- **Content_Beats**: Chronological segments of a video with timestamps and analysis of why each segment works
- **Generation_Prompts**: Detailed instructions for recreating video content using AI video generation tools
- **Target_Audience**: The primary demographic a video is designed to reach
- **Content_Themes**: Key topics, benefits, or messaging pillars covered in the video
- **Analysis_Cache**: Stored analysis results to avoid redundant processing and reduce costs

## Requirements

### Requirement 1

**User Story:** As a marketing analyst, I want to analyze video advertisements comprehensively, so that I can understand their effectiveness and extract actionable insights.

#### Acceptance Criteria

1. WHEN a user uploads a video file or provides a video URL, THE Video_Analysis_System SHALL process the content and extract a complete transcript
2. WHEN analyzing video content, THE Video_Analysis_System SHALL identify and extract on-screen text separately from spoken content
3. WHEN processing a video, THE Video_Analysis_System SHALL break the content into chronological beats with timestamps and explanations of marketing effectiveness
4. WHEN analysis is complete, THE Video_Analysis_System SHALL provide a storyboard that a video editor could follow
5. WHEN evaluating content, THE Video_Analysis_System SHALL assign both a Hook_Score and Marketing_Effectiveness_Score with detailed justification

### Requirement 2

**User Story:** As a content creator, I want to receive detailed generation prompts from analyzed videos, so that I can recreate similar high-performing content.

#### Acceptance Criteria

1. WHEN analyzing a video with generation prompts enabled, THE Video_Analysis_System SHALL produce detailed VEO-compatible prompts for each video segment
2. WHEN creating generation prompts, THE Video_Analysis_System SHALL ensure each prompt contains 400-900 words of specific direction
3. WHEN segmenting video content, THE Video_Analysis_System SHALL optimize clip boundaries to end at natural pause points for smooth merging
4. WHEN generating prompts, THE Video_Analysis_System SHALL maintain visual consistency across all segments including character appearance and environment
5. WHEN processing video duration, THE Video_Analysis_System SHALL target 7-8 seconds per generated clip with a maximum of 8.0 seconds

### Requirement 3

**User Story:** As a marketing manager, I want to understand target demographics and content themes, so that I can make informed decisions about campaign strategy.

#### Acceptance Criteria

1. WHEN analyzing video content, THE Video_Analysis_System SHALL identify the Target_Audience based on messaging, visuals, and offer
2. WHEN processing marketing content, THE Video_Analysis_System SHALL extract Content_Themes such as luxury, location, pricing, and amenities
3. WHEN evaluating effectiveness, THE Video_Analysis_System SHALL provide specific strengths of the video content
4. WHEN analysis is complete, THE Video_Analysis_System SHALL offer actionable recommendations for improvement
5. WHEN assessing marketing elements, THE Video_Analysis_System SHALL evaluate hook effectiveness, offer clarity, benefits presentation, proof elements, objection handling, and call-to-action strength

### Requirement 4

**User Story:** As a system administrator, I want efficient caching and cost management, so that I can control analysis expenses while maintaining performance.

#### Acceptance Criteria

1. WHEN processing identical video content, THE Video_Analysis_System SHALL reuse cached analysis results to avoid redundant API calls
2. WHEN creating analysis caches, THE Video_Analysis_System SHALL store results with configurable time-to-live settings
3. WHEN managing API usage, THE Video_Analysis_System SHALL log token consumption and estimated costs for billing tracking
4. WHEN API keys fail, THE Video_Analysis_System SHALL automatically rotate to backup keys to ensure service continuity
5. WHEN cache settings are modified, THE Video_Analysis_System SHALL respect user preferences for cache enablement and duration

### Requirement 5

**User Story:** As a content analyst, I want to analyze both video and image content, so that I can create comprehensive content strategies across different media types.

#### Acceptance Criteria

1. WHEN provided with a static image and script, THE Video_Analysis_System SHALL generate image-to-video animation directions
2. WHEN processing image content, THE Video_Analysis_System SHALL analyze lighting, color palette, setting, props, and character appearance in detail
3. WHEN creating animation prompts, THE Video_Analysis_System SHALL focus on natural movements like talking, eye contact, and subtle gestures
4. WHEN generating image-based content, THE Video_Analysis_System SHALL maintain the exact visual elements from the source image without hallucination
5. WHEN processing voice parameters, THE Video_Analysis_System SHALL incorporate specified voice energy, language, and accent preferences

### Requirement 6

**User Story:** As a video platform manager, I want to support multiple video sources, so that I can analyze content from various social media and advertising platforms.

#### Acceptance Criteria

1. WHEN processing Instagram video URLs, THE Video_Analysis_System SHALL download content using yt-dlp with audio preservation
2. WHEN handling Facebook Ad Library URLs, THE Video_Analysis_System SHALL resolve and download direct MP4 files
3. WHEN encountering download failures, THE Video_Analysis_System SHALL fall back to HTTP streaming methods
4. WHEN processing different video formats, THE Video_Analysis_System SHALL handle various aspect ratios and resolutions
5. WHEN managing file uploads, THE Video_Analysis_System SHALL use resumable upload protocols for large video files

### Requirement 7

**User Story:** As a data analyst, I want comprehensive usage tracking and error handling, so that I can monitor system performance and troubleshoot issues effectively.

#### Acceptance Criteria

1. WHEN API calls are made, THE Video_Analysis_System SHALL log detailed usage metadata including token counts and costs
2. WHEN errors occur during processing, THE Video_Analysis_System SHALL provide clear error messages and fallback options
3. WHEN processing fails with one API key, THE Video_Analysis_System SHALL automatically attempt with alternative keys
4. WHEN analysis is complete, THE Video_Analysis_System SHALL store results with proper versioning and metadata
5. WHEN system settings are changed, THE Video_Analysis_System SHALL validate configuration and provide feedback on changes

### Requirement 8

**User Story:** As a marketing team lead, I want flexible analysis modes, so that I can choose between detailed analysis with prompts or lightweight analysis for quick insights.

#### Acceptance Criteria

1. WHEN selecting analysis mode, THE Video_Analysis_System SHALL offer both "Heavy" mode with generation prompts and "Light" mode for analysis only
2. WHEN using Light mode, THE Video_Analysis_System SHALL focus exclusively on transcript, beats, summary, scores, and recommendations
3. WHEN switching between modes, THE Video_Analysis_System SHALL respect cached results only when they match the requested analysis depth
4. WHEN processing in Heavy mode, THE Video_Analysis_System SHALL include comprehensive generation prompts with technical specifications
5. WHEN analysis preferences are set, THE Video_Analysis_System SHALL remember user preferences for future analyses