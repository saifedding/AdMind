# Quick Setup Guide - Favorites Lists Feature

## Prerequisites
- Backend and database are running
- You have access to run migrations
- Frontend development environment is set up

## Step-by-Step Setup

### 1. Update Backend Main App

First, ensure the favorites router is registered in your main FastAPI application.

**Find your main app file** (usually `backend/main.py` or `backend/app.py`):

```python
# Add this import at the top
from backend.routes import favorites

# Add this line where other routers are registered
app.include_router(favorites.router)
```

### 2. Update Migration File

The migration file needs to reference your latest migration. Find your most recent migration:

```bash
cd backend
ls migrations/versions/
```

Take note of the most recent migration revision ID, then edit:
`backend/migrations/versions/add_favorite_lists.py`

Update line 14:
```python
down_revision = 'YOUR_LATEST_MIGRATION_ID_HERE'  # Replace with actual ID
```

### 3. Run Database Migration

```bash
# Make sure you're in the backend directory
cd backend

# Run the migration
alembic upgrade head

# Verify tables were created
# Connect to your database and check:
# \dt favorite_lists
# \dt favorite_items
```

### 4. Restart Backend Service

```bash
# If using Docker
docker restart ads_api

# Or if running locally
# Stop and restart your backend server
```

### 5. Verify Backend API

Test that the endpoints are working:

```bash
# Get user's favorite lists (should return empty array initially)
curl http://localhost:8000/api/favorites/lists

# Create a test list
curl -X POST http://localhost:8000/api/favorites/lists \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test List",
    "description": "My first list",
    "color": "blue",
    "icon": "star"
  }'
```

### 6. Frontend Setup (if needed)

```bash
cd frontend

# Install any new dependencies
npm install

# Rebuild
npm run build

# Restart frontend service
docker restart ads_frontend
```

### 7. Test the Feature

1. Open your browser and navigate to: `http://localhost:3000/favorite-lists`

2. You should see the Favorites Lists page

3. Click "New List" to create your first list

4. Navigate to any ad and look for the "Add to Favorites" button

5. Click it and select the list you created

6. Return to `/favorite-lists` and verify the ad appears

## Verification Checklist

- [ ] Database tables `favorite_lists` and `favorite_items` exist
- [ ] Backend API responds to `/api/favorites/lists`
- [ ] Can create a new list via API or UI
- [ ] Can access `/favorite-lists` page without errors
- [ ] "Add to Favorites" button appears on ad cards
- [ ] Can add an ad to a list successfully
- [ ] Added ad appears in the list on favorites page
- [ ] Can remove an ad from a list
- [ ] Can delete a list (except default)

## Common Issues & Solutions

### Issue: Migration fails with "table already exists"

**Solution:**
```sql
-- Connect to your database
DROP TABLE IF EXISTS favorite_items CASCADE;
DROP TABLE IF EXISTS favorite_lists CASCADE;

-- Then re-run: alembic upgrade head
```

### Issue: 404 on /api/favorites endpoints

**Solution:** Check that you added `app.include_router(favorites.router)` to your main app file.

### Issue: Frontend shows "Add to Favorites" button but clicking does nothing

**Solution:** 
1. Check browser console for errors
2. Verify API is accessible from frontend
3. Check CORS settings if frontend and backend are on different ports

### Issue: Can't see the Add to Favorites button

**Solution:** You need to integrate the `AddToFavoriteButton` component into your ad cards.

Example integration:
```tsx
// In your ad card component
import { AddToFavoriteButton } from '@/components/favorites/AddToFavoriteButton';

// Inside the component's JSX:
<AddToFavoriteButton adId={ad.id} onSuccess={() => console.log('Success!')} />
```

## Next Steps

Once the feature is working:

1. **Integrate the button** into your existing ad card components
2. **Add navigation link** to the favorites lists page in your main menu
3. **Customize colors** - add more color options in the UI if desired
4. **Add analytics** - track which lists are most popular
5. **Consider bulk operations** - allow adding multiple ads at once

## Need Help?

If you encounter issues:
1. Check the browser console for frontend errors
2. Check backend logs: `docker logs ads_api`
3. Verify database connection and migrations
4. Review the full documentation in `FAVORITES_LISTS_FEATURE.md`

## Example User Workflow

**As a user, I can:**

1. Create a list called "High Performers" for my best-performing ads
2. Create a list called "Competitors - Finance" for tracking specific competitors
3. Browse ads and click "Add to Favorites" on interesting ads
4. Select which list(s) to add each ad to (can select multiple!)
5. Add optional notes like "Great hook!" or "Test this CTA"
6. View all my lists in one place at `/favorite-lists`
7. Click on a list to see all its ads
8. Remove ads from lists when they're no longer relevant
9. Delete entire lists when I don't need them anymore

Enjoy your new favorites organization feature! 🌟
