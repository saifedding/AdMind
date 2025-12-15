# Bulk Competitor Scraping Feature

## Overview
Added comprehensive bulk scraping functionality that allows users to select multiple competitors and scrape all their ads with the same configuration settings. The feature includes robust error handling, retry logic, and real-time progress monitoring.

## Features Implemented

### 1. Backend API Endpoints

#### Bulk Scraping Endpoint
- **Route**: `POST /competitors/bulk/scrape`
- **Purpose**: Start scraping tasks for multiple competitors simultaneously
- **Features**:
  - Validates all competitors exist and are active
  - Starts individual scraping tasks for each competitor
  - Handles errors gracefully with detailed reporting
  - Returns task IDs for progress monitoring

#### Bulk Status Monitoring
- **Route**: `GET /competitors/bulk/scrape/status`
- **Purpose**: Monitor progress of multiple scraping tasks
- **Features**:
  - Aggregated status summary (pending, progress, success, failure)
  - Individual task status details
  - Overall completion status

### 2. Enhanced Task System

#### Retry Logic
- **Auto-retry**: Tasks automatically retry up to 3 times on failure
- **Backoff Strategy**: Exponential backoff with jitter to prevent thundering herd
- **Countdown**: 60-second delay between retries
- **Progress Updates**: Real-time status updates during retry attempts

#### Error Handling
- **Graceful Failures**: Individual competitor failures don't affect others
- **Detailed Logging**: Comprehensive error logging for debugging
- **Status Reporting**: Clear error messages and retry information
- **Database Safety**: Proper rollback on errors

#### Progress Tracking
- **Real-time Updates**: Task progress updates at key stages
- **Step Information**: Current operation being performed
- **Progress Percentage**: Visual progress indication
- **Metadata**: Additional context like ads found, configuration used

### 3. Frontend Implementation

#### Bulk Selection UI
- **Select All**: Checkbox to select all visible competitors
- **Individual Selection**: Checkboxes for each competitor
- **Selection Counter**: Shows number of selected competitors
- **Bulk Actions Bar**: Appears when competitors are selected

#### Bulk Scraping Dialog
- **Configuration Panel**: Same settings as individual scraping
- **Selected Competitors**: Shows which competitors will be scraped
- **Validation**: Ensures proper configuration before starting
- **Progress Feedback**: Loading states and confirmation messages

#### Status Monitoring
- **Real-time Updates**: Polls backend every 3 seconds for status
- **Summary Dashboard**: Shows overall progress statistics
- **Individual Task Status**: Detailed view of each scraping task
- **Visual Indicators**: Color-coded status badges and progress bars

#### Local Storage Integration
- **Task Persistence**: Stores bulk scraping tasks in localStorage
- **History Tracking**: Maintains history of recent bulk operations
- **Recovery**: Can resume monitoring after page refresh

### 4. Error Handling & Recovery

#### Frontend Error Handling
- **Network Errors**: Graceful handling of API failures
- **Validation Errors**: Clear user feedback for invalid configurations
- **Timeout Handling**: Proper handling of long-running operations
- **User Feedback**: Informative error messages and success notifications

#### Backend Error Recovery
- **Database Transactions**: Proper transaction management
- **Resource Cleanup**: Ensures database connections are closed
- **Partial Failures**: Handles scenarios where some competitors fail
- **Retry Coordination**: Prevents duplicate tasks during retries

## Usage Instructions

### Starting Bulk Scraping
1. Navigate to the Competitors page
2. Select desired competitors using checkboxes
3. Click "Scrape Selected (X)" button in the selection bar
4. Configure scraping parameters in the dialog
5. Click "Start Bulk Scraping" to begin

### Monitoring Progress
1. Active bulk tasks show a progress card at the top
2. Click "View Progress" to see detailed status
3. Monitor individual task completion in real-time
4. Receive notifications when all tasks complete

### Configuration Options
- **Countries**: Select target countries for ad scraping
- **Max Pages**: Limit pages scraped per competitor
- **Delay**: Control request rate to avoid rate limiting
- **Ad Status**: Filter by active/inactive/all ads
- **Date Range**: Optional date filtering
- **Duration Filter**: Minimum days ads must be running

## Technical Implementation

### Database Schema
- No schema changes required
- Uses existing competitor and ad tables
- Leverages existing task tracking system

### API Models
```python
class BulkScrapeRequest(BaseModel):
    competitor_ids: List[int]
    countries: Optional[List[str]] = ["AE"]
    max_pages: Optional[int] = 5
    delay_between_requests: Optional[int] = 2
    active_status: Optional[str] = "active"
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    min_duration_days: Optional[int] = None

class BulkTaskResponse(BaseModel):
    task_ids: List[str]
    successful_starts: int
    failed_starts: int
    message: str
    details: List[dict]
```

### Task Configuration
```python
@celery_app.task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={'max_retries': 3, 'countdown': 60},
    retry_backoff=True,
    retry_jitter=True
)
```

## Benefits

### Efficiency
- **Batch Operations**: Process multiple competitors simultaneously
- **Parallel Execution**: Tasks run concurrently for faster completion
- **Resource Optimization**: Efficient use of system resources

### Reliability
- **Automatic Retries**: Handles temporary failures automatically
- **Error Isolation**: Individual failures don't affect other tasks
- **Progress Recovery**: Can resume monitoring after interruptions

### User Experience
- **Intuitive Interface**: Simple selection and configuration
- **Real-time Feedback**: Live progress updates and status
- **Comprehensive Reporting**: Detailed success/failure information

### Scalability
- **Configurable Limits**: Adjustable rate limiting and batch sizes
- **Resource Management**: Proper cleanup and resource handling
- **Monitoring Integration**: Built-in task monitoring and logging

## Future Enhancements

### Potential Improvements
1. **Scheduling**: Add ability to schedule bulk scraping operations
2. **Templates**: Save and reuse scraping configurations
3. **Notifications**: Email/webhook notifications on completion
4. **Analytics**: Detailed analytics on scraping performance
5. **Export**: Export bulk scraping results and reports

### Performance Optimizations
1. **Queue Management**: Priority queues for different task types
2. **Resource Pooling**: Connection pooling for database operations
3. **Caching**: Cache competitor data to reduce database queries
4. **Batch Processing**: Process results in batches for better performance

## Conclusion

The bulk scraping feature significantly enhances the platform's capability to handle large-scale competitor analysis. With robust error handling, retry logic, and comprehensive monitoring, users can efficiently scrape multiple competitors while maintaining system reliability and providing excellent user experience.