# Competitors Feature

This feature implements a modern React architecture using:
- **React Query (TanStack Query)** for server state management
- **Zustand** for client state management  
- **React Hook Form** for form state management

## Architecture Overview

```
src/features/competitors/
├── components/           # React components
│   ├── CompetitorForm.tsx
│   ├── ScrapeDialog.tsx
│   ├── BulkScrapeDialog.tsx
│   ├── CompetitorStats.tsx
│   ├── CompetitorFilters.tsx
│   ├── CompetitorTable.tsx
│   ├── CompetitorPagination.tsx
│   ├── TaskStatusDialog.tsx
│   ├── ConfirmDialogs.tsx
│   └── index.ts
├── hooks/               # Custom hooks
│   ├── use-competitors-query.ts    # React Query hooks
│   ├── use-competitor-form.ts      # Form management
│   ├── use-scrape-form.ts         # Scrape form
│   └── use-bulk-scrape-form.ts    # Bulk scrape form
├── stores/              # Zustand stores
│   └── competitors-store.ts        # Client state
├── schemas/             # Zod validation schemas
│   └── competitor-schemas.ts
├── pages/               # Page components
│   ├── CompetitorsPage.tsx
│   └── index.ts
└── index.ts            # Feature exports
```

## Key Features

### Server State Management (React Query)
- Automatic caching and background updates
- Optimistic updates for mutations
- Error handling with toast notifications
- Polling for task status updates
- Query invalidation for data consistency

### Client State Management (Zustand)
- Dialog states (open/closed)
- Selected items and filters
- Pagination state
- Task tracking
- Utility actions for bulk operations

### Form Management (React Hook Form)
- Zod schema validation
- Type-safe form data
- Automatic error handling
- Form reset and cancellation

## Usage Examples

### Using the Store
```typescript
import { useCompetitorsStore } from '@/features/competitors';

function MyComponent() {
  const { 
    selectedIds, 
    setAddDialogOpen, 
    toggleSelectId 
  } = useCompetitorsStore();
  
  // Use store state and actions
}
```

### Using Query Hooks
```typescript
import { useCompetitorsQuery, useCreateCompetitorMutation } from '@/features/competitors';

function MyComponent() {
  const { data: competitors, isLoading } = useCompetitorsQuery({
    page: 1,
    page_size: 20
  });
  
  const createMutation = useCreateCompetitorMutation();
  
  const handleCreate = async (data) => {
    await createMutation.mutateAsync(data);
  };
}
```

### Using Form Hooks
```typescript
import { useCompetitorForm } from '@/features/competitors';

function MyForm({ competitor }) {
  const { form, onSubmit, isLoading } = useCompetitorForm({ 
    competitor 
  });
  
  return (
    <form onSubmit={onSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

## Migration from Old Architecture

The new architecture maintains backward compatibility through re-exports:
- `@/schemas/competitor-schemas` → `@/features/competitors/schemas/competitor-schemas`
- `@/hooks/api/use-competitors` → `@/features/competitors/hooks/use-competitors-query`
- `@/stores/competitors-store` → `@/features/competitors/stores/competitors-store`

## Benefits

1. **Better Organization**: Feature-based folder structure
2. **Type Safety**: Full TypeScript support with Zod validation
3. **Performance**: Optimized caching and updates with React Query
4. **Developer Experience**: Better debugging and dev tools
5. **Maintainability**: Separation of concerns and modular architecture
6. **Reusability**: Components and hooks can be easily reused