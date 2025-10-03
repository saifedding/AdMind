# Media Refresh Service - Multi-Method Fallback Update

## Problem
The media refresh service was failing to fetch ad data from Facebook Ad Library for some ads (particularly older or inactive ads), resulting in errors like:
```
WARNING - Could not find ad data for 1575410853842599
```

## Solution
Updated `MediaRefreshService` to implement **multiple fallback methods** for fetching ad data from Facebook, significantly improving reliability.

## Changes Made

### 1. **Multi-Method Fetch Strategy** (`fetch_ad_from_facebook`)
The service now tries 3 different methods in order:

#### Method 1: Direct Deeplink Search ⚡ (Most Reliable)
- Uses `deeplinkAdID` parameter set to the ad archive ID
- Sets `hasDeeplinkAdID: true`
- Direct lookup by ad ID - fastest and most accurate
- Best for fetching specific ads by their archive ID

#### Method 2: Keyword Search with ALL Status 🔍
- Uses `queryString` parameter with the ad archive ID
- Sets `activeStatus: "ALL"` to search both active AND inactive ads
- Searches across all ads regardless of status
- Good fallback when direct lookup fails

#### Method 3: Page-Based Search 📄 (If page_id available)
- Uses `pageIDs` parameter with the competitor's page ID
- Sets `searchType: "PAGE"` to search within a specific page
- Then finds the matching ad in the results
- Useful when we know which page the ad belongs to

### 2. **Helper Methods Added**

```python
_fetch_ad_by_deeplink(ad_archive_id: str) -> Optional[Dict]
_fetch_ad_by_keyword(ad_archive_id: str, active_status: str) -> Optional[Dict]
_fetch_ad_by_page(ad_archive_id: str, page_id: str) -> Optional[Dict]
_parse_facebook_response(response_text: str, target_ad_id: str) -> Optional[Dict]
_extract_ad_from_data(data_obj: Dict, target_ad_id: str) -> Optional[Dict]
```

### 3. **Page ID Integration**
Updated `refresh_ad_media_from_facebook` to:
- Fetch the competitor's page_id from the ad relationship
- Pass it to the fetch method for the page-based fallback
- Log whether page_id is available

### 4. **Updated GraphQL Parameters**
All fetch methods now use:
- Updated `v` parameter: `"608791"` (matching scraper)
- Updated `doc_id`: `24394279933540792` (matching scraper)
- Updated `__rev`, `__dyn`, `__csr` parameters from scraper
- Proper `fb_api_req_friendly_name`: `AdLibrarySearchPaginationQuery`

### 5. **Better Error Handling**
- Debug-level logging for method failures (not errors)
- Only warns when ALL methods fail
- Clearer logging showing which method is being tried

## High-Quality Media Priority (Unchanged)

The service still prioritizes high-quality media:

### Videos:
1. ✅ `video_hd_url` (HD, no watermark) - **BEST**
2. `video_sd_url` (SD, no watermark)
3. `watermarked_video_hd_url` (HD with watermark)
4. `watermarked_video_sd_url` (SD with watermark) - last resort

### Images:
1. ✅ `original_image_url` (full resolution, no watermark) - **BEST**
2. `resized_image_url` (resized, no watermark)
3. `watermarked_resized_image_url` (resized with watermark) - last resort

### Exclusions:
- ❌ `page_profile_picture_url` - Excluded (company logo, not ad creative)

## Testing

### Before Update:
```
INFO - Searching for ad 1575410853842599 using keyword search...
WARNING - Could not find ad data for 1575410853842599
```

### After Update (Expected):
```
INFO - Method 1: Trying deeplink search for ad 1575410853842599...
[If Method 1 fails]
INFO - Method 2: Trying keyword search with ALL status for ad 1575410853842599...
[If Method 2 fails and page_id available]
INFO - Method 3: Trying page search for ad 1575410853842599 on page 123456789...
[Success]
INFO - Found exact match for ad 1575410853842599
INFO - Successfully refreshed media for ad 34701
```

## API Endpoints (Unchanged)

All endpoints still work the same way:
- `POST /api/v1/ads/{ad_id}/refresh-media` - Single ad refresh
- `POST /api/v1/ads/favorites/refresh-all` - All favorites refresh
- `POST /api/v1/ad-sets/{ad_set_id}/refresh-media` - Ad set refresh

## Frontend (Unchanged)

All refresh buttons work the same:
- Single ad refresh button
- Ad set refresh button
- Refresh all favorites button

## Benefits

✅ **Improved Success Rate** - Multiple fallback methods increase chances of finding the ad
✅ **Better for Older Ads** - Method 2 searches ALL ads (active + inactive)
✅ **Page-Specific Search** - Method 3 can find ads within a specific page
✅ **Maintains Quality** - Still prioritizes HD/original media over watermarked
✅ **Better Logging** - Clearer indication of which method succeeded/failed
✅ **No Breaking Changes** - API and frontend remain the same

## Deployment

The service is already deployed and running. Simply restart the backend:
```bash
docker restart ads_api
```

## Next Steps (Optional Enhancements)

1. **Rate Limiting** - Add delays between attempts to avoid FB rate limits
2. **Caching** - Cache successful fetches to reduce API calls
3. **Retry Logic** - Retry failed fetches after a delay
4. **Analytics** - Track which method succeeds most often
5. **Progress UI** - Show which method is being tried in the frontend

## Files Modified

- `backend/app/services/media_refresh_service.py` - Main service with multi-method fetch

## Related Documentation

- Facebook Ad Library API: https://www.facebook.com/ads/library/api
- GraphQL Query Structure: See `facebook_ads_scraper.py` for reference
