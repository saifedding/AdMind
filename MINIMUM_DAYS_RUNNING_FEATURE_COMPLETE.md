# Minimum Days Running Feature - Implementation Complete

## Overview
Successfully added the "Minimum Days Running" filter to the daily scraping feature, matching the functionality available in the competitors page. This allows users to filter ads to only include those that have been running for a specified minimum number of days.

## Features Implemented

### 1. Backend API Enhancement
- **New Parameter**: Added `min_duration_days` to both daily scraping endpoints
- **Validation**: Added Pydantic validation to ensure values are >= 1 or null
- **Integration**: Properly integrated with existing FacebookAdsScraperService

#### API Endpoints Updated:
- `POST /api/v1/scraping/daily/start` - Daily scraping for all competitors
- `POST /api/v1/scraping/competitors/scrape` - Specific competitors scraping

#### Request Models:
```python
class DailyScrapeRequest(BaseModel):
    countries: Optional[List[str]] = ["AE", "US", "UK"]
    max_pages_per_competitor: Optional[int] = 3
    delay_between_requests: Optional[int] = 2
    hours_lookback: Optional[int] = 24
    days_lookback: Optional[int] = None
    min_duration_days: Optional[int] = Field(None, ge=1, description="Minimum days running filter (must be >= 1)")
    active_status: Optional[str] = "active"
```

### 2. Task Function Updates
- Updated `scrape_new_ads_daily_task` to accept `min_duration_days` parameter
- Updated `scrape_specific_competitors_task` to accept `min_duration_days` parameter
- Properly pass the parameter to FacebookAdsScraperService initialization

### 3. Frontend UI Enhancement
- **New Input Field**: Added "Minimum Days Running" input field to daily scraping page
- **Proper Validation**: Input accepts numbers >= 1 or empty (null)
- **User-Friendly**: Includes placeholder text and helpful description
- **Consistent Design**: Matches the existing UI patterns and styling

#### UI Features:
```typescript
interface DailyScrapingConfig {
  // ... existing fields
  min_duration_days: number | null; // Minimum days running filter
  // ... other fields
}
```

### 4. Integration with Existing Systems
- **Compatible**: Works seamlessly with existing `days_lookback` parameter
- **Consistent**: Uses the same filtering logic as the competitors page
- **Validated**: Proper error handling and validation throughout the stack

## Testing Results

### ✅ All Tests Passed:
1. **Backend API**: Successfully accepts and processes `min_duration_days` parameter
2. **Daily Scraping**: Works with both days_lookback and min_duration_days filters
3. **Specific Competitors**: Properly filters ads based on minimum duration
4. **Frontend UI**: Displays the new field with correct validation and styling
5. **Parameter Validation**: Correctly rejects negative values and accepts null/positive values
6. **Docker Integration**: All services work correctly in containerized environment

### Test Examples:
```bash
# Valid request with minimum days running filter
curl -X POST "http://localhost:8000/api/v1/scraping/daily/start" \
  -H "Content-Type: application/json" \
  -d '{
    "countries": ["AE"],
    "max_pages_per_competitor": 1,
    "delay_between_requests": 1,
    "days_lookback": 2,
    "min_duration_days": 7,
    "active_status": "all"
  }'

# Invalid request (negative value) - properly rejected
curl -X POST "http://localhost:8000/api/v1/scraping/daily/start" \
  -H "Content-Type: application/json" \
  -d '{
    "min_duration_days": -5
  }'
# Returns: 422 Validation Error
```

## How It Works

### 1. User Experience
1. User navigates to `http://localhost:3000/daily-scraping`
2. User sees the new "Minimum Days Running" field in the Schedule Configuration section
3. User can enter a number (e.g., 15) to only scrape ads running for at least 15 days
4. User can leave the field empty to include all ads regardless of duration

### 2. Backend Processing
1. API receives the `min_duration_days` parameter
2. Parameter is validated (must be >= 1 or null)
3. FacebookAdsScraperService is initialized with the duration filter
4. During ad processing, each ad's duration is calculated and compared
5. Only ads meeting the minimum duration requirement are saved to the database

### 3. Filtering Logic
- **Duration Calculation**: Based on ad start_date, end_date, and active status
- **Active Ads**: Duration calculated from start_date to current time
- **Inactive Ads**: Duration calculated from start_date to end_date
- **Filter Application**: Ads with duration < min_duration_days are excluded

## Files Modified

### Backend Files:
- `backend/app/routers/daily_scraping.py` - Added min_duration_days parameter and validation
- `backend/app/tasks/daily_ads_scraper.py` - Updated task functions to accept and use the parameter

### Frontend Files:
- `frontend/src/app/daily-scraping/page.tsx` - Added UI field and API integration

### Test Files:
- `test_minimum_days_running.py` - Comprehensive test suite for the new feature

## Usage Examples

### Frontend Usage:
1. Open `http://localhost:3000/daily-scraping`
2. Configure your scraping parameters
3. Set "Minimum Days Running" to desired value (e.g., 7 for ads running at least 7 days)
4. Click "Start Manual Scraping"

### API Usage:
```python
import requests

# Daily scraping with minimum days filter
response = requests.post("http://localhost:8000/api/v1/scraping/daily/start", json={
    "countries": ["AE", "US"],
    "max_pages_per_competitor": 5,
    "delay_between_requests": 2,
    "days_lookback": 3,
    "min_duration_days": 10,  # Only ads running for at least 10 days
    "active_status": "all"
})

# Specific competitor scraping with minimum days filter
response = requests.post("http://localhost:8000/api/v1/scraping/competitors/scrape", json={
    "competitor_ids": [79, 80],
    "countries": ["AE"],
    "max_pages_per_competitor": 3,
    "min_duration_days": 15,  # Only ads running for at least 15 days
    "active_status": "active"
})
```

## Benefits

1. **Quality Filtering**: Focus on ads that have proven longevity and performance
2. **Reduced Noise**: Filter out short-lived test ads or failed campaigns
3. **Better Analysis**: Analyze only ads that have had time to gather meaningful data
4. **Consistent Interface**: Same filtering capability as the competitors page
5. **Flexible Usage**: Can be combined with other filters for precise targeting

## Future Enhancements

Potential improvements that could be added:
1. **Maximum Days Running**: Add upper bound filtering
2. **Date Range Filtering**: Add specific date range selection
3. **Performance Metrics**: Filter by engagement rates or other metrics
4. **Saved Filters**: Allow users to save and reuse filter configurations
5. **Bulk Operations**: Apply filters to multiple competitor selections

## Conclusion

The Minimum Days Running feature has been successfully implemented and tested. It provides users with powerful filtering capabilities to focus their analysis on ads that have demonstrated staying power, leading to more meaningful insights and better competitive intelligence.

The implementation follows best practices:
- ✅ Proper validation and error handling
- ✅ Consistent UI/UX patterns
- ✅ Comprehensive testing
- ✅ Docker compatibility
- ✅ API documentation
- ✅ Type safety with TypeScript and Pydantic

The feature is now ready for production use and provides the same functionality as the competitors page, ensuring a consistent user experience across the platform.