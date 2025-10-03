# Favorites Refresh Feature

This feature allows you to mark ads as favorites and refresh all their media URLs from Facebook Ad Library with a single click.

## Backend Implementation

### 1. MediaRefreshService (`backend/app/services/media_refresh_service.py`)

A service that:
- Fetches fresh ad data from Facebook Ad Library using the ad's `ad_archive_id`
- Extracts all media URLs (images, videos, links, profile pictures)
- Updates the database with fresh URLs
- Handles batch refresh for multiple ads

### 2. API Endpoints

#### Refresh Single Ad
```http
POST /api/v1/ads/{ad_id}/refresh-media
```

Response:
```json
{
  "success": true,
  "ad_id": 123,
  "old_media_url": "https://...",
  "new_media_url": "https://...",
  "message": "Media URL refreshed successfully from Facebook Ad Library"
}
```

#### Refresh All Favorites (NEW!)
```http
POST /api/v1/ads/favorites/refresh-all
```

Response:
```json
{
  "success": true,
  "total": 5,
  "successful": 4,
  "failed": 1,
  "message": "Refreshed 4/5 favorite ads successfully",
  "details": [
    {
      "ad_id": 123,
      "success": true,
      "old_media_url": "https://...",
      "new_media_url": "https://...",
      "total_urls": 7
    },
    ...
  ]
}
```

## Frontend Implementation

### 1. API Client (`frontend/src/lib/api.ts`)

Added method:
```typescript
apiClient.refreshAllFavorites()
```

Or using the wrapper:
```typescript
adsApi.refreshAllFavorites()
```

### 2. Usage Example in React Component

```typescript
'use client';

import { useState } from 'react';
import { adsApi } from '@/lib/api';
import { RefreshCw } from 'lucide-react';

export function RefreshFavoritesButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setResult(null);

    try {
      const response = await adsApi.refreshAllFavorites();
      setResult(response);
      
      // Show success notification
      alert(`✓ ${response.message}`);
      
      // Optionally reload your ads list
      // window.location.reload();
      
    } catch (error) {
      console.error('Failed to refresh favorites:', error);
      alert('✗ Failed to refresh favorites');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Refreshing...' : 'Refresh All Favorites'}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <p className="font-semibold">{result.message}</p>
          <p className="text-sm text-gray-600">
            Total: {result.total} | 
            Success: {result.successful} | 
            Failed: {result.failed}
          </p>
        </div>
      )}
    </div>
  );
}
```

### 3. Integration in Ads Dashboard

Add the refresh button to your favorites filter section:

```typescript
'use client';

import { useState } from 'react';
import { adsApi } from '@/lib/api';
import { Heart, RefreshCw } from 'lucide-react';

export function FavoritesSection() {
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshFavorites = async () => {
    setIsRefreshing(true);
    
    try {
      const result = await adsApi.refreshAllFavorites();
      
      // Show toast notification or modal
      console.log('Refresh result:', result);
      alert(`Refreshed ${result.successful}/${result.total} favorites!`);
      
      // Reload ads if showing favorites
      if (showFavoritesOnly) {
        window.location.reload();
      }
      
    } catch (error) {
      console.error('Refresh failed:', error);
      alert('Failed to refresh favorites');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Toggle favorites filter */}
      <button
        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
          showFavoritesOnly 
            ? 'bg-pink-600 text-white' 
            : 'bg-gray-200 text-gray-700'
        }`}
      >
        <Heart className="w-4 h-4" />
        Favorites Only
      </button>

      {/* Refresh favorites button */}
      <button
        onClick={handleRefreshFavorites}
        disabled={isRefreshing}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        title="Refresh media URLs for all favorite ads"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Refreshing...' : 'Refresh Favorites'}
      </button>
    </div>
  );
}
```

## How It Works

1. **Mark Ads as Favorites**
   - User clicks the heart icon on any ad
   - Calls `POST /api/v1/ads/{ad_id}/favorite`
   - Ad's `is_favorite` field is toggled in database

2. **Refresh All Favorites**
   - User clicks "Refresh All Favorites" button
   - Frontend calls `POST /api/v1/ads/favorites/refresh-all`
   - Backend:
     - Queries all ads where `is_favorite = true`
     - For each favorite:
       - Fetches ad from Facebook using `ad_archive_id`
       - Extracts fresh media URLs
       - Updates `creatives` and `raw_data` in database
   - Returns summary with success/failure counts

3. **View Updated Ads**
   - Ads list automatically shows updated media
   - Or manually refresh the page

## Benefits

- **Batch Processing**: Update all favorites at once instead of one by one
- **Automatic URL Extraction**: No need to manually copy/paste URLs
- **Fresh Data**: Always get the latest URLs directly from Facebook
- **Detailed Results**: Know exactly which ads succeeded/failed

## Configuration

### Facebook Cookies (Optional)

The service uses hardcoded Facebook cookies. For production, you should:

1. Store cookies in environment variables:
```bash
# .env
FACEBOOK_DATR=your_datr_cookie
FACEBOOK_SB=your_sb_cookie
FACEBOOK_C_USER=your_c_user_cookie
FACEBOOK_XS=your_xs_cookie
FACEBOOK_FR=your_fr_cookie
```

2. Update `MediaRefreshService._create_session()` to use env vars:
```python
import os

cookies = {
    'datr': os.getenv('FACEBOOK_DATR'),
    'sb': os.getenv('FACEBOOK_SB'),
    'c_user': os.getenv('FACEBOOK_C_USER'),
    'xs': os.getenv('FACEBOOK_XS'),
    'fr': os.getenv('FACEBOOK_FR'),
}
```

## Testing

### 1. Mark ads as favorites
```bash
curl -X POST http://localhost:8000/api/v1/ads/123/favorite
```

### 2. Refresh all favorites
```bash
curl -X POST http://localhost:8000/api/v1/ads/favorites/refresh-all
```

### 3. Expected response
```json
{
  "success": true,
  "total": 2,
  "successful": 2,
  "failed": 0,
  "message": "Refreshed 2/2 favorite ads successfully",
  "details": [...]
}
```

## Future Enhancements

1. **Background Task**: Use Celery to process refresh asynchronously
2. **Progress Updates**: WebSocket updates for real-time progress
3. **Scheduled Refresh**: Automatically refresh favorites daily
4. **Selective Refresh**: Refresh only ads with expired URLs (>7 days old)
5. **Notification System**: Email/push notifications when refresh completes
