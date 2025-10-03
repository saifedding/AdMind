# Refresh Buttons Usage Guide

This guide shows you how to use the refresh button components in your frontend.

## Components Available

1. **RefreshAdButton** - Refresh a single ad
2. **RefreshAdSetButton** - Refresh all ads in an ad set
3. **RefreshAllFavoritesButton** - Refresh all favorite ads

## Installation

The components are already created in:
```
frontend/src/components/RefreshButtons.tsx
```

## 1. Refresh Single Ad Button

### Icon Variant (Recommended for Ad Cards)

```tsx
import { RefreshAdButton } from '@/components/RefreshButtons';

// In your ad card component
<div className="ad-card">
  <img src={ad.media_url} alt="Ad" />
  
  <div className="ad-actions">
    {/* Small icon button */}
    <RefreshAdButton 
      adId={ad.id}
      variant="icon"
      size="sm"
      onSuccess={() => {
        // Reload the ad data
        fetchAdData();
      }}
    />
  </div>
</div>
```

### Button Variant

```tsx
import { RefreshAdButton } from '@/components/RefreshButtons';

// In your ad detail page
<div className="ad-detail">
  <h1>Ad Details</h1>
  
  {/* Full button with text */}
  <RefreshAdButton 
    adId={ad.id}
    variant="button"
    size="md"
    onSuccess={() => {
      alert('Media refreshed!');
      window.location.reload();
    }}
  />
</div>
```

## 2. Refresh Ad Set Button

### Full Example in Ad Set View

```tsx
import { RefreshAdSetButton } from '@/components/RefreshButtons';

export function AdSetCard({ adSet }: { adSet: AdSet }) {
  return (
    <div className="border rounded-lg p-4">
      {/* Ad Set Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-semibold">Ad Set #{adSet.id}</h3>
          <p className="text-sm text-gray-500">
            {adSet.variant_count} variants
          </p>
        </div>
        
        {/* Refresh all ads in this set */}
        <RefreshAdSetButton
          adSetId={adSet.id}
          variantCount={adSet.variant_count}
          variant="button"
          size="sm"
          onSuccess={() => {
            console.log('Ad set refreshed!');
            // Reload the ad set data
            refetchAdSet();
          }}
          onError={(error) => {
            console.error('Refresh failed:', error);
          }}
        />
      </div>
      
      {/* Ad variants list */}
      <div className="grid grid-cols-3 gap-2">
        {/* ... ad variants ... */}
      </div>
    </div>
  );
}
```

### Icon Variant for Compact View

```tsx
<RefreshAdSetButton
  adSetId={adSet.id}
  variantCount={adSet.variant_count}
  variant="icon"
  size="md"
  onSuccess={() => window.location.reload()}
/>
```

## 3. Refresh All Favorites Button

### In Dashboard Toolbar

```tsx
import { RefreshAllFavoritesButton } from '@/components/RefreshButtons';

export function DashboardToolbar() {
  const [showFavorites, setShowFavorites] = useState(false);
  
  return (
    <div className="flex items-center gap-4 p-4 bg-white border-b">
      {/* Favorites filter toggle */}
      <button
        onClick={() => setShowFavorites(!showFavorites)}
        className={`px-4 py-2 rounded-lg ${
          showFavorites ? 'bg-pink-600 text-white' : 'bg-gray-200'
        }`}
      >
        ❤️ Favorites Only
      </button>
      
      {/* Refresh all favorites button */}
      {showFavorites && (
        <RefreshAllFavoritesButton
          size="md"
          onSuccess={() => {
            // Reload the ads list
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
```

## Complete Ad Card Example

Here's a complete example showing refresh button in an ad card:

```tsx
'use client';

import { useState } from 'react';
import { Heart, Trash2 } from 'lucide-react';
import { RefreshAdButton } from '@/components/RefreshButtons';
import { adsApi } from '@/lib/api';
import type { ApiAd } from '@/lib/api';

interface AdCardProps {
  ad: ApiAd;
  onUpdate?: () => void;
}

export function AdCard({ ad, onUpdate }: AdCardProps) {
  const [isFavorite, setIsFavorite] = useState(ad.is_favorite);

  const handleToggleFavorite = async () => {
    try {
      await adsApi.toggleFavorite(ad.id);
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Delete this ad?')) {
      try {
        await adsApi.deleteAd(ad.id);
        if (onUpdate) onUpdate();
      } catch (error) {
        console.error('Failed to delete:', error);
      }
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Ad Image/Video */}
      <div className="relative aspect-video bg-gray-100">
        {ad.media_url && (
          <img 
            src={ad.media_url} 
            alt={ad.main_title || 'Ad'} 
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Favorite badge */}
        {isFavorite && (
          <div className="absolute top-2 left-2 bg-pink-600 text-white px-2 py-1 rounded-full text-xs">
            ❤️ Favorite
          </div>
        )}
      </div>

      {/* Ad Info */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
          {ad.main_title || 'Untitled Ad'}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-3 mb-4">
          {ad.main_body_text || 'No description'}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {/* Favorite button */}
            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-lg ${
                isFavorite 
                  ? 'bg-pink-100 text-pink-600' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Heart className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
            </button>

            {/* Refresh button */}
            <RefreshAdButton
              adId={ad.id}
              variant="icon"
              size="sm"
              onSuccess={() => {
                alert('✓ Media refreshed!');
                if (onUpdate) onUpdate();
              }}
            />

            {/* Delete button */}
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Duration badge */}
          {ad.duration_days && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
              {ad.duration_days} days
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

## Props Reference

### RefreshAdButton

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `adId` | `number` | Required | The ID of the ad to refresh |
| `variant` | `'icon' \| 'button'` | `'icon'` | Button style |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `onSuccess` | `() => void` | - | Called after successful refresh |
| `onError` | `(error: any) => void` | - | Called on error |
| `className` | `string` | `''` | Additional CSS classes |

### RefreshAdSetButton

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `adSetId` | `number` | Required | The ID of the ad set |
| `variantCount` | `number` | - | Number of variants to show in button |
| `variant` | `'icon' \| 'button'` | `'button'` | Button style |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `onSuccess` | `() => void` | - | Called after successful refresh |
| `onError` | `(error: any) => void` | - | Called on error |
| `className` | `string` | `''` | Additional CSS classes |

### RefreshAllFavoritesButton

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `onSuccess` | `() => void` | - | Called after successful refresh |
| `onError` | `(error: any) => void` | - | Called on error |
| `className` | `string` | `''` | Additional CSS classes |

## Best Practices

### 1. Use Icon Variant in Compact Spaces

```tsx
// Good - In a list or card
<RefreshAdButton adId={ad.id} variant="icon" size="sm" />

// Avoid - Takes too much space in a card
<RefreshAdButton adId={ad.id} variant="button" size="lg" />
```

### 2. Add Callbacks for Data Refresh

```tsx
// Good - Reload data after refresh
<RefreshAdButton 
  adId={ad.id} 
  onSuccess={() => {
    refetchAds(); // Update the UI
  }}
/>

// Not ideal - No visual feedback
<RefreshAdButton adId={ad.id} />
```

### 3. Use Appropriate Sizes

```tsx
// Icon in card - small
<RefreshAdButton adId={ad.id} variant="icon" size="sm" />

// Button in detail view - medium
<RefreshAdButton adId={ad.id} variant="button" size="md" />

// Prominent action - large
<RefreshAllFavoritesButton size="lg" />
```

## Customization

### Custom Styling

```tsx
<RefreshAdButton
  adId={ad.id}
  variant="icon"
  className="!bg-purple-100 hover:!bg-purple-200"
/>
```

### Custom Success Handler

```tsx
<RefreshAdButton
  adId={ad.id}
  onSuccess={() => {
    // Show toast notification instead of alert
    toast.success('Media refreshed successfully!');
    
    // Update specific state
    setAd(prevAd => ({
      ...prevAd,
      updated_at: new Date().toISOString()
    }));
  }}
/>
```

## Testing

Test the refresh functionality:

```bash
# 1. Start your backend
cd backend
python -m uvicorn app.main:app --reload

# 2. Start your frontend
cd frontend
npm run dev

# 3. Navigate to your ads page
# 4. Click a refresh button
# 5. Check the browser console for logs
# 6. Verify the media URL updated in database
```

## Troubleshooting

### Button doesn't work
- Check browser console for errors
- Verify backend is running on port 8000
- Check API client configuration

### Media not refreshing
- Verify Facebook cookies are valid in `MediaRefreshService`
- Check backend logs for Facebook API errors
- Ensure ad has valid `ad_archive_id`

### UI not updating
- Add `onSuccess` callback with data refetch
- Use `window.location.reload()` for simple refresh
- Implement proper state management
