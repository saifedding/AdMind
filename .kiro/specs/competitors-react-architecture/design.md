# Competitors React Architecture - Design Document

## Overview

This document outlines the comprehensive design for recreating the competitors management system using modern React architecture patterns. The system will be built with a feature-based structure, emphasizing separation of concerns, type safety, performance optimization, and maintainability.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Pages          │  Components      │  Hooks               │
│  - List Page    │  - CompetitorCard│  - useCompetitors    │
│  - Detail Page  │  - DataTable     │  - useCompetitorStats│
│  - Forms        │  - StatusBadge   │  - useScraping       │
├─────────────────────────────────────────────────────────────┤
│                    Business Logic Layer                      │
├─────────────────────────────────────────────────────────────┤
│  Services       │  State Mgmt      │  Utils               │
│  - API Client   │  - React Query   │  - Formatters        │
│  - LocalStorage │  - Zustand       │  - Validators        │
│  - Task Manager │  - Form State    │  - Transformers      │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer                               │
├─────────────────────────────────────────────────────────────┤
│  API Integration│  Caching         │  Persistence         │
│  - REST Client  │  - Query Cache   │  - LocalStorage      │
│  - Error Handle │  - Optimistic    │  - Session Storage   │
│  - Retry Logic  │  - Background    │  - IndexedDB         │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **State Management**: 
  - React Query (TanStack Query) for server state
  - Zustand for client state
  - React Hook Form for form state
- **UI Components**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios with interceptors
- **Build Tool**: Next.js 14 with App Router
- **Testing**: Vitest + React Testing Library + fast-check (PBT)

## Components and Interfaces

### Core Component Structure

```typescript
// Feature-based directory structure
src/
├── features/
│   └── competitors/
│       ├── components/
│       │   ├── CompetitorCard.tsx
│       │   ├── CompetitorForm.tsx
│       │   ├── CompetitorTable.tsx
│       │   ├── CompetitorStats.tsx
│       │   ├── ScrapeConfigDialog.tsx
│       │   ├── BulkActionsBar.tsx
│       │   ├── TaskStatusIndicator.tsx
│       │   └── CountrySelector.tsx
│       ├── hooks/
│       │   ├── useCompetitors.ts
│       │   ├── useCompetitorStats.ts
│       │   ├── useCompetitorScraping.ts
│       │   ├── useCompetitorActions.ts
│       │   ├── useTaskManagement.ts
│       │   └── useBulkOperations.ts
│       ├── services/
│       │   ├── competitorApi.ts
│       │   ├── taskService.ts
│       │   └── localStorageService.ts
│       ├── types/
│       │   └── competitor.types.ts
│       ├── utils/
│       │   ├── validators.ts
│       │   ├── formatters.ts
│       │   └── transformers.ts
│       └── pages/
│           ├── CompetitorsListPage.tsx
│           └── CompetitorDetailPage.tsx
```

### Key Component Interfaces

```typescript
// Core Competitor Types
interface Competitor {
  id: number;
  name: string;
  page_id: string;
  page_url?: string;
  is_active: boolean;
  ads_count: number;
  created_at: string;
  updated_at: string;
}

interface CompetitorDetail extends Competitor {
  active_ads_count: number;
  analyzed_ads_count: number;
}

// Form Types
interface CompetitorFormData {
  name: string;
  page_id: string;
  is_active: boolean;
}

// Scraping Configuration
interface ScrapeConfig {
  countries: string[];
  max_pages: number;
  delay_between_requests: number;
  active_status: 'active' | 'inactive' | 'all';
  date_from?: string;
  date_to?: string;
  min_duration_days?: number;
}

// Task Management
interface TaskItem {
  id: string;
  competitor_name: string;
  competitor_page_id: string;
  status: TaskStatus;
  created_at: string;
  config: ScrapeConfig;
}

interface TaskStatus {
  task_id: string;
  state: 'PENDING' | 'SUCCESS' | 'FAILURE' | 'PROGRESS';
  status: string;
  result?: TaskResult;
  error?: string;
}
```

## Data Models

### State Management Architecture

```typescript
// React Query Keys
export const competitorKeys = {
  all: ['competitors'] as const,
  lists: () => [...competitorKeys.all, 'list'] as const,
  list: (filters: CompetitorFilters) => [...competitorKeys.lists(), filters] as const,
  details: () => [...competitorKeys.all, 'detail'] as const,
  detail: (id: number) => [...competitorKeys.details(), id] as const,
  stats: () => [...competitorKeys.all, 'stats'] as const,
};

// Zustand Store for UI State
interface CompetitorStore {
  // Selection state
  selectedIds: number[];
  setSelectedIds: (ids: number[]) => void;
  toggleSelection: (id: number) => void;
  clearSelection: () => void;
  
  // UI state
  isAddDialogOpen: boolean;
  isEditDialogOpen: boolean;
  isScrapeDialogOpen: boolean;
  setAddDialogOpen: (open: boolean) => void;
  setEditDialogOpen: (open: boolean) => void;
  setScrapeDialogOpen: (open: boolean) => void;
  
  // Filter state
  filters: CompetitorFilters;
  updateFilters: (filters: Partial<CompetitorFilters>) => void;
  resetFilters: () => void;
}

// Form State with React Hook Form
interface CompetitorFormState {
  data: CompetitorFormData;
  errors: FieldErrors<CompetitorFormData>;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
}
```

### Local Storage Schema

```typescript
// Task Storage Schema
interface StoredTask {
  id: string;
  competitor_name: string;
  competitor_page_id: string;
  status: TaskStatus;
  created_at: string;
  config: ScrapeConfig;
}

interface StoredBulkTask {
  id: string;
  task_ids: string[];
  competitor_ids: number[];
  competitor_names: string[];
  status: BulkTaskStatus;
  created_at: string;
  config: ScrapeConfig;
}

// Storage Keys
const STORAGE_KEYS = {
  SCRAPING_TASKS: 'scrapingTasks',
  BULK_SCRAPING_TASKS: 'bulkScrapingTasks',
  USER_PREFERENCES: 'competitorPreferences',
} as const;
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified several areas where properties can be consolidated:
- CRUD operations can be combined into comprehensive data integrity properties
- Filtering and sorting can be unified into data transformation properties  
- Task management properties can be consolidated around state consistency
- UI state properties can be grouped around interaction consistency

### Core Data Properties

**Property 1: Competitor CRUD Consistency**
*For any* valid competitor data, creating, reading, updating, and deleting operations should maintain data integrity and return consistent results
**Validates: Requirements 1.1, 1.3, 1.4, 1.5**

**Property 2: Duplicate Prevention**
*For any* competitor with existing page_id, attempting to create another competitor with the same page_id should be rejected with appropriate error message
**Validates: Requirements 1.2**

**Property 3: Deletion Rule Consistency**
*For any* competitor, deletion behavior should be determined by ads association: competitors with ads get soft-deleted (is_active=false), competitors without ads get hard-deleted (removed)
**Validates: Requirements 1.4, 1.5**

### Data Filtering and Display Properties

**Property 4: Filter Application Consistency**
*For any* combination of search terms, status filters, and sort criteria, the displayed results should exactly match the applied filters and maintain consistency across pagination
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

**Property 5: Selection Scope Consistency**
*For any* selection operation, "select all" should only affect items visible on the current page, and individual selections should be preserved across filter changes
**Validates: Requirements 3.1, 3.5**

### Bulk Operations Properties

**Property 6: Bulk Operation Atomicity**
*For any* set of selected competitors, bulk operations should process each competitor according to its individual rules and provide accurate success/failure reporting
**Validates: Requirements 3.2, 3.3, 3.4**

### Scraping Configuration Properties

**Property 7: Country Selection Mutual Exclusivity**
*For any* country selection state, "ALL" countries and individual country selections should be mutually exclusive, with empty selections defaulting to "ALL"
**Validates: Requirements 4.3, 9.2, 9.3, 9.4**

**Property 8: Scraping Parameter Validation**
*For any* scraping configuration, all parameters (max_pages, delay_between_requests, date ranges, duration filters) should be validated and applied correctly to the scraping request
**Validates: Requirements 4.2, 4.4, 4.5**

### Task Management Properties

**Property 9: Task Lifecycle Consistency**
*For any* scraping task, the task should progress through states (PENDING → PROGRESS → SUCCESS/FAILURE) and maintain consistent status reporting throughout its lifecycle
**Validates: Requirements 5.1, 5.3, 5.4, 5.5**

**Property 10: Task Persistence Round-trip**
*For any* task stored in localStorage, the task should be retrievable with identical data after browser refresh, and automatic cleanup should maintain the 50-item limit
**Validates: Requirements 6.1, 6.2, 6.3, 6.5**

### Statistics and Analytics Properties

**Property 11: Statistics Calculation Accuracy**
*For any* set of competitor data, calculated statistics (totals, breakdowns, averages) should accurately reflect the underlying data and update reactively when data changes
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

### UI Interaction Properties

**Property 12: Form Validation Consistency**
*For any* form input, validation should provide immediate feedback, highlight errors appropriately, and prevent submission of invalid data
**Validates: Requirements 10.3, 4.2**

**Property 13: Loading State Consistency**
*For any* asynchronous operation, appropriate loading indicators should be displayed during the operation and removed upon completion or error
**Validates: Requirements 10.2**

**Property 14: Error Handling Completeness**
*For any* API error or network failure, the system should display specific error messages and provide recovery options where appropriate
**Validates: Requirements 10.1, 10.4, 10.5**

### Performance Properties

**Property 15: Input Debouncing Effectiveness**
*For any* rapid sequence of filter inputs, the system should debounce API calls to prevent excessive requests while maintaining responsive UI updates
**Validates: Requirements 14.3**

**Property 16: Data Export Completeness**
*For any* export operation, the exported data should include all visible columns and preserve all metadata, with progress indication for large exports
**Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

## Error Handling

### Error Boundary Strategy

```typescript
// Global Error Boundary
class CompetitorErrorBoundary extends Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to monitoring service
    logError(error, errorInfo);
  }
}

// API Error Handling
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message);
  }
}

// Error Recovery Patterns
const useErrorRecovery = () => {
  const retry = useCallback((fn: () => Promise<any>) => {
    return fn().catch((error) => {
      if (error.status >= 500) {
        // Server error - show retry option
        return { canRetry: true, error };
      }
      // Client error - show error message
      return { canRetry: false, error };
    });
  }, []);
  
  return { retry };
};
```

### Validation Strategy

```typescript
// Form Validation with Zod
const competitorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  page_id: z.string().min(1, 'Page ID is required').max(100, 'Page ID too long'),
  is_active: z.boolean(),
});

// Runtime Type Checking
const validateApiResponse = (data: unknown): Competitor => {
  const result = competitorSchema.safeParse(data);
  if (!result.success) {
    throw new ApiError(400, 'Invalid response format', result.error);
  }
  return result.data;
};
```

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit testing and property-based testing to ensure comprehensive coverage:

**Unit Tests:**
- Component rendering and interaction
- Hook behavior with specific inputs
- API service functions with mock data
- Utility function correctness
- Error boundary behavior

**Property-Based Tests:**
- Data transformation consistency (filtering, sorting, pagination)
- CRUD operation integrity across random inputs
- Form validation with generated test data
- Task state management with various scenarios
- Bulk operation correctness with different selection sets

### Testing Framework Configuration

```typescript
// Vitest Configuration
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});

// Property-Based Testing with fast-check
import fc from 'fast-check';

// Example property test
describe('Competitor filtering', () => {
  it('should maintain filter consistency', () => {
    fc.assert(fc.property(
      fc.array(competitorArbitrary),
      fc.string(),
      fc.boolean(),
      (competitors, searchTerm, isActive) => {
        const filtered = applyFilters(competitors, { searchTerm, isActive });
        // Property: All filtered results should match the criteria
        return filtered.every(c => 
          c.name.includes(searchTerm) && c.is_active === isActive
        );
      }
    ));
  });
});
```

### Property-Based Test Requirements

- Each property-based test must run a minimum of 100 iterations
- Each test must be tagged with the format: **Feature: competitors-react-architecture, Property {number}: {property_text}**
- Tests must use fast-check library for property generation
- Each correctness property must be implemented by a single property-based test

### Test Coverage Requirements

- Minimum 90% code coverage for business logic
- 100% coverage for critical paths (CRUD operations, task management)
- Integration tests for API endpoints
- E2E tests for critical user journeys
- Performance tests for large datasets (1000+ competitors)

## Performance Optimization

### Rendering Optimization

```typescript
// Virtual Scrolling for Large Lists
const VirtualizedCompetitorTable = memo(({ competitors }: Props) => {
  const { height, width } = useWindowSize();
  
  return (
    <FixedSizeList
      height={height - 200}
      width={width}
      itemCount={competitors.length}
      itemSize={60}
      itemData={competitors}
    >
      {CompetitorRow}
    </FixedSizeList>
  );
});

// Memoized Components
const CompetitorCard = memo(({ competitor, onEdit, onDelete }: Props) => {
  return (
    <Card>
      {/* Component content */}
    </Card>
  );
}, (prevProps, nextProps) => {
  return prevProps.competitor.id === nextProps.competitor.id &&
         prevProps.competitor.updated_at === nextProps.competitor.updated_at;
});
```

### Data Fetching Optimization

```typescript
// React Query Configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        if (error.status === 404) return false;
        return failureCount < 3;
      },
    },
  },
});

// Optimistic Updates
const useUpdateCompetitor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateCompetitor,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: competitorKeys.detail(variables.id) });
      
      const previousData = queryClient.getQueryData(competitorKeys.detail(variables.id));
      
      queryClient.setQueryData(competitorKeys.detail(variables.id), (old: Competitor) => ({
        ...old,
        ...variables.data,
      }));
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(competitorKeys.detail(variables.id), context.previousData);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: competitorKeys.detail(variables.id) });
    },
  });
};
```

### Bundle Optimization

```typescript
// Code Splitting
const CompetitorDetailPage = lazy(() => import('./pages/CompetitorDetailPage'));
const CompetitorsListPage = lazy(() => import('./pages/CompetitorsListPage'));

// Tree Shaking
export { useCompetitors, useCompetitorStats } from './hooks';
export type { Competitor, CompetitorDetail } from './types';

// Dynamic Imports for Heavy Components
const ScrapeConfigDialog = lazy(() => import('./components/ScrapeConfigDialog'));
```

This design provides a robust, scalable, and maintainable architecture for the competitors management system, with comprehensive error handling, performance optimization, and thorough testing strategies.