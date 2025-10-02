# Celery Task Registration - Troubleshooting Guide

## 🔴 Common Error: "Received unregistered task"

### Error Message
```
Received unregistered task of type 'daily_ads_scraper.scrape_specific_competitors'.
The message has been ignored and discarded.

Did you remember to import the module containing this task?
```

### Why This Happens
When you add new Celery tasks or make changes to existing ones, the **Celery workers need to be restarted** to pick up the changes. The workers cache the available tasks when they start.

### ✅ Quick Fix

**Option 1: Use the PowerShell Script**
```powershell
.\restart_workers.ps1
```

**Option 2: Manual Restart**
```bash
docker-compose restart worker beat
```

**Option 3: Restart Everything (if issues persist)**
```bash
docker-compose down
docker-compose up --build
```

## 🔍 Verification Steps

### 1. Check if Workers are Running
```bash
docker-compose ps
```

Should show:
```
ads_worker   Up
ads_beat     Up
```

### 2. Verify Registered Tasks
```bash
docker-compose exec worker celery -A app.celery_worker inspect registered
```

Should include:
```python
[tasks]
  . daily_ads_scraper.scrape_new_ads_daily
  . daily_ads_scraper.scrape_specific_competitors
  . facebook_ads_scraper.scrape_competitor_ads
  . facebook_ads_scraper.get_task_status
  . facebook_ads_scraper.scrape_ads
```

### 3. Check Worker Logs
```bash
docker-compose logs worker | Select-Object -Last 50
```

Look for:
- ✅ "celery@... ready"
- ✅ List of registered tasks
- ❌ Any import errors or exceptions

## 🛠️ Common Issues and Solutions

### Issue 1: Tasks Still Not Registered After Restart

**Symptoms:**
- Restarted workers but tasks still not showing
- Import errors in logs

**Solution:**
```bash
# 1. Check for Python syntax errors
docker-compose logs worker | Select-String -Pattern "error"

# 2. Rebuild containers
docker-compose build worker beat

# 3. Restart
docker-compose up -d worker beat
```

### Issue 2: Tasks Work in CLI but Not in Frontend

**Symptoms:**
- `python daily_scraping_cli.py` works
- Frontend shows "FAILURE" status

**Solution:**
1. Clear browser cache (Ctrl+Shift+R)
2. Check API is accessible:
   ```bash
   curl http://localhost:8000/api/v1/scraping/active-competitors
   ```
3. Verify frontend is using correct API endpoint
4. Check browser console (F12) for errors

### Issue 3: "No nodes replied within time constraint"

**Symptoms:**
```
Error: No nodes replied within time constraint
```

**Solution:**
```bash
# Workers might still be starting up
# Wait 10-15 seconds and try again

Start-Sleep -Seconds 15
docker-compose exec worker celery -A app.celery_worker inspect active
```

### Issue 4: Redis Connection Errors

**Symptoms:**
```
Error connecting to Redis
ConnectionRefusedError
```

**Solution:**
```bash
# Check Redis is running
docker-compose ps redis

# Restart Redis
docker-compose restart redis

# Restart dependent services
docker-compose restart worker beat api
```

### Issue 5: Database Errors in Tasks

**Symptoms:**
```
sqlalchemy.exc.OperationalError
relation "competitors" does not exist
```

**Solution:**
```bash
# Run migrations
docker-compose exec api alembic upgrade head

# Or rebuild database
docker-compose down -v
docker-compose up --build
```

## 📋 Task Registration Checklist

When adding new Celery tasks:

- [ ] Task defined with `@celery_app.task` decorator
- [ ] Task module added to `celery_worker.py` include list
- [ ] Task has unique name (name parameter in decorator)
- [ ] Worker and beat containers restarted
- [ ] Verified task shows in registered tasks list
- [ ] Test task execution with minimal parameters
- [ ] Frontend API endpoint correctly calls the task

## 🔄 Development Workflow

### After Adding/Modifying Tasks:

1. **Save Changes**
   ```bash
   # Make your changes to task files
   ```

2. **Restart Workers**
   ```powershell
   .\restart_workers.ps1
   ```

3. **Verify Registration**
   ```bash
   docker-compose exec worker celery -A app.celery_worker inspect registered
   ```

4. **Test Task**
   ```python
   python daily_scraping_cli.py competitors
   python daily_scraping_cli.py specific 1 --monitor
   ```

5. **Check Frontend**
   - Navigate to http://localhost:3000/daily-scraping
   - Try manual scraping
   - Monitor task status

## 🐛 Debug Commands

### View All Active Tasks
```bash
docker-compose exec worker celery -A app.celery_worker inspect active
```

### View Scheduled Tasks (Beat)
```bash
docker-compose exec beat celery -A app.celery_worker inspect scheduled
```

### View Task Queue
```bash
docker-compose exec worker celery -A app.celery_worker inspect reserved
```

### Purge All Tasks (⚠️ Caution)
```bash
docker-compose exec worker celery -A app.celery_worker purge
```

### Check Celery Configuration
```bash
docker-compose exec worker celery -A app.celery_worker inspect conf
```

## 📊 Monitor Tasks in Real-Time

### Option 1: Watch Logs
```bash
docker-compose logs -f worker
```

### Option 2: Use Flower (Optional)

Add to `docker-compose.yml`:
```yaml
flower:
  build:
    context: ./backend
  command: celery -A app.celery_worker flower
  ports:
    - "5555:5555"
  depends_on:
    - redis
    - worker
```

Then access: http://localhost:5555

## 🚨 Emergency Recovery

If nothing works and you need to start fresh:

```bash
# 1. Stop everything
docker-compose down

# 2. Remove volumes (⚠️ deletes data)
docker-compose down -v

# 3. Rebuild from scratch
docker-compose build --no-cache

# 4. Start fresh
docker-compose up -d

# 5. Run migrations
docker-compose exec api alembic upgrade head

# 6. Add test competitor
curl -X POST "http://localhost:8000/api/v1/competitors/" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Company", "page_id": "123456789", "is_active": true}'
```

## 📝 Best Practices

1. **Always restart workers after code changes**
2. **Check logs immediately after restart**
3. **Test with CLI before using frontend**
4. **Keep task names unique and descriptive**
5. **Use meaningful error messages in tasks**
6. **Log important steps in task execution**
7. **Handle database sessions properly (close in finally blocks)**
8. **Test with small datasets first**

## 🔗 Useful Links

- Celery Documentation: https://docs.celeryq.dev/
- Task Registration: https://docs.celeryq.dev/en/stable/userguide/tasks.html
- Troubleshooting: https://docs.celeryq.dev/en/stable/faq.html

---

**Remember**: Most Celery issues are solved by simply restarting the workers! 🔄