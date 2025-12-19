# Search Feature

This feature provides Facebook Ad Library search functionality with preview and save capabilities.

## Structure

```
frontend/src/features/search/
├── hooks/
│   ├── use-search-state.ts      # State management for search
│   ├── use-search-actions.ts    # API actions (search, save, load more)
│   └── index.ts                 # Exports
├── types/
│   └── index.ts                 # TypeScript types
├── index.ts                     # Feature exports
└── README.md                    # This file
```

## Usage

### In a Component

```tsx
import { useSearchState, useSearchActions } from '@/features/search';

function MySearchComponent() {
  const searchState = useSearchState();
  const { handleSearch, handleSaveSelected, handleLoadMore } = useSearchActions({
    setIsSearching: searchState.setIsSearching,
    setError: searchState.setError,
    setSearchResult: searchState.setSearchResult,
    setSelectedAds: searchState.setSelectedAds,
    setIsSaving: searchState.setIsSaving,
    setIsLoadingMore: searchState.setIsLoadingMore,
    setCurrentSearchPage: searchState.setCurrentSearchPage,
  });

  // Use the state and actions...
}
```

## Features

### State Management
- **Form State**: Search type, query, filters, countries
- **Results State**: Search results, selected ads, loading states
- **Persistence**: Automatically saves/restores state from localStorage

### Actions
- **handleSearch**: Search Facebook Ad Library
- **handleLoadMore**: Load more results with pagination
- **handleSaveSelected**: Save selected ads to database

### Duration Filtering
The search now supports filtering ads by minimum duration:
- Set `minDurationDays` to filter ads (e.g., 30 for ads running 30+ days)
- Backend calculates duration based on start/end dates
- Only ads meeting the requirement are returned

## API Integration

### Search Endpoint
```
POST /api/v1/ads/library/search
{
  "page_id": "123456789",           // For page search
  "query_string": "real estate",    // For keyword search
  "countries": ["AE", "US"],
  "active_status": "all",
  "media_type": "all",
  "max_pages": 3,
  "min_duration_days": 30,          // NEW: Duration filter
  "save_to_database": false,
  "cursor": "..."                   // For pagination
}
```

### Save Selected Endpoint
```
POST /api/v1/ads/library/save-selected
{
  "ad_archive_ids": ["123", "456"],
  "search_params": { ... }
}
```

## Types

### SearchResult
Complete search response with ads, stats, and pagination info

### AdPreview
Individual ad preview with metadata, creatives, and targeting

### SearchParams
Search configuration including filters and duration

## State Persistence

The search state is automatically saved to localStorage:
- Search results
- Selected ads
- Form values
- Filters

This allows users to:
- Navigate away and return to results
- Refresh the page without losing data
- Continue where they left off
