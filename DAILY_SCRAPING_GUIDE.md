# Daily Ads Scraping Guide

This guide explains how to set up and use the daily ads scraping system to automatically collect new ads from your saved Facebook pages.

## 🚀 Quick Start

### 1. Start the Application
```bash
docker-compose up --build
```

### 2. Add Your Competitors
First, add the Facebook pages you want to monitor:
```bash
curl -X POST "http://localhost:8000/api/v1/competitors/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nike",
    "page_id": "15087023549",
    "is_active": true
  }'
```

### 3. Start Daily Scraping (Manual)
```bash
python daily_scraping_cli.py daily --monitor
```

## 📊 System Overview

### Automatic Daily Scraping
The system is configured to automatically run once per day and:

1. **Find Active Competitors**: Gets all competitors with `is_active = true`
2. **Check Latest Ads**: For each competitor, finds the latest ad date
3. **Scrape New Ads Only**: Fetches ads newer than the latest date (or last 24 hours for new competitors)
4. **Process & Save**: Uses enhanced extraction to save ads to database
5. **Generate Reports**: Provides detailed results for each competitor

### Schedule
- **Automatic**: Runs daily at the same time (configured in Celery Beat)
- **Manual**: Can be triggered anytime via API or CLI
- **Specific Competitors**: Can run scraping for selected competitors only

## 🛠 Configuration

### Environment Variables
Add these to your `.env` file:

```bash
# Daily Scraping Configuration
DAILY_SCRAPING_COUNTRIES=AE,US,UK
DAILY_SCRAPING_MAX_PAGES=3
DAILY_SCRAPING_DELAY=2
DAILY_SCRAPING_HOURS_LOOKBACK=24
DAILY_SCRAPING_ACTIVE_STATUS=active
```

### Celery Beat Schedule
The daily task is configured in `backend/app/celery_worker.py`:

```python
'daily-new-ads-scraping': {
    'task': 'daily_ads_scraper.scrape_new_ads_daily',
    'schedule': 86400.0,  # Run once daily (24 hours)
    'kwargs': {
        'countries': ['AE', 'US', 'UK'],
        'max_pages_per_competitor': 3,
        'delay_between_requests': 2,
        'hours_lookback': 24,
        'active_status': 'active'
    }
}
```

## 🎯 Usage Methods

### Method 1: CLI Tool (Recommended)

#### Install Requirements
```bash
pip install requests
```

#### List Active Competitors
```bash
python daily_scraping_cli.py competitors
```

#### Start Daily Scraping for All Competitors
```bash
python daily_scraping_cli.py daily --monitor
```

#### Start Scraping for Specific Competitors
```bash
python daily_scraping_cli.py specific 1 2 3 --monitor
```

#### Check Task Status
```bash
python daily_scraping_cli.py status <task_id>
```

#### Monitor Task Progress
```bash
python daily_scraping_cli.py monitor <task_id>
```

### Method 2: API Endpoints

#### Start Daily Scraping
```bash
curl -X POST "http://localhost:8000/api/v1/scraping/daily/start" \
  -H "Content-Type: application/json" \
  -d '{
    "countries": ["AE", "US", "UK"],
    "max_pages_per_competitor": 3,
    "delay_between_requests": 2,
    "hours_lookback": 24,
    "active_status": "active"
  }'
```

#### Start Specific Competitors Scraping
```bash
curl -X POST "http://localhost:8000/api/v1/scraping/competitors/scrape" \
  -H "Content-Type: application/json" \
  -d '{
    "competitor_ids": [1, 2, 3],
    "countries": ["AE", "US", "UK"],
    "max_pages_per_competitor": 3,
    "delay_between_requests": 2,
    "active_status": "active"
  }'
```

#### Check Task Status
```bash
curl "http://localhost:8000/api/v1/scraping/tasks/{task_id}/status"
```

#### Get Active Competitors
```bash
curl "http://localhost:8000/api/v1/scraping/active-competitors"
```

### Method 3: Frontend Integration

Access the scraping endpoints through the FastAPI documentation:
- Open `http://localhost:8000/docs`
- Navigate to the "daily-scraping" section
- Use the interactive API interface

## 📊 Understanding Results

### Task Response Format
```json
{
  "task_id": "abc123-def456-ghi789",
  "status": "completed",
  "start_time": "2024-01-15T10:00:00Z",
  "end_time": "2024-01-15T10:15:00Z",
  "competitors_processed": 5,
  "total_new_ads": 23,
  "total_processed_ads": 150,
  "competitors_results": [
    {
      "competitor_id": 1,
      "competitor_name": "Nike",
      "page_id": "15087023549",
      "stats": {
        "total_processed": 45,
        "created": 8,
        "updated": 2,
        "new_ads_count": 8
      },
      "processed_at": "2024-01-15T10:05:00Z"
    }
  ],
  "errors": []
}
```

### Key Metrics
- **total_new_ads**: Truly new ads found (not in database)
- **total_processed_ads**: All ads processed (including existing ones)
- **competitors_processed**: Number of competitors successfully scraped
- **errors**: Any errors encountered during scraping

## 🔧 Advanced Configuration

### Custom Scheduling
To change the daily schedule, modify `backend/app/celery_worker.py`:

```python
'daily-new-ads-scraping': {
    'task': 'daily_ads_scraper.scrape_new_ads_daily',
    'schedule': crontab(hour=2, minute=0),  # Run at 2:00 AM daily
    # ... other config
}
```

### Facebook Session Configuration
Update Facebook session parameters in `backend/app/services/facebook_ads_scraper.py`:

1. Open Facebook Ads Library in browser
2. Open Developer Tools (F12) → Network tab
3. Perform a search
4. Find 'graphql' request and copy:
   - Cookie string
   - lsd token
   - jazoest value
5. Update `FacebookAdsScraperConfig` class

### Country-Specific Configuration
```python
# Different countries for different competitors
countries_config = {
    'nike': ['US', 'UK', 'DE'],
    'adidas': ['AE', 'SA', 'EG'],
    'default': ['AE', 'US', 'UK']
}
```

## 🚨 Troubleshooting

### Common Issues

#### 1. No Active Competitors Found
```bash
# Check competitors
curl "http://localhost:8000/api/v1/competitors/"

# Activate a competitor
curl -X PUT "http://localhost:8000/api/v1/competitors/1" \
  -H "Content-Type: application/json" \
  -d '{"is_active": true}'
```

#### 2. Facebook Session Expired
- Update session parameters in scraper configuration
- Check Facebook Ads Library access in browser
- Update cookie, lsd_token, and jazoest values

#### 3. Celery Worker Not Running
```bash
# Check Celery worker status
docker-compose logs -f worker

# Restart Celery services
docker-compose restart worker beat
```

#### 4. Task Stuck in Pending
```bash
# Check active tasks
python daily_scraping_cli.py tasks

# Cancel stuck task
curl -X DELETE "http://localhost:8000/api/v1/scraping/tasks/{task_id}/cancel"
```

### Monitoring Commands

#### Check System Health
```bash
curl "http://localhost:8000/api/v1/health/detailed"
```

#### View Celery Task Queue
```bash
docker-compose exec worker celery -A app.celery_worker inspect active
```

#### Check Database
```bash
docker-compose exec db psql -U ads_user -d ads_db -c "
  SELECT 
    c.name, 
    COUNT(a.id) as ads_count,
    MAX(a.created_at) as latest_ad
  FROM competitors c 
  LEFT JOIN ads a ON c.id = a.competitor_id 
  WHERE c.is_active = true 
  GROUP BY c.id, c.name;
"
```

## 📈 Best Practices

### 1. Competitor Management
- Keep competitor list updated and relevant
- Deactivate competitors you no longer need to monitor
- Use descriptive names for easy identification

### 2. Scraping Configuration
- Start with conservative settings (max_pages=3, delay=2)
- Adjust based on Facebook rate limits and response times
- Monitor for blocks or errors

### 3. Monitoring
- Set up alerts for failed daily tasks
- Regularly check for new ads and task results
- Monitor disk space for ad media storage

### 4. Data Management
- Archive old ads periodically
- Clean up duplicate entries
- Backup important competitor and ad data

## 🔄 Automation Examples

### PowerShell Script (Windows)
```powershell
# daily_check.ps1
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/scraping/daily/start" -Method Post -ContentType "application/json" -Body '{"countries":["AE","US","UK"]}'
Write-Host "Daily scraping started: $($response.task_id)"
```

### Bash Script (Linux/Mac)
```bash
#!/bin/bash
# daily_check.sh
response=$(curl -s -X POST "http://localhost:8000/api/v1/scraping/daily/start" -H "Content-Type: application/json" -d '{"countries":["AE","US","UK"]}')
task_id=$(echo $response | jq -r '.task_id')
echo "Daily scraping started: $task_id"
```

### Cron Job
```bash
# Add to crontab for daily execution at 3 AM
0 3 * * * /path/to/daily_check.sh >> /var/log/ads_scraping.log 2>&1
```

---

## 📞 Support

For issues or questions:
1. Check the FastAPI docs: `http://localhost:8000/docs`
2. Review Celery logs: `docker-compose logs -f worker`
3. Monitor task status using the CLI tool
4. Check the main README.md for general setup issues

Happy scraping! 🎯📊