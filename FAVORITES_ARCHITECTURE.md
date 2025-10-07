# Favorites Lists - System Architecture

## Component Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React/Next.js)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐     ┌───────────────────────────┐    │
│  │  /favorite-lists     │     │  AddToFavoriteButton       │    │
│  │  (Main Page)         │     │  (Reusable Component)      │    │
│  │                      │     │                            │    │
│  │  - List sidebar      │     │  Used in:                  │    │
│  │  - Ad grid display   │     │  - Ad cards                │    │
│  │  - Create/delete     │     │  - Detail pages            │    │
│  │  - Add/remove ads    │     │  - Search results          │    │
│  └──────────────────────┘     └───────────────────────────┘    │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │          AddToFavoriteDialog (Modal)                    │    │
│  │                                                          │    │
│  │  - Shows all user lists                                 │    │
│  │  - Checkmarks for lists containing ad                   │    │
│  │  - Inline list creation                                 │    │
│  │  - Color picker                                         │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              API Client (src/lib/api.ts)                │    │
│  │                                                          │    │
│  │  adsApi.getFavoriteLists()                             │    │
│  │  adsApi.createFavoriteList(data)                       │    │
│  │  adsApi.addAdToFavoriteList(listId, adId)             │    │
│  │  adsApi.removeAdFromFavoriteList(listId, adId)        │    │
│  │  adsApi.getAdFavoriteLists(adId)                      │    │
│  │  adsApi.getAllFavoritesWithAds()                      │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP Requests
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      Backend (FastAPI)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         API Routes (routes/favorites.py)                │    │
│  │                                                          │    │
│  │  GET    /api/favorites/lists                           │    │
│  │  GET    /api/favorites/lists/{list_id}                 │    │
│  │  POST   /api/favorites/lists                           │    │
│  │  PUT    /api/favorites/lists/{list_id}                 │    │
│  │  DELETE /api/favorites/lists/{list_id}                 │    │
│  │  POST   /api/favorites/items                           │    │
│  │  DELETE /api/favorites/items                           │    │
│  │  GET    /api/favorites/ads/{ad_id}/lists               │    │
│  │  GET    /api/favorites/all                             │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │       Service Layer (services/favorite_service.py)      │    │
│  │                                                          │    │
│  │  Business logic:                                        │    │
│  │  - Validate operations                                  │    │
│  │  - Handle default list logic                           │    │
│  │  - Ensure data integrity                               │    │
│  │  - Check permissions                                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │           Models (models/favorite.py)                   │    │
│  │                                                          │    │
│  │  FavoriteList: SQLAlchemy ORM model                    │    │
│  │  FavoriteItem: SQLAlchemy ORM model                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │ Database Queries
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                    PostgreSQL Database                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐       ┌──────────────────────┐        │
│  │   favorite_lists     │       │   favorite_items     │        │
│  ├──────────────────────┤       ├──────────────────────┤        │
│  │ id (PK)              │       │ id (PK)              │        │
│  │ name                 │   ┌───│ list_id (FK)         │        │
│  │ description          │   │   │ ad_id (FK)           │        │
│  │ user_id              │   │   │ notes                │        │
│  │ color                │◄──┘   │ created_at           │        │
│  │ icon                 │       └──────────────────────┘        │
│  │ is_default           │                 │                     │
│  │ created_at           │                 │                     │
│  │ updated_at           │                 │                     │
│  └──────────────────────┘                 │                     │
│                                            │                     │
│                     ┌──────────────────────▼──────────────┐     │
│                     │         ads                          │     │
│                     ├─────────────────────────────────────┤     │
│                     │ id (PK)                             │     │
│                     │ ad_archive_id                       │     │
│                     │ competitor_id                       │     │
│                     │ main_title                          │     │
│                     │ main_body_text                      │     │
│                     │ media_url                           │     │
│                     │ ...                                 │     │
│                     └─────────────────────────────────────┘     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### Creating a New List

```
User clicks "New List"
       │
       ▼
[NewListDialog opens]
       │
User enters: name, description, color
       │
       ▼
User clicks "Create"
       │
       ▼
adsApi.createFavoriteList()
       │
       ▼
POST /api/favorites/lists
       │
       ▼
FavoriteService.create_list()
       │
       ├─► Check if is_default=true
       │   └─► Unset other defaults
       │
       ▼
INSERT INTO favorite_lists
       │
       ▼
Return new list object
       │
       ▼
Update UI, close dialog
```

### Adding Ad to List

```
User clicks "Add to Favorites" button
       │
       ▼
[AddToFavoriteDialog opens]
       │
       ├─► Fetch user's lists
       │   adsApi.getFavoriteLists()
       │
       └─► Fetch ad's current lists
           adsApi.getAdFavoriteLists(adId)
       │
       ▼
Display lists with checkmarks
       │
User selects/deselects lists
       │
User clicks "Save"
       │
       ▼
Calculate diff:
  - toAdd = selected but not current
  - toRemove = current but not selected
       │
       ▼
For each toAdd:
  adsApi.addAdToFavoriteList(listId, adId)
    │
    ▼
  POST /api/favorites/items
    │
    ▼
  FavoriteService.add_ad_to_list()
    │
    ├─► Verify list belongs to user
    ├─► Verify ad exists
    └─► Check for duplicates
    │
    ▼
  INSERT INTO favorite_items
       │
       ▼
For each toRemove:
  adsApi.removeAdFromFavoriteList(listId, adId)
    │
    ▼
  DELETE /api/favorites/items
    │
    ▼
  FavoriteService.remove_ad_from_list()
    │
    ▼
  DELETE FROM favorite_items
       │
       ▼
Close dialog, show success
```

### Viewing Favorites

```
User navigates to /favorite-lists
       │
       ▼
Page loads
       │
       ▼
adsApi.getAllFavoritesWithAds()
       │
       ▼
GET /api/favorites/all
       │
       ▼
FavoriteService.get_all_favorites_with_ads()
       │
       ├─► Query all user's lists
       │   FROM favorite_lists
       │   WHERE user_id = current_user
       │
       ▼
For each list:
  ├─► Query items
  │   FROM favorite_items
  │   JOIN ads ON ads.id = ad_id
  │   WHERE list_id = list.id
  │
  └─► Include ad data with each item
       │
       ▼
Return {lists: [...], total_lists: n}
       │
       ▼
Display in UI:
  ├─► Sidebar: List of lists
  └─► Main: Ads in selected list
```

## Key Features by Layer

### Frontend
- **React Components:** Modular, reusable
- **TypeScript:** Type-safe API calls
- **State Management:** React hooks (useState, useEffect)
- **Styling:** Tailwind CSS with dark mode
- **User Feedback:** Loading states, error messages

### Backend
- **FastAPI:** Modern, async Python framework
- **Pydantic:** Request/response validation
- **Service Layer:** Business logic separation
- **SQLAlchemy:** ORM for database access
- **Error Handling:** Proper HTTP status codes

### Database
- **Relations:** Foreign keys with cascade
- **Constraints:** Unique constraints prevent duplicates
- **Indexes:** Fast queries on common operations
- **Timestamps:** Track creation and updates

## Security Considerations

```
┌─────────────────────────────────────────┐
│         Security Layers                 │
├─────────────────────────────────────────┤
│                                         │
│  1. Authentication (TODO)               │
│     - User login/session               │
│     - JWT tokens                       │
│                                         │
│  2. Authorization                       │
│     - user_id check on all operations │
│     - Lists belong to users           │
│                                         │
│  3. Input Validation                    │
│     - Pydantic models                  │
│     - Max lengths                      │
│     - Required fields                  │
│                                         │
│  4. Database Constraints                │
│     - Foreign keys                     │
│     - Unique constraints               │
│     - NOT NULL                         │
│                                         │
│  5. API Rate Limiting (Future)          │
│     - Prevent abuse                    │
│     - Per-user limits                  │
│                                         │
└─────────────────────────────────────────┘
```

## Performance Optimizations

### Database
- **Indexes** on frequently queried columns (user_id, list_id, ad_id)
- **Eager loading** of relationships to avoid N+1 queries
- **Cascade deletes** handled at database level
- **Connection pooling** for concurrent requests

### API
- **Batch operations** instead of multiple API calls
- **Proper HTTP caching headers**
- **Pagination** for large result sets (future)
- **Async operations** with FastAPI

### Frontend
- **Lazy loading** of dialogs and components
- **Optimistic UI updates** for better UX
- **Debouncing** search and filter operations
- **Component memoization** to prevent re-renders

## Scalability Path

```
Current:            Future Scaling:
                   
Single User    →   Multi-User with Auth
                   
All Lists      →   Paginated Lists
                   
Simple Queries →   Cached Queries
                   
In-app Only    →   API for Mobile Apps
                   
Single Server  →   Load Balanced
                   
PostgreSQL     →   Read Replicas
```

## Integration Points

The system integrates with existing ad platform features:

1. **Ad Cards:** Display "Add to Favorites" button
2. **Ad Detail Page:** Show which lists contain the ad
3. **Search Results:** Allow favoriting from search
4. **Competitor Pages:** Favorite ads by competitor
5. **Analytics:** Track favorite patterns (future)

## Maintenance Tasks

### Regular
- Monitor database table sizes
- Check for orphaned records
- Review slow query logs
- Update indexes based on usage

### Periodic
- Archive old or unused lists
- Clean up deleted user data
- Optimize query performance
- Review security permissions

### Future
- Add list sharing capability
- Implement list analytics
- Create mobile app API
- Add export functionality
