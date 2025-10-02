# Tasks Page Enhancements - Per-Competitor Details & Error Display

## Date: October 2, 2025

## Overview
Enhanced the Tasks page to show detailed per-competitor scraping results and comprehensive error information for multi-competitor scraping tasks.

## New Features

### 1. ✅ Per-Competitor Results Tab
**New "Competitors" Tab** showing individual results for each competitor in a multi-competitor scraping task.

**Displays:**
- Competitor name and Page ID
- Individual stats for each competitor:
  - **Processed**: Total ads processed
  - **Created**: New ads created
  - **Updated**: Ads updated
  - **Errors**: Errors encountered
  - **New ads count**: New ads found (if available)
- Sequential numbering (#1, #2, etc.)
- Color-coded metrics (green for success, red for errors)

### 2. ✅ Detailed Error Display
**Comprehensive Error Section** showing all competitors that encountered errors during scraping.

**Displays:**
- Error count in section header
- Per-competitor error cards with:
  - Competitor name
  - Competitor ID
  - Full error message
  - Visual error indicators (red styling, X icons)

### 3. ✅ Quick Error Preview in Task Cards
**Enhanced task cards** now show error indicators inline with other metrics.

**Displays:**
- Number of errors (if any) with red X icon
- Number of competitors processed
- Maintains existing metrics (ads scraped, created, updated)

## Updated TypeScript Interfaces

### CompetitorResult Interface
```typescript
interface CompetitorResult {
  competitor_id: number;
  competitor_name: string;
  page_id: string;
  stats: {
    total_processed: number;
    created: number;
    updated: number;
    errors: number;
    new_ads_count?: number;
  };
  processed_at: string;
}
```

### TaskError Interface
```typescript
interface TaskError {
  competitor_id: number;
  competitor_name: string;
  error: string;
}
```

### Updated TaskResult Interface
```typescript
interface TaskResult {
  success: boolean;
  competitor_page_id: string;
  total_ads_scraped: number;
  database_stats: { ... };
  completion_time: string;
  task_id: string;
  competitors_results?: CompetitorResult[];  // NEW
  errors?: TaskError[];                      // NEW
}
```

## UI Components Added

### 1. Competitors Tab
**Location**: Task Details Modal → Competitors Tab

**Features**:
- Grid layout showing all competitor cards
- Per-competitor stats with visual indicators
- Color-coded metrics (blue for created, yellow for updated, red/green for errors)
- Badge showing competitor sequence number
- "New ads found" indicator when available

### 2. Errors Section
**Location**: Task Details Modal → Competitors Tab (bottom section)

**Features**:
- Red-themed card for errors
- Error count in header
- Individual error cards for each failed competitor
- Full error message display in code-style box
- Visual hierarchy with icons and colors

### 3. Quick Preview in Task Cards
**Location**: Main Tasks List → Individual Task Cards

**Features**:
- Inline error count display
- Competitor count display
- Maintains compact layout
- Only shows when errors exist

## Backend Data Structure

The backend returns this structure in the task result:

```json
{
  "task_id": "...",
  "success": true,
  "competitors_results": [
    {
      "competitor_id": 1,
      "competitor_name": "Competitor A",
      "page_id": "123456",
      "stats": {
        "total_processed": 50,
        "created": 10,
        "updated": 5,
        "errors": 1,
        "new_ads_count": 10
      },
      "processed_at": "2025-10-02T05:00:00"
    }
  ],
  "errors": [
    {
      "competitor_id": 2,
      "competitor_name": "Competitor B",
      "error": "Error processing competitor: ..."
    }
  ],
  "database_stats": { ... }
}
```

## Use Cases

### Scenario 1: All Competitors Scraped Successfully
- **Overview Tab**: Shows overall stats
- **Competitors Tab**: Lists all competitors with their individual stats
- **Errors Section**: Hidden (no errors)
- **Task Card**: Shows competitor count, no error indicator

### Scenario 2: Some Competitors Failed
- **Overview Tab**: Shows overall stats with error count
- **Competitors Tab**: 
  - Top section: Successful competitors with stats
  - Bottom section: Failed competitors with error messages
- **Task Card**: Shows error count in red

### Scenario 3: Single Competitor Scraping
- **Competitors Tab**: Shows "No per-competitor results available" message
- Backend doesn't include `competitors_results` array for single competitor tasks
- Other tabs work normally

## Visual Design

### Color Scheme
- **Green**: Success metrics (ads scraped, created with no errors)
- **Blue**: Created ads
- **Yellow**: Updated ads
- **Red**: Errors and failures
- **Muted**: Secondary information

### Layout
- **Responsive**: Adapts to screen size with grid layouts
- **Consistent**: Matches existing task page design
- **Hierarchical**: Clear visual hierarchy with cards and sections

## Files Modified

### Frontend
- `frontend/src/app/tasks/page.tsx`
  - Added interfaces: `CompetitorResult`, `TaskError`
  - Updated interface: `TaskResult`
  - Added new tab: "Competitors"
  - Enhanced task cards with error preview
  - Added error display section

## Benefits

1. **Detailed Insights**: See exactly which competitors succeeded/failed
2. **Error Debugging**: Full error messages for troubleshooting
3. **Progress Tracking**: Monitor individual competitor scraping progress
4. **Better UX**: Clear visual indicators for success/failure states
5. **Scalability**: Works for any number of competitors

## Testing

### Test Case 1: Multi-Competitor Task (All Success)
1. Start Daily Scraping with all competitors
2. Wait for completion
3. Open task details
4. ✅ Competitors tab shows all competitors
5. ✅ Each has individual stats
6. ✅ No errors section shown

### Test Case 2: Multi-Competitor Task (Some Errors)
1. Start scraping (some competitors have errors)
2. Wait for completion
3. ✅ Task card shows error count
4. ✅ Competitors tab shows successful results
5. ✅ Errors section shows failed competitors
6. ✅ Error messages are clear and detailed

### Test Case 3: Single Competitor Task
1. Scrape single competitor from Competitors page
2. Open task details
3. ✅ Competitors tab shows "not available" message
4. ✅ Other tabs work normally

## Future Enhancements (Optional)

1. **Sorting**: Allow sorting competitors by stats (most ads, errors, etc.)
2. **Filtering**: Filter to show only failed competitors
3. **Export**: Export per-competitor results to CSV
4. **Progress**: Show real-time progress per competitor (for PROGRESS state)
5. **Retry**: Button to retry failed competitors individually
6. **Charts**: Visual charts showing competitor comparison

## Example Scenarios

### Example 1: Daily Scraping of 10 Competitors
```
Task Card Preview:
- 150 ads scraped
- 30 created
- 20 updated
- Processed 10 competitor(s)
- 2 error(s) ⚠️

Competitors Tab:
✅ Competitor A: 20 ads (5 new)
✅ Competitor B: 15 ads (3 new)
❌ Competitor C: Error (details in errors section)
✅ Competitor D: 25 ads (8 new)
... etc ...

Errors Section:
❌ Competitor C: "Facebook API Error: Rate limit exceeded"
❌ Competitor F: "Error: Page not found"
```

### Example 2: Perfect Scraping Run
```
Task Card Preview:
- 200 ads scraped
- 45 created
- 30 updated
- Processed 15 competitor(s)
(No errors shown)

Competitors Tab:
✅ All 15 competitors listed with green success indicators
✅ Individual stats shown for each
(Errors section not displayed)
```

## Impact

✅ **Transparency**: Users now see exactly what happened with each competitor
✅ **Debugging**: Error messages help identify and fix issues
✅ **Confidence**: Clear success indicators build trust in the system
✅ **Efficiency**: Quickly identify problem competitors without checking logs
