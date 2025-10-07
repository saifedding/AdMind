# Favorites Lists Feature Documentation

## Overview

The **Favorites Lists** feature allows users to organize ads into multiple custom lists, providing better organization and categorization compared to a single favorites system. Users can:

- Create multiple named lists (e.g., "High Performers", "A/B Tests", "Competitors to Watch")
- Add ads to one or more lists simultaneously
- Add optional notes to each ad in a list
- Customize list appearance with colors and icons
- Manage lists (create, edit, delete, set default)

## Architecture

### Database Schema

#### `favorite_lists` Table
- `id` (PK): Unique identifier
- `name`: List name (max 100 chars)
- `description`: Optional description
- `user_id`: Owner of the list (FK to users)
- `color`: Display color (e.g., 'blue', 'green', 'red')
- `icon`: Icon identifier (default: 'star')
- `is_default`: Boolean flag for default list
- `created_at`: Timestamp
- `updated_at`: Timestamp

**Indexes:**
- `user_id` (for fast user queries)

#### `favorite_items` Table
- `id` (PK): Unique identifier
- `list_id`: Reference to favorite_lists (FK, CASCADE on delete)
- `ad_id`: Reference to ads (FK, CASCADE on delete)
- `notes`: Optional text notes
- `created_at`: Timestamp

**Indexes:**
- `list_id` (for fast list queries)
- `ad_id` (for checking ad membership)

**Unique Constraint:**
- `(list_id, ad_id)` - Prevents duplicates

---

## Backend Implementation

### Files Created

1. **Database Migration:**
   - `backend/migrations/versions/add_favorite_lists.py`
   - Creates `favorite_lists` and `favorite_items` tables with proper relationships

2. **Models:**
   - `backend/models/favorite.py`
   - `FavoriteList` model with relationship to `FavoriteItem`
   - `FavoriteItem` model with relationships to `FavoriteList` and `Ad`

3. **Service Layer:**
   - `backend/services/favorite_service.py`
   - Business logic for CRUD operations on lists and items
   - Methods:
     - `get_user_lists()`: Get all lists for a user
     - `get_list_by_id()`: Get specific list
     - `create_list()`: Create new list
     - `update_list()`: Update list properties
     - `delete_list()`: Delete list (cascades to items)
     - `add_ad_to_list()`: Add ad to list
     - `remove_ad_from_list()`: Remove ad from list
     - `get_list_items()`: Get all items in a list
     - `get_ad_lists()`: Get all lists containing an ad
     - `ensure_default_list()`: Ensure user has a default list
     - `get_all_favorites_with_ads()`: Get complete favorites data

4. **API Routes:**
   - `backend/routes/favorites.py`
   - RESTful endpoints with proper HTTP methods and status codes

### API Endpoints

#### Lists Management

```
GET    /api/favorites/lists                    # Get all user's lists
GET    /api/favorites/lists/{list_id}          # Get specific list with items
POST   /api/favorites/lists                    # Create new list
PUT    /api/favorites/lists/{list_id}          # Update list
DELETE /api/favorites/lists/{list_id}          # Delete list
POST   /api/favorites/ensure-default           # Ensure default list exists
```

#### Items Management

```
POST   /api/favorites/items                    # Add ad to list
DELETE /api/favorites/items                    # Remove ad from list
GET    /api/favorites/ads/{ad_id}/lists        # Get lists containing an ad
```

#### Bulk Operations

```
GET    /api/favorites/all                      # Get all lists with their ads
```

### Request/Response Examples

**Create List:**
```json
POST /api/favorites/lists
{
  "name": "High Performers",
  "description": "Ads with excellent engagement",
  "color": "green",
  "icon": "star",
  "is_default": false
}

Response: 201 Created
{
  "id": 1,
  "name": "High Performers",
  "description": "Ads with excellent engagement",
  "user_id": 1,
  "color": "green",
  "icon": "star",
  "is_default": false,
  "created_at": "2025-10-06T11:00:00Z",
  "updated_at": "2025-10-06T11:00:00Z",
  "item_count": 0
}
```

**Add Ad to List:**
```json
POST /api/favorites/items
{
  "list_id": 1,
  "ad_id": 123,
  "notes": "Great hook and CTA"
}

Response: 201 Created
{
  "id": 1,
  "list_id": 1,
  "ad_id": 123,
  "notes": "Great hook and CTA",
  "created_at": "2025-10-06T11:00:00Z"
}
```

---

## Frontend Implementation

### Files Created

1. **API Client Extensions:**
   - `frontend/src/lib/api.ts` (updated)
   - Added TypeScript types for favorites
   - Added API methods to `ApiClient` class
   - Exported methods via `adsApi` wrapper

2. **UI Components:**
   - `frontend/src/components/favorites/AddToFavoriteDialog.tsx`
     - Modal dialog for selecting/creating lists
     - Shows which lists already contain the ad
     - Allows creating new lists inline
     - Color picker for list customization
   
   - `frontend/src/components/favorites/AddToFavoriteButton.tsx`
     - Reusable button component
     - Opens `AddToFavoriteDialog` on click
     - Can be placed anywhere (ad cards, detail pages, etc.)

3. **Pages:**
   - `frontend/src/app/favorite-lists/page.tsx`
     - Main favorites management interface
     - Sidebar showing all user lists
     - Main area displaying ads in selected list
     - Create/delete list functionality
     - Remove ads from lists
     - Display ad notes

### TypeScript Types

```typescript
export interface ApiFavoriteList {
  id: number;
  name: string;
  description?: string;
  user_id: number;
  color?: string;
  icon?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  item_count: number;
}

export interface ApiFavoriteItem {
  id: number;
  list_id: number;
  ad_id: number;
  notes?: string;
  created_at: string;
  ad?: ApiAd;
}

export interface ApiFavoriteListWithItems extends ApiFavoriteList {
  items: ApiFavoriteItem[];
}
```

### Usage Examples

**Using the Add to Favorites Button:**
```tsx
import { AddToFavoriteButton } from '@/components/favorites/AddToFavoriteButton';

function AdCard({ ad }: { ad: ApiAd }) {
  return (
    <div className="ad-card">
      {/* Ad content */}
      
      <AddToFavoriteButton 
        adId={ad.id} 
        onSuccess={() => console.log('Added to favorites')}
      />
    </div>
  );
}
```

**Using the Dialog Directly:**
```tsx
import { AddToFavoriteDialog } from '@/components/favorites/AddToFavoriteDialog';

function MyComponent() {
  const [showDialog, setShowDialog] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowDialog(true)}>
        Add to Favorites
      </button>
      
      {showDialog && (
        <AddToFavoriteDialog
          adId={123}
          onClose={() => setShowDialog(false)}
          onSuccess={() => {
            console.log('Success');
            setShowDialog(false);
          }}
        />
      )}
    </>
  );
}
```

**API Usage:**
```typescript
import { adsApi } from '@/lib/api';

// Get all user's lists
const { lists, total } = await adsApi.getFavoriteLists();

// Create a new list
const newList = await adsApi.createFavoriteList({
  name: 'My List',
  description: 'Optional description',
  color: 'blue',
  icon: 'star'
});

// Add ad to list
await adsApi.addAdToFavoriteList(listId, adId, 'Optional notes');

// Get lists containing a specific ad
const { list_ids } = await adsApi.getAdFavoriteLists(adId);

// Get all favorites with ads
const { lists, total_lists } = await adsApi.getAllFavoritesWithAds();
```

---

## Deployment Steps

### 1. Backend Setup

```bash
cd backend

# Run migration
alembic upgrade head

# Or if migration file needs revision linking:
# Edit backend/migrations/versions/add_favorite_lists.py
# Update down_revision to match your latest migration
# Then run: alembic upgrade head

# Restart backend service
docker restart ads_api
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies (if needed)
npm install

# Build frontend
npm run build

# Restart frontend service
docker restart ads_frontend
```

### 3. Verify Routes

Register the favorites routes in your main FastAPI app:

```python
# backend/main.py or backend/app.py
from backend.routes import favorites

app.include_router(favorites.router)
```

### 4. Test the Feature

1. Navigate to `/favorite-lists` in your browser
2. Create a new list
3. Add some ads to the list using the "Add to Favorites" button
4. Verify ads appear in the selected list
5. Test removing ads from lists
6. Test deleting lists

---

## Features & Benefits

### Multi-List Organization
- Users can create unlimited lists
- Ads can belong to multiple lists simultaneously
- Each list can have its own color and description

### Smart UI
- Visual list selection with color indicators
- Checkmarks show which lists contain the current ad
- Inline list creation without leaving the dialog
- Sidebar navigation for quick list switching

### Data Management
- Cascade deletes: removing a list removes all its items
- Cascade deletes: removing an ad removes it from all lists
- Unique constraints prevent duplicate entries
- Optional notes for each ad in each list

### User Experience
- Auto-select default list or first list
- Loading states with spinners
- Error handling with user-friendly messages
- Responsive design for mobile and desktop
- Dark mode support

---

## Future Enhancements

### Potential Features
1. **List Sharing:** Share lists with other users
2. **List Export:** Export list contents as CSV/JSON
3. **Bulk Operations:** Add/remove multiple ads at once
4. **List Templates:** Pre-defined list templates for common use cases
5. **Smart Lists:** Auto-populate lists based on criteria (e.g., "All high-performing ads")
6. **List Analytics:** Show metrics for ads in each list
7. **List Ordering:** Drag-and-drop to reorder lists and items
8. **Tags:** Add tags to lists for better organization
9. **Search:** Search within specific lists
10. **Notifications:** Notify when ads in a list change status

---

## Troubleshooting

### Migration Issues
**Problem:** Migration fails with "relation already exists"
**Solution:** Check if tables already exist, drop them if needed:
```sql
DROP TABLE IF EXISTS favorite_items CASCADE;
DROP TABLE IF EXISTS favorite_lists CASCADE;
```

### API Errors
**Problem:** 404 on `/api/favorites/*` endpoints
**Solution:** Ensure favorites router is registered in main app

**Problem:** 500 errors with database operations
**Solution:** Check database connection and verify migrations ran successfully

### Frontend Issues
**Problem:** TypeScript errors about missing types
**Solution:** Ensure `api.ts` exports all types properly and run `npm run type-check`

**Problem:** Dialog doesn't show
**Solution:** Check z-index values and ensure no CSS conflicts

---

## Testing

### Backend Tests
```python
# tests/test_favorites.py
def test_create_list():
    response = client.post('/api/favorites/lists', json={
        'name': 'Test List',
        'color': 'blue'
    })
    assert response.status_code == 201
    assert response.json()['name'] == 'Test List'

def test_add_ad_to_list():
    # Create list
    list_response = client.post('/api/favorites/lists', json={'name': 'Test'})
    list_id = list_response.json()['id']
    
    # Add ad
    response = client.post('/api/favorites/items', json={
        'list_id': list_id,
        'ad_id': 1
    })
    assert response.status_code == 201
```

### Frontend Tests
```typescript
// Use React Testing Library
test('opens dialog on button click', () => {
  render(<AddToFavoriteButton adId={1} />);
  fireEvent.click(screen.getByText('Add to Favorites'));
  expect(screen.getByText('Add to Favorites')).toBeInTheDocument();
});
```

---

## Maintenance

### Database Backups
Ensure `favorite_lists` and `favorite_items` are included in backup routines.

### Performance Monitoring
- Monitor query performance for `get_all_favorites_with_ads()`
- Add indexes if queries become slow
- Consider pagination for lists with many items

### User Data
- Respect user privacy
- Allow users to export their lists
- Provide data deletion options (GDPR compliance)

---

## Summary

The Favorites Lists feature provides a powerful, flexible way for users to organize ads. The implementation follows best practices with:

- ✅ Clean database schema with proper relationships
- ✅ RESTful API design
- ✅ Type-safe TypeScript frontend
- ✅ Reusable UI components
- ✅ Responsive, accessible interface
- ✅ Error handling and loading states
- ✅ Cascade deletes for data integrity
- ✅ Support for multiple lists per ad

Users can now create custom workflows for tracking competitors, testing hypotheses, and organizing their favorite ads efficiently!
