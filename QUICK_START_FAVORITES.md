# Quick Start: Favorites Refresh Feature

## What's New? 🎉

You can now **mark ads as favorites** and **refresh all their media URLs** from Facebook with a single click!

## What I've Added

### Backend
1. ✅ **MediaRefreshService** - Service to fetch fresh URLs from Facebook
   - Located: `backend/app/services/media_refresh_service.py`
   
2. ✅ **New API Endpoint** - Batch refresh all favorites
   - Endpoint: `POST /api/v1/ads/favorites/refresh-all`
   - Located: `backend/app/routers/ads.py` (line 288-338)

### Frontend
1. ✅ **API Client Method** - `refreshAllFavorites()`
   - Located: `frontend/src/lib/api.ts` (line 331-338 & 397)

## How to Use

### 1. Mark Ads as Favorites (Already Working)

Your existing favorite toggle is already functional:
```typescript
await adsApi.toggleFavorite(adId);
```

### 2. Add Refresh Button to Your Frontend

Add this button wherever you display favorites (e.g., in your ads dashboard):

```typescript
'use client';

import { useState } from 'react';
import { adsApi } from '@/lib/api';
import { RefreshCw } from 'lucide-react';

export function RefreshFavoritesButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await adsApi.refreshAllFavorites();
      alert(`✓ Refreshed ${result.successful}/${result.total} favorites!`);
      // Optionally reload your ads list
      window.location.reload();
    } catch (error) {
      alert('✗ Failed to refresh favorites');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Refreshing...' : 'Refresh All Favorites'}
    </button>
  );
}
```

### 3. Test It!

1. **Mark some ads as favorites** (click the heart icon)

2. **Filter to show favorites only** (if you have this filter)

3. **Click "Refresh All Favorites"**

4. **Watch it work!** All favorite ads will get fresh media URLs from Facebook

## Testing with API

### Get list of favorites (check `is_favorite: true`)
```bash
Invoke-WebRequest -Uri "http://localhost:8000/api/v1/ads?is_favorite=true" -Method GET
```

### Mark an ad as favorite
```bash
Invoke-WebRequest -Uri "http://localhost:8000/api/v1/ads/1/favorite" -Method POST
```

### Refresh all favorites
```bash
Invoke-WebRequest -Uri "http://localhost:8000/api/v1/ads/favorites/refresh-all" -Method POST
```

## What Happens When You Refresh?

1. System finds all ads marked as favorites
2. For each favorite:
   - Fetches fresh data from Facebook Ad Library
   - Extracts all media URLs (videos, images, links)
   - Updates the database
3. Returns a summary:
   ```json
   {
     "success": true,
     "total": 5,
     "successful": 4,
     "failed": 1,
     "message": "Refreshed 4/5 favorite ads successfully"
   }
   ```

## Important Notes

### Facebook Cookies
The service uses your Facebook cookies to access the Ad Library. These are currently hardcoded in:
`backend/app/services/media_refresh_service.py`

For production, you should move these to environment variables (`.env` file).

### Performance
- Refreshing 10 ads takes ~30-60 seconds (Facebook API is slow)
- Consider adding a loading spinner/progress indicator
- For many favorites (>20), consider using a background task (Celery)

## Troubleshooting

### "No favorite ads found"
- Make sure you've marked ads as favorites first
- Check database: `SELECT * FROM ads WHERE is_favorite = true;`

### "Failed to refresh"
- Check if Facebook cookies are still valid
- Check backend logs for errors
- Ensure backend can reach Facebook's servers

### Ads not updating in UI
- Try refreshing the page after refresh completes
- Check if `creatives` field is updated in database

## Next Steps

Consider adding:
1. **Progress bar** - Show refresh progress for each ad
2. **Toast notifications** - Better user feedback than alerts
3. **Auto-refresh** - Scheduled daily refresh of favorites
4. **Selective refresh** - Only refresh ads with old URLs (>7 days)

## Files Created/Modified

### Backend
- ✨ **NEW**: `backend/app/services/media_refresh_service.py`
- ✏️ **MODIFIED**: `backend/app/routers/ads.py` (added batch refresh endpoint)

### Frontend
- ✏️ **MODIFIED**: `frontend/src/lib/api.ts` (added refreshAllFavorites method)

### Documentation
- 📄 `FAVORITES_REFRESH_FEATURE.md` - Detailed documentation
- 📄 `QUICK_START_FAVORITES.md` - This file!
