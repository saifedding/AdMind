# Celery Task Cleanup

## Problem
After upgrading the async video generation task handler, old task results in Redis may be corrupted and cause errors like:
```
ValueError: Exception information must include the exception type
```

## Solution

### Option 1: Clear All Celery Results (Recommended for Development)
This will clear all task results from Redis, forcing fresh starts:

```bash
# Connect to Redis container
docker-compose exec redis redis-cli

# Clear all Celery task results
FLUSHDB

# Exit
exit
```

### Option 2: Restart Redis (Nuclear Option)
```bash
docker-compose restart redis
```

### Option 3: Let Them Expire Naturally
Celery task results expire after 24 hours by default. Corrupted tasks will automatically disappear.

## Prevention
The code has been updated to:
1. **Not manually set FAILURE state** - Let Celery handle exception serialization
2. **Catch corrupted task state errors** - Return user-friendly error message
3. **Log warnings** - Track which tasks are corrupted for debugging

## How It Works Now

**Before (Broken):**
```python
except Exception as exc:
    self.update_state(state='FAILURE', meta={'error': str(exc)})  # ❌ Bad
    raise exc  # Celery overwrites with incompatible format
```

**After (Fixed):**
```python
except Exception as exc:
    logger.error(f"Task failed: {exc}")
    raise  # ✅ Let Celery handle serialization
```

**Status Endpoint (Fixed):**
```python
try:
    task_state = task_result.state  # May raise ValueError
except (ValueError, KeyError) as e:
    # Return friendly error for corrupted tasks
    return VeoTaskStatusResponse(state='FAILURE', error='Task corrupted, retry')
```

## Testing
After cleanup, test async video generation:
1. Start a new video generation
2. Poll `/api/v1/settings/ai/veo/tasks/{task_id}/status`
3. Should see: PENDING → PROGRESS → SUCCESS or FAILURE
4. No more "Exception information must include" errors
