# Concurrent Video Generation Implementation

## Problem
Previously, when clicking multiple "Generate Video" buttons in the download-ads page, the backend API would process video generation requests **sequentially** rather than concurrently. This was because:

1. The `/api/v1/settings/ai/veo/generate-video` endpoint was **synchronous** and **blocking**
2. Each request waited for the entire video generation to complete (up to 600 seconds)
3. Multiple simultaneous requests would queue up and process one at a time

## Solution
Implemented an **asynchronous task-based system** using Celery to allow multiple video generations to run concurrently.

## Changes Made

### 1. Backend - Celery Task (`backend/app/tasks/veo_generation_tasks.py`)
Created a new Celery task `generate_veo_video_task` that:
- Runs video generation asynchronously in a background worker
- Updates task state with progress information
- Automatically saves the generated video to the database
- Supports concurrent execution (multiple tasks can run simultaneously)

### 2. Backend - API Endpoints (`backend/app/routers/settings.py`)
Added two new endpoints:

#### `/api/v1/settings/ai/veo/generate-video-async` (POST)
- Starts async video generation
- Returns immediately with a `task_id`
- Request body:
  ```json
  {
    "prompt": "string",
    "aspect_ratio": "VIDEO_ASPECT_RATIO_PORTRAIT",
    "video_model_key": "veo_3_1_t2v_portrait",
    "seed": 9831,
    "ad_id": 123
  }
  ```
- Response:
  ```json
  {
    "success": true,
    "task_id": "abc-123-def",
    "message": "Video generation started...",
    "estimated_time_seconds": 600
  }
  ```

#### `/api/v1/settings/ai/veo/tasks/{task_id}/status` (GET)
- Polls for task completion status
- Returns current state: `PENDING`, `PROGRESS`, `SUCCESS`, or `FAILURE`
- Response when complete:
  ```json
  {
    "task_id": "abc-123-def",
    "state": "SUCCESS",
    "status": "Video generation completed",
    "progress": 100,
    "result": {
      "video_url": "https://...",
      "generation_id": 456,
      "generation_time": 120,
      ...
    }
  }
  ```

### 3. Frontend - API Client (`frontend/src/lib/api.ts`)
Added new API methods:
- `generateVeoVideoAsync()` - Start async generation
- `getVeoTaskStatus()` - Poll for task status

### 4. Frontend - UI Logic (`frontend/src/app/download-ads/page.tsx`)
Updated `handleGenerateVeoFromPrompt()` to:
1. Call `generateVeoVideoAsync()` to start generation (returns immediately)
2. Poll `getVeoTaskStatus()` every 3 seconds
3. Update UI when generation completes
4. Handle errors and cleanup intervals

### 5. Celery Worker Configuration (`backend/app/celery_worker.py`)
Added `veo_generation_tasks` to the Celery worker's task registry.

## How It Works

### Before (Synchronous)
```
User clicks "Generate" → API blocks for 2-10 minutes → Returns video URL
User clicks "Generate" again → Waits for first to finish → Then starts
```

### After (Asynchronous)
```
User clicks "Generate" → API returns task_id immediately → Frontend polls for status
User clicks "Generate" again → API returns different task_id → Both run concurrently
User clicks "Generate" 5 more times → All 7 tasks run concurrently in Celery workers
```

## Benefits

1. **Concurrent Processing**: Multiple video generations can run simultaneously
2. **Non-Blocking API**: Frontend gets immediate response with task_id
3. **Better UX**: Users can start multiple generations without waiting
4. **Scalability**: Celery workers can be scaled horizontally
5. **Progress Tracking**: Task state provides real-time progress updates
6. **Automatic Persistence**: Generated videos are automatically saved to database

## Testing

To test concurrent video generation:

1. **Start the backend services**:
   ```bash
   npm run rebuild
   ```

2. **Verify Celery worker is running**:
   Check Docker logs for the Celery worker container

3. **Test in the UI**:
   - Go to `http://localhost:3000/download-ads`
   - Analyze a video to get prompts
   - Click "Generate" on multiple prompts quickly
   - Observe that all generations start immediately (not sequentially)
   - Watch the countdown timers for each generation
   - Verify videos appear when complete

4. **Monitor backend logs**:
   ```bash
   docker logs -f <celery-worker-container>
   ```
   You should see multiple `generate_veo_video_task` tasks running concurrently

## Backward Compatibility

The old synchronous endpoint `/api/v1/settings/ai/veo/generate-video` is still available but marked as **DEPRECATED**. It will continue to work but is not recommended for concurrent use.

## Configuration

### Celery Worker Settings
- `worker_prefetch_multiplier=1`: Workers fetch one task at a time
- `task_time_limit=900`: Maximum 15 minutes per task
- `task_soft_time_limit=840`: Soft limit at 14 minutes

### Task Polling
- Frontend polls every **3 seconds**
- Backend task updates progress at key stages
- Automatic cleanup of intervals when complete

## Troubleshooting

### Issue: Tasks not running
**Solution**: Ensure Celery worker is running in Docker
```bash
docker ps | grep celery
```

### Issue: Tasks stuck in PENDING
**Solution**: Check Redis connection (Celery broker)
```bash
docker logs <redis-container>
```

### Issue: Multiple generations still sequential
**Solution**: Increase Celery worker concurrency
```yaml
# docker-compose.yml
celery-worker:
  command: celery -A app.celery_worker worker --loglevel=info --concurrency=4
```

## Future Enhancements

1. **WebSocket Support**: Real-time progress updates instead of polling
2. **Queue Priority**: Prioritize certain generations over others
3. **Batch Generation**: Generate multiple prompts in a single task
4. **Progress Bar**: Show actual progress percentage from Veo API
5. **Cancel Task**: Allow users to cancel in-progress generations
