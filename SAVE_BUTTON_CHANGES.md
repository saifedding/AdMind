# Save Button Implementation

## Summary
Replaced the **Favorite** button with a **Save** button that saves ad content (images, videos, text) to the database.

## Changes Made

### Frontend Changes

#### 1. AdCard Component (`src/features/dashboard/components/AdCard.tsx`)
- **Replaced**: Heart icon → Save icon
- **Renamed**: `isFavorite` → `isSaved`
- **Renamed**: `isFavoriting` → `isSaving`
- **Renamed**: `handleFavoriteClick` → `handleSaveClick`
- **Updated**: Button styling (green when saved, black when not saved)
- **Updated**: Tooltip text to indicate saving functionality
- **Kept**: Refresh button in its secondary position

**Visual Changes**:
- Save button: Green background when saved, gray when not saved
- Tooltip: "Save ad content, images, and videos" / "Ad saved (click to unsave)"
- Icon: Save icon (disk/download icon) instead of heart

#### 2. Ads Page (`src/app/ads/page.tsx`)
- **Renamed**: `handleFavoriteToggle` → `handleSaveToggle`
- **Updated**: AdCard prop from `onFavoriteToggle` to `onSaveToggle`
- **Updated**: Comments to reflect "save" terminology

### Backend (No Changes Needed!)
The backend already supports this functionality:
- **Endpoint**: `/api/v1/ad-sets/{ad_set_id}/favorite` (toggle endpoint)
- **Field**: `is_favorite` in database (reused as "is_saved")
- **Data Storage**: All content is already saved in the database:
  - `raw_data`: Complete Facebook ad data
  - `creatives`: Media URLs and creative content
  - `meta`: Ad metadata
  - `targeting`: Targeting information
  - `lead_form`: Lead form data

## How It Works

1. **User clicks Save button** on an ad card
2. **Frontend calls** `adsApi.toggleAdSetFavorite(ad_set_id)`
3. **Backend toggles** the `is_favorite` field to `true`
4. **All ad data** is already persisted in the database:
   - Images (URLs stored in `main_image_urls`)
   - Videos (URLs stored in `main_video_urls`)
   - Text content (title, body, caption)
   - All raw Facebook data
5. **Button turns green** and shows "filled" save icon
6. **Success message** displays: "✓ Ad saved! All content, images, and videos have been preserved."

## Button Layout

### With Selection Enabled:
```
[Checkbox] [Save] [Refresh] [Add to Lists] ...
```

### Without Selection:
```
[Save] [Refresh] [Add to Lists] ...
```

## User Experience

### Saving an Ad:
1. Click the **gray Save icon** (disk/download)
2. See success message: "✓ Ad saved! All content, images, and videos have been preserved."
3. Button turns **green** and icon fills
4. Ad is marked as saved in the database

### Unsaving an Ad:
1. Click the **green filled Save icon**
2. See message: "✓ Ad unsaved."
3. Button returns to gray

### Refreshing Ad Media:
1. Click the **blue Refresh icon** (circular arrows)
2. Fetches fresh media from Facebook
3. Updates the database with new URLs
4. Page reloads to show updated content
5. Success message: "✓ Media refreshed successfully!"

## Database Schema

The `is_favorite` field in the `ad_sets` table now serves as the "is_saved" indicator:
- `true` = Ad is saved by the user
- `false` = Ad is not saved

All media URLs and content are stored in the `ads` table:
- `raw_data` (JSON): Complete Facebook response
- `creatives` (JSON): Array of creative objects with media
- `main_image_urls` (extracted): Direct image URLs
- `main_video_urls` (extracted): Direct video URLs
- `main_title`, `main_body_text`, `main_caption`: Text content

## Notes

- The term "favorite" is used internally but presented as "save" to the user
- All ad data is always stored - the save button just marks it as important/preserved
- Refreshing media fetches new URLs from Facebook but doesn't delete old data
- Both save and refresh operations work at the AdSet level (saving/refreshing all variants)
