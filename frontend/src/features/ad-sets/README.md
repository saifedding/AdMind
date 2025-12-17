# Ad Sets Feature

This feature handles the display and management of Facebook ad sets, which are groups of ads with similar creative content.

## Structure

```
frontend/src/features/ad-sets/
├── components/           # Reusable UI components
│   ├── AdSetGrid.tsx    # Grid display for ad sets list
│   ├── AdSetSortControls.tsx  # Sort controls component
│   ├── AdSetStats.tsx   # Statistics display
│   ├── AdSetSummary.tsx # Ad set details summary
│   ├── AdVariantGrid.tsx # Grid for ad variants in a set
│   └── index.ts         # Component exports
├── hooks/               # Custom React hooks
│   ├── useAdSets.ts     # Hook for ad sets list logic
│   ├── useAdSetDetails.ts # Hook for ad set detail logic
│   └── index.ts         # Hook exports
├── pages/               # Page components
│   ├── AdSetsPage.tsx   # Main ad sets listing page
│   ├── AdSetDetailPage.tsx # Individual ad set detail page
│   └── index.ts         # Page exports
├── types/               # TypeScript type definitions
│   └── index.ts         # Type definitions for ad sets
├── README.md           # This file
└── index.ts            # Main feature exports
```

## Key Features

### Ad Sets List (`/ad-sets`)
- Displays all ad sets in a grid layout
- Sortable by creation date, variant count, first/last seen dates
- Pagination support
- Statistics display showing total ad sets

### Ad Set Details (`/ad-sets/[id]`)
- Shows all variants within a specific ad set
- Highlights the "best variant" (longest running ad)
- Displays ad set lifetime and duration statistics
- Refresh functionality to update media for all ads in the set
- Pagination for large ad sets

## Components

### AdSetGrid
Renders the grid of ad sets with loading and error states.

### AdSetSortControls
Provides sorting controls with dropdown for sort field and toggle for sort order.

### AdSetStats
Shows statistics like total number of ad sets.

### AdSetSummary
Displays detailed information about an ad set including lifetime, duration, and variant count.

### AdVariantGrid
Renders all variants in an ad set with special highlighting for the best performing variant.

## Hooks

### useAdSets
Manages state and API calls for the ad sets listing page including:
- Fetching ad sets with pagination
- Sorting functionality
- Error handling and loading states

### useAdSetDetails
Manages state and API calls for individual ad set details including:
- Fetching ad variants in a set
- Identifying the best performing variant
- Media refresh functionality
- Pagination for variants

## Types

### AdSetDetails
Interface for ad set metadata including variant count, dates, and best ad ID.

### AdSetSortOptions
Type definitions for sorting options.

### AdSetFilters
Interface for filtering options (extensible for future features).

## Usage

```tsx
// In app router pages
import { AdSetsPage, AdSetDetailPage } from '@/features/ad-sets';

// Using individual components
import { AdSetGrid, useAdSets } from '@/features/ad-sets';

function CustomAdSetsPage() {
  const { adSets, loading, error } = useAdSets();
  
  return (
    <div>
      <AdSetGrid adSets={adSets} loading={loading} error={error} />
    </div>
  );
}
```

## Benefits of This Structure

1. **Separation of Concerns**: Logic is separated into hooks, UI into components, and types are clearly defined
2. **Reusability**: Components and hooks can be reused across different pages
3. **Maintainability**: Each piece has a single responsibility making it easier to maintain
4. **Testability**: Hooks and components can be tested independently
5. **Scalability**: Easy to add new features like filters, different views, etc.
6. **Type Safety**: Strong TypeScript typing throughout the feature