# Duration Filtering Feature

## Overview
The competitors page now supports filtering ads by minimum running duration. This allows you to scrape only ads that have been running for at least a specified number of days.

## How It Works

### Frontend (Competitors Page)
- Added a "Minimum Days Running" input field in the scraping configuration dialog
- Users can specify the minimum number of days an ad should be running
- Field is optional - leave empty to include all ads
- Includes helpful placeholder text and description

### Backend Implementation
1. **API Layer**: Updated `CompetitorScrapeRequest` model to include `min_duration_days` parameter
2. **Task Layer**: Modified `scrape_competitor_ads_task` to accept and pass the duration filter
3. **Service Layer**: Enhanced `FacebookAdsScraperService` and `EnhancedAdExtractionService` to support duration filtering
4. **Filtering Logic**: Ads are filtered after scraping but before saving to database

### Duration Calculation
- **Active Ads**: Duration calculated from start date to current date
- **Inactive Ads**: Duration calculated from start date to end date
- **Minimum Duration**: 1 day (ensures ads that started today count as 1 day)

## Usage Example

To scrape only ads that have been running for at least 15 days:

1. Go to Competitors page
2. Click the scrape button for a competitor
3. In the scraping dialog, enter "15" in the "Minimum Days Running" field
4. Configure other parameters as needed
5. Start scraping

The system will:
- Scrape all ads from the Facebook Ads Library
- Calculate the duration for each ad
- Only save ads that meet the 15-day minimum requirement
- Provide accurate statistics on filtered results

## Technical Details

### Key Files Modified
- `frontend/src/app/competitors/page.tsx` - Added UI field and payload parameter
- `backend/app/routers/competitors.py` - Updated request model and endpoint
- `backend/app/tasks/facebook_ads_scraper_task.py` - Added parameter handling
- `backend/app/services/facebook_ads_scraper.py` - Updated service constructor
- `backend/app/services/enhanced_ad_extraction.py` - Added filtering logic

### Bug Fix Applied
Fixed an issue where duration filtering was not working because the filtering logic was looking for dates at the wrong location in the ad data structure. The dates are stored in `ad_data.meta.start_date` after processing, not at the top level.

### API Changes
```typescript
interface CompetitorScrapeRequest {
  countries?: string[];
  max_pages?: number;
  delay_between_requests?: number;
  active_status?: 'active' | 'inactive' | 'all';
  date_from?: string;
  date_to?: string;
  min_duration_days?: number; // NEW FIELD
}
```

### Database Impact
- No database schema changes required
- Uses existing `duration_days` field in the `ads` table
- Filtering happens before database insertion, reducing storage
- Adds `ads_filtered_by_duration` to processing statistics

## Benefits
1. **Focused Data Collection**: Only collect ads that meet your criteria
2. **Reduced Storage**: Don't store ads that don't meet requirements
3. **Better Performance**: Fewer ads to process and analyze
4. **Targeted Analysis**: Focus on ads with proven longevity

## Testing
Run the test script to verify functionality:
```bash
python test_duration_filtering.py
```

The test verifies:
- Duration calculation for active and inactive ads
- Filtering logic with different thresholds
- Handling of edge cases (no filter, missing dates)