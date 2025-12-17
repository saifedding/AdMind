# Ads React Architecture Design Document

## Overview

This design document outlines the architecture for a comprehensive ads intelligence platform built with React. The system provides advanced ad discovery, analysis, and management capabilities with AI-powered insights, performance tracking, and sophisticated filtering options. The architecture emphasizes modularity, performance, and maintainability while delivering a rich user experience across desktop and mobile devices.

## Architecture

### High-Level Architecture

The system follows a feature-based architecture pattern with clear separation of concerns:

```
src/
├── features/
│   └── ads/
│       ├── components/          # UI components
│       ├── hooks/              # Custom React hooks
│       ├── pages/              # Page components
│       ├── services/           # API and business logic
│       ├── types/              # TypeScript definitions
│       └── utils/              # Utility functions
├── shared/
│   ├── components/             # Reusable UI components
│   ├── hooks/                  # Shared hooks
│   ├── services/               # Shared services
│   └── utils/                  # Shared utilities
└── lib/
    ├── api/                    # API client and types
    └── utils/                  # Core utilities
```

### State Management Strategy

- **Local State**: React useState and useReducer for component-specific state
- **Server State**: React Query/TanStack Query for API data management and caching
- **URL State**: Next.js router for filter and pagination state persistence
- **Global State**: Context API for user preferences and theme settings

### Data Flow Architecture

1. **API Layer**: Centralized API client with type-safe interfaces
2. **Service Layer**: Business logic and data transformation
3. **Hook Layer**: Custom hooks for state management and side effects
4. **Component Layer**: Pure UI components with minimal business logic

## Components and Interfaces

### Core Components

#### AdsPage
- **Purpose**: Main page component orchestrating the ads listing experience
- **Props**: None (uses URL parameters)
- **State**: Manages view settings, selection state, and filter application
- **Children**: AdStats, AdFilters, AdGrid/AdList, Pagination, BulkActionToolbar
- **Features**: Real-time filtering, view switching, bulk operations, export functionality

#### AdCard
- **Purpose**: Individual ad display component with media, metadata, and actions
- **Props**: `ad: AdWithAnalysis`, `isSelected?: boolean`, `onSelectionChange?: Function`
- **Features**: Media carousel, favorite toggle, bulk selection, refresh actions, add to lists
- **Responsive**: Adapts layout for different screen sizes
- **Actions**: Save/unsave, refresh media, add to favorite lists, analysis status

#### AdDetailPage
- **Purpose**: Detailed view of individual ads with full analysis and media
- **Props**: `id: string` (from URL parameters)
- **Features**: Media viewer, analysis display, action buttons, related ads, VEO integration
- **Sections**: Header, media viewer, performance insights, analysis showcase, content cards, creatives, raw data

#### AdMediaViewer
- **Purpose**: Handles display of ad media (images/videos) with appropriate controls
- **Props**: `ad: AdWithAnalysis`, `currentIndex: number`, `onIndexChange: Function`
- **Features**: Video controls, image optimization, carousel navigation, fullscreen mode

#### AdFilters
- **Purpose**: Advanced filtering interface with multiple criteria
- **Props**: `onApplyFilters: Function`, `currentFilters: AdFilterParams`
- **Features**: Score sliders, date pickers, dropdown selectors, search input, advanced toggles
- **Filters**: Competitor, media type, status, favorites, performance scores, duration, date ranges

#### AdStats
- **Purpose**: Dashboard statistics display
- **Props**: `stats: AdStatsData`
- **Features**: Animated counters, performance indicators, visual metrics
- **Metrics**: Total ads, analyzed ads, average score, high performers, active ads

#### UnifiedAnalysisPanel
- **Purpose**: Advanced AI analysis interface with multiple analysis types
- **Props**: `adId: number`, `adSetId?: number`, `showAdSetAnalysis?: boolean`
- **Features**: Individual and ad set analysis, custom instructions, prompt generation
- **Analysis Types**: Video analysis, performance insights, competitive analysis

#### AdDetailActions
- **Purpose**: Action bar for ad detail page with comprehensive controls
- **Props**: `ad: AdWithAnalysis`, `isFavorite: boolean`, `onActions: Function`
- **Actions**: Back navigation, favorite toggle, share menu, refresh, VEO generation

#### AdPerformanceInsights
- **Purpose**: Performance metrics and AI-generated insights display
- **Props**: `analysis: AdAnalysis`
- **Features**: Score visualization, performance categories, recommendations

#### AdAnalysisShowcase
- **Purpose**: Comprehensive analysis results with detailed breakdowns
- **Props**: `analysis: AdAnalysis`
- **Features**: Beats analysis, storyboard, strengths, recommendations, target audience

#### AdContentCards
- **Purpose**: Structured display of ad content elements
- **Props**: `ad: AdWithAnalysis`, `currentCreative: Creative`
- **Features**: Title, body text, CTA, targeting info, metadata cards

#### AdCreativesSection
- **Purpose**: Gallery view of all ad creatives with detailed information
- **Props**: `creatives: Creative[]`
- **Features**: Creative thumbnails, metadata, media type indicators

#### AdRawDataSection
- **Purpose**: Developer-friendly raw data display with JSON viewer
- **Props**: `ad: AdWithAnalysis`
- **Features**: Collapsible JSON, formatted display, copy functionality

#### BulkActionToolbar
- **Purpose**: Bulk operations interface for selected ads
- **Props**: `selectedCount: number`, `onActions: Function`
- **Actions**: Bulk delete, bulk export, bulk analysis, clear selection

#### AdViewControls
- **Purpose**: View customization controls (grid/list, columns, search)
- **Props**: `viewSettings: AdViewSettings`, `onViewChange: Function`
- **Features**: View toggle, column selector, search input, refresh button

#### AdEmptyState
- **Purpose**: Empty state display with helpful actions
- **Props**: `filters: AdFilterParams`, `onActions: Function`
- **Features**: No results message, filter suggestions, reset options

#### AdErrorState
- **Purpose**: Error state display with recovery options
- **Props**: `error: string`, `onRetry: Function`
- **Features**: Error message, retry button, troubleshooting tips

#### AdLoadingState
- **Purpose**: Loading state with skeleton components
- **Props**: `stats?: AdStatsData`
- **Features**: Skeleton cards, loading indicators, progress feedback

#### FavoriteListsManager
- **Purpose**: Favorite lists management interface
- **Props**: `adId?: number`, `onListChange: Function`
- **Features**: Create lists, add/remove ads, list organization, search lists

#### ExportDialog
- **Purpose**: Data export configuration and execution
- **Props**: `selectedAds: number[]`, `onExport: Function`
- **Features**: Format selection, field customization, progress tracking

#### AnalysisStatusBadge
- **Purpose**: Visual indicator of analysis status with action buttons
- **Props**: `adId: number`, `hasAnalysis: boolean`, `onAnalyze: Function`
- **Features**: Status indication, analyze button, progress tracking

### Hook Interfaces

#### useAds
```typescript
interface UseAdsReturn {
  ads: AdWithAnalysis[];
  loading: boolean;
  error: string | null;
  stats: AdStatsData;
  filters: AdFilterParams;
  viewSettings: AdViewSettings;
  selectionState: AdSelectionState;
  totalItems: number;
  totalPages: number;
  setViewMode: (mode: 'grid' | 'list') => void;
  setGridColumns: (columns: 2 | 3 | 4 | 5) => void;
  handleApplyFilters: (filters: AdFilterParams) => void;
  handleResetFilters: () => void;
  handleSearch: (query: string) => void;
  handleRemoveFilter: (key: keyof AdFilterParams) => void;
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (pageSize: number) => void;
  handleAdSelection: (adId: number, selected: boolean) => void;
  handleSelectAll: (selected: boolean) => void;
  handleClearSelection: () => void;
  handleBulkDelete: () => Promise<void>;
  handleSaveToggle: (adId: number, isSaved: boolean) => void;
  handleRefresh: () => void;
}
```

#### useAdDetail
```typescript
interface UseAdDetailReturn {
  ad: AdWithAnalysis | null;
  loading: boolean;
  error: string | null;
  currentCreativeIndex: number;
  isRefreshing: boolean;
  analysis: AnalysisResponse | null;
  analyzing: boolean;
  isAnalyzingSet: boolean;
  hookScore: number;
  isFavorite: boolean;
  showShareMenu: boolean;
  setCurrentCreativeIndex: (index: number) => void;
  setShowShareMenu: (show: boolean) => void;
  handleRefresh: () => Promise<void>;
  handleToggleFavorite: () => Promise<void>;
  handleShare: (type: 'copy' | 'download') => Promise<void>;
  analyzeCurrentAd: () => Promise<void>;
  analyzeAdSetBestVariant: () => Promise<void>;
  formatAdDuration: (start?: string, end?: string, isActive?: boolean) => AdDuration;
}
```

#### useUnifiedAnalysis
```typescript
interface UseUnifiedAnalysisReturn {
  analysis: UnifiedAnalysisResponse | null;
  loading: boolean;
  error: string | null;
  taskId: string | null;
  progress: number;
  analyzeAd: (request: UnifiedAnalysisRequest) => Promise<void>;
  analyzeAdSet: (request: UnifiedAnalysisRequest) => Promise<void>;
  regenerateAnalysis: (instruction: string) => Promise<void>;
  getAnalysisHistory: () => Promise<AnalysisHistoryItem[]>;
  clearAnalysis: () => Promise<void>;
}
```

#### useFavoriteLists
```typescript
interface UseFavoriteListsReturn {
  lists: FavoriteList[];
  loading: boolean;
  error: string | null;
  createList: (data: CreateListRequest) => Promise<FavoriteList>;
  updateList: (id: number, data: UpdateListRequest) => Promise<FavoriteList>;
  deleteList: (id: number) => Promise<void>;
  addAdToList: (listId: number, adId: number) => Promise<void>;
  removeAdFromList: (listId: number, adId: number) => Promise<void>;
  getAdLists: (adId: number) => Promise<number[]>;
}
```

#### useExport
```typescript
interface UseExportReturn {
  exporting: boolean;
  progress: number;
  error: string | null;
  exportAds: (config: ExportConfig) => Promise<void>;
  exportAnalysis: (adIds: number[]) => Promise<void>;
  downloadResults: (format: 'json' | 'csv' | 'xlsx') => Promise<void>;
}
```

#### useVeoIntegration
```typescript
interface UseVeoIntegrationReturn {
  generating: boolean;
  progress: number;
  error: string | null;
  generations: VeoGeneration[];
  generateVideo: (prompt: string, config: VeoConfig) => Promise<void>;
  getGenerations: (adId: number) => Promise<VeoGeneration[]>;
  mergeVideos: (videoUrls: string[]) => Promise<MergedVideo>;
  getMergedVideos: (adId: number) => Promise<MergedVideo[]>;
}
```

### Service Interfaces

#### AdsService
```typescript
interface AdsService {
  getAds(filters: AdFilterParams): Promise<PaginatedAdsResponse>;
  getAdById(id: number): Promise<AdWithAnalysis>;
  getAdsInSet(adSetId: number, page?: number, pageSize?: number): Promise<PaginatedAdsResponse>;
  toggleFavorite(id: number): Promise<FavoriteResponse>;
  toggleAdSetFavorite(adSetId: number): Promise<FavoriteResponse>;
  bulkDeleteAds(ids: number[]): Promise<BulkDeleteResponse>;
  refreshMedia(id: number): Promise<RefreshResponse>;
  refreshAdSetMedia(adSetId: number): Promise<RefreshResponse>;
  saveAdContent(id: number): Promise<SaveResponse>;
  unsaveAdContent(id: number): Promise<SaveResponse>;
  searchAds(query: string, limit?: number): Promise<AdWithAnalysis[]>;
  getTopPerformingAds(limit?: number): Promise<AdWithAnalysis[]>;
}
```

#### AnalysisService
```typescript
interface AnalysisService {
  analyzeAd(adId: number, request: AnalysisRequest): Promise<AnalysisResponse>;
  getAnalysis(adId: number, version?: number): Promise<AnalysisResponse>;
  getAnalysisHistory(adId: number): Promise<AnalysisHistoryResponse>;
  regenerateAnalysis(adId: number, instruction: string): Promise<AnalysisResponse>;
  deleteAnalysis(adId: number): Promise<void>;
  followupQuestion(adId: number, question: string): Promise<FollowupResponse>;
  getTaskStatus(taskId: string): Promise<TaskStatusResponse>;
  unifiedAnalyzeAd(adId: number, request: UnifiedAnalysisRequest): Promise<UnifiedAnalysisTaskResponse>;
  unifiedAnalyzeAdSet(adSetId: number, request: UnifiedAnalysisRequest): Promise<UnifiedAdSetAnalysisTaskResponse>;
}
```

#### FavoritesService
```typescript
interface FavoritesService {
  getLists(): Promise<FavoriteListsResponse>;
  getList(id: number): Promise<FavoriteListWithItems>;
  createList(data: CreateListRequest): Promise<FavoriteList>;
  updateList(id: number, data: UpdateListRequest): Promise<FavoriteList>;
  deleteList(id: number): Promise<void>;
  addAdToList(listId: number, adId: number, notes?: string): Promise<FavoriteItem>;
  removeAdFromList(listId: number, adId: number): Promise<void>;
  getAdLists(adId: number): Promise<{ list_ids: number[] }>;
  getAllFavoritesWithAds(): Promise<{ lists: FavoriteListWithItems[] }>;
  ensureDefaultList(): Promise<FavoriteList>;
}
```

#### ExportService
```typescript
interface ExportService {
  exportAds(config: ExportConfig): Promise<ExportResponse>;
  exportAnalysis(adIds: number[], format: ExportFormat): Promise<ExportResponse>;
  getExportStatus(taskId: string): Promise<ExportStatusResponse>;
  downloadExport(exportId: string): Promise<Blob>;
}
```

#### VeoService
```typescript
interface VeoService {
  generateVideo(data: VeoGenerateRequest): Promise<VeoGenerateResponse>;
  generateVideoAsync(data: VeoGenerateAsyncRequest): Promise<VeoGenerateAsyncResponse>;
  getTaskStatus(taskId: string): Promise<VeoTaskStatusResponse>;
  getCredits(): Promise<VeoCredits>;
  getModels(): Promise<VeoModelsResponse>;
  saveGeneration(data: VeoGenerationCreate): Promise<VeoGenerationResponse>;
  getGenerations(adId?: number): Promise<VeoGenerationResponse[]>;
  mergeVideos(data: MergeVideosRequest): Promise<MergeVideosResponse>;
  getMergedVideos(adId?: number): Promise<MergedVideoResponse[]>;
}
```

## Data Models

### Core Data Types

#### AdWithAnalysis
```typescript
interface AdWithAnalysis {
  id: number;
  ad_archive_id: string;
  competitor?: Competitor;
  
  // Content
  main_title?: string;
  main_body_text?: string;
  main_caption?: string;
  
  // Media
  media_type?: string;
  media_url?: string;
  creatives?: Creative[];
  
  // Metadata
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  duration_days?: number;
  
  // Analysis
  analysis?: AdAnalysis;
  is_analyzed?: boolean;
  
  // Ad Set
  ad_set_id?: number;
  variant_count?: number;
  
  // User preferences
  is_favorite?: boolean;
}
```

#### Creative
```typescript
interface Creative {
  id: string;
  title?: string;
  body?: string;
  caption?: string;
  media?: CreativeMedia[];
  cta?: {
    text?: string;
    type?: string;
  };
}
```

#### AdAnalysis
```typescript
interface AdAnalysis {
  id: number;
  summary?: string;
  hook_score?: number;
  overall_score?: number;
  confidence_score?: number;
  target_audience?: string;
  content_themes?: string[];
  strengths?: string[];
  recommendations?: string[];
}
```

### Filter and View Types

#### AdFilterParams
```typescript
interface AdFilterParams {
  page?: number;
  page_size?: number;
  competitor_id?: number;
  competitor_name?: string;
  media_type?: string;
  is_active?: boolean;
  is_favorite?: boolean;
  has_analysis?: boolean;
  min_overall_score?: number;
  max_overall_score?: number;
  min_hook_score?: number;
  max_hook_score?: number;
  min_duration_days?: number;
  max_duration_days?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}
```

#### AdViewSettings
```typescript
interface AdViewSettings {
  viewMode: 'grid' | 'list';
  gridColumns: 2 | 3 | 4 | 5;
}
```

#### AdSelectionState
```typescript
interface AdSelectionState {
  selectedAds: Set<number>;
  isDeleting: boolean;
  deletingAds: Set<number>;
}
```

#### AdStatsData
```typescript
interface AdStatsData {
  totalAds: number;
  highScoreAds: number;
  avgScore: number;
  activeAds: number;
  analyzedAds: number;
}
```

### Analysis and AI Types

#### UnifiedAnalysisRequest
```typescript
interface UnifiedAnalysisRequest {
  video_url?: string;
  custom_instruction?: string;
  generate_prompts?: boolean;
  force_reanalyze?: boolean;
}
```

#### UnifiedAnalysisResponse
```typescript
interface UnifiedAnalysisResponse {
  success: boolean;
  analysis_id?: number;
  ad_id: number;
  transcript?: string;
  summary?: string;
  beats?: AnalysisBeat[];
  storyboard?: string[];
  generation_prompts?: string[];
  strengths?: string[];
  recommendations?: string[];
  hook_score?: number;
  overall_score?: number;
  target_audience?: string;
  content_themes?: string[];
  text_on_video?: string;
  voice_over?: string;
  custom_instruction?: string;
  token_usage?: TokenUsage;
  cost?: number;
  raw?: any;
  message: string;
  source?: string;
}
```

#### AnalysisBeat
```typescript
interface AnalysisBeat {
  start?: string;
  end?: string;
  summary: string;
  why_it_works?: string;
}
```

### VEO Integration Types

#### VeoGenerateRequest
```typescript
interface VeoGenerateRequest {
  prompt: string;
  aspect_ratio?: string;
  video_model_key?: string;
  seed?: number;
  ad_id?: number;
  timeout_sec?: number;
  poll_interval_sec?: number;
}
```

#### VeoGeneration
```typescript
interface VeoGeneration {
  id: number;
  ad_id?: number;
  prompt: string;
  video_url: string;
  model_key: string;
  aspect_ratio: string;
  seed?: number;
  generation_metadata?: Record<string, any>;
  created_at: string;
}
```

### Export Types

#### ExportConfig
```typescript
interface ExportConfig {
  format: 'json' | 'csv' | 'xlsx';
  fields: string[];
  includeAnalysis: boolean;
  includeMedia: boolean;
  filters?: AdFilterParams;
}
```

#### ExportResponse
```typescript
interface ExportResponse {
  success: boolean;
  export_id: string;
  download_url?: string;
  file_size?: number;
  record_count: number;
  message: string;
}
```

### Favorite Lists Types

#### FavoriteList
```typescript
interface FavoriteList {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_default: boolean;
  item_count: number;
  created_at: string;
  updated_at: string;
}
```

#### FavoriteItem
```typescript
interface FavoriteItem {
  id: number;
  list_id: number;
  ad_id: number;
  notes?: string;
  created_at: string;
  ad?: AdWithAnalysis;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After reviewing all properties identified in the prework analysis, I've identified several areas where properties can be consolidated:

- Filter application properties (1.2, 1.3, 6.1, 6.4, 18.1, 18.2) can be combined into comprehensive filter and search behavior properties
- UI update properties (4.1, 7.5, 8.3) share similar reactivity patterns and can be consolidated
- Media handling properties (3.1, 3.2, 3.3) can be combined into comprehensive media display properties
- Analysis display properties (5.1, 5.2, 5.3, 11.2, 11.3) can be consolidated into analysis completeness properties
- Error handling properties (9.5, 17.1, 17.2, 17.3, 17.4, 17.5) can be combined into comprehensive error management properties
- Export and generation properties (12.1, 12.2, 12.3, 13.1, 13.3) can be consolidated into data processing properties

### Core Properties

**Property 1: Filter and search application correctness**
*For any* combination of valid filters, search queries, and boolean operators applied to the ads system, the resulting ad list should contain only ads that match all applied criteria
**Validates: Requirements 1.2, 1.3, 6.1, 6.4, 18.1, 18.2**

**Property 2: View mode switching preserves data**
*For any* ads dataset and view configuration (grid columns 2-5, list mode), switching view modes should display the same ads with appropriate layout without data loss
**Validates: Requirements 1.4**

**Property 3: Sorting produces correct order**
*For any* sort criteria and ads dataset, the resulting order should correctly reflect the chosen sort field and direction (ascending/descending)
**Validates: Requirements 1.5**

**Property 4: Navigation preserves context**
*For any* ad card clicked, navigation to detail view should display the correct ad data and allow return to the previous list state
**Validates: Requirements 2.1**

**Property 5: Media display matches content type**
*For any* ad with media content, the displayed media controls and interface should match the media type (video controls for videos, image display for images)
**Validates: Requirements 2.3, 3.1, 3.2**

**Property 6: Carousel navigation consistency**
*For any* ad with multiple creatives, carousel navigation should correctly cycle through all creatives and maintain proper index bounds
**Validates: Requirements 2.2, 3.3**

**Property 7: Favorite state persistence**
*For any* ad marked as favorite, the favorite state should persist across page refreshes and be reflected in both the ad card and detail views
**Validates: Requirements 4.1**

**Property 8: List management operations**
*For any* favorite list operations (create, edit, delete, add/remove ads), the changes should be immediately reflected in the UI and persist across sessions
**Validates: Requirements 4.2, 4.3, 4.5, 14.1, 14.2, 14.3**

**Property 9: Analysis data completeness**
*For any* ad with analysis data, all available analysis fields (scores, insights, recommendations, transcripts, beats, storyboards) should be displayed in the appropriate UI sections
**Validates: Requirements 5.1, 5.2, 5.3, 11.2, 11.3**

**Property 10: Bulk operations consistency**
*For any* set of selected ads, bulk operations should affect exactly the selected ads and provide appropriate feedback for success/failure states
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

**Property 11: Statistics accuracy**
*For any* ads dataset, displayed statistics (total count, analyzed count, average scores) should accurately reflect the current filtered dataset
**Validates: Requirements 8.2, 8.3**

**Property 12: Comprehensive error handling**
*For any* error condition (network failure, invalid data, missing resources, timeouts, quota limits), the system should display appropriate error messages and provide recovery options
**Validates: Requirements 9.5, 17.1, 17.2, 17.3, 17.4, 17.5**

**Property 13: Refresh operations update data**
*For any* refresh operation (individual ad or ad set), the operation should update the relevant data and reflect changes in the UI immediately
**Validates: Requirements 10.1, 10.2, 10.4**

**Property 14: Loading state management**
*For any* asynchronous operation (API calls, media loading, analysis processing, exports, video generation), appropriate loading indicators should be displayed and removed when operations complete
**Validates: Requirements 5.5, 8.5, 10.3, 12.4, 13.2**

**Property 15: Responsive layout adaptation**
*For any* screen size change, the layout should adapt appropriately while maintaining functionality and readability
**Validates: Requirements 9.1**

**Property 16: Unified analysis functionality**
*For any* analysis request (individual ad or ad set), the system should support custom instructions, generate appropriate analysis components, and maintain version history
**Validates: Requirements 11.1, 11.4, 11.5**

**Property 17: Export data integrity**
*For any* export configuration and format selection, the exported data should accurately reflect the selected fields and filters with proper formatting
**Validates: Requirements 12.1, 12.2, 12.3, 12.5**

**Property 18: VEO generation workflow**
*For any* video generation request, the system should process prompts correctly, track progress, save results, and associate them with source ads
**Validates: Requirements 13.1, 13.2, 13.3, 13.5**

**Property 19: Video merging consistency**
*For any* set of video clips selected for merging, the system should combine them into a cohesive final video with proper sequencing and quality
**Validates: Requirements 13.4**

**Property 20: Ad set management coherence**
*For any* ad set operations (viewing, navigation, analysis, bulk actions), the system should maintain proper relationships between variants and provide consistent set-level functionality
**Validates: Requirements 15.1, 15.2, 15.3, 15.4, 15.5**

**Property 21: Performance insights accuracy**
*For any* ad with performance data, the system should calculate and display accurate performance categories, competitive positioning, and optimization recommendations
**Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5**

**Property 22: Search persistence and discovery**
*For any* saved search criteria, the system should allow persistence, quick access, and provide relevant content suggestions based on patterns
**Validates: Requirements 18.3, 18.4, 18.5**

## Error Handling

### Error Categories

1. **Network Errors**: API failures, timeout issues, connectivity problems
2. **Data Errors**: Invalid responses, missing required fields, malformed data
3. **Media Errors**: Failed image/video loading, unsupported formats
4. **User Errors**: Invalid input, unauthorized actions, quota exceeded
5. **System Errors**: Memory issues, performance problems, unexpected crashes

### Error Handling Strategy

#### Global Error Boundary
- Catches unhandled React errors
- Provides fallback UI with error reporting
- Allows graceful degradation of functionality

#### API Error Handling
- Centralized error interceptor in API client
- Automatic retry logic for transient failures
- User-friendly error message mapping

#### Component-Level Error Handling
- Loading states for async operations
- Error states with retry mechanisms
- Fallback content for failed media loads

#### User Feedback
- Toast notifications for operation results
- Inline error messages for form validation
- Progress indicators for long-running operations

## Testing Strategy

### Dual Testing Approach

The testing strategy combines unit testing and property-based testing to ensure comprehensive coverage:

**Unit Testing**:
- Component rendering and interaction
- Hook behavior and state management
- Service function correctness
- Error boundary functionality
- Integration between components

**Property-Based Testing**:
- Filter combinations and result correctness
- Sort order verification across datasets
- Media display behavior across content types
- State persistence across operations
- Error handling across failure modes

### Testing Framework Configuration

**Property-Based Testing Library**: fast-check for JavaScript/TypeScript
**Minimum Iterations**: 100 iterations per property test
**Test Tagging**: Each property-based test tagged with format: `**Feature: ads-react-architecture, Property {number}: {property_text}**`

### Testing Implementation Requirements

- Each correctness property implemented by a single property-based test
- Property tests run minimum 100 iterations with random data generation
- Unit tests cover specific examples and edge cases
- Integration tests verify component interactions
- End-to-end tests validate complete user workflows

### Test Data Generation

- Random ad data generators with realistic constraints
- Filter combination generators covering all valid combinations
- Media URL generators for testing different content types
- Error condition simulators for testing failure scenarios
- Performance data generators for testing with large datasets