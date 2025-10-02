# Daily Scraping Control - Complete Setup Guide

## 🎉 What's New

You now have a **complete frontend interface** to control daily scraping of Facebook ads! This replaces manual CLI commands with an intuitive web interface.

## 🚀 Quick Start (3 Steps)

### 1. Start the Application
```bash
cd "C:\Users\ASUS\Documents\coding area\ads"
docker-compose up --build
```

### 2. Access the Interface
Open your browser to: **http://localhost:3000**

### 3. Configure Daily Scraping
1. Click **"Daily Scraping"** in the sidebar (Clock icon ⏰)
2. Toggle **"Enable Daily Scraping"** ON
3. Set your schedule time (e.g., 02:00 for 2 AM)
4. Configure parameters:
   - Max Pages: **3**
   - Delay: **2 seconds**
   - Hours Lookback: **24**
   - Countries: Select **AE, US, UK** (or your preferences)
5. Click **"Save Configuration"**
6. Test with **"Start Manual Scraping"** button

## 📊 What You Can Do

### In the Frontend:
✅ **Schedule Configuration**: Set when scraping runs daily  
✅ **Scraping Parameters**: Control pages, delays, and filters  
✅ **Country Selection**: Choose target countries with checkboxes + Select All/Clear  
✅ **Competitor Selection**: Choose specific competitors or scrape all  
✅ **Manual Trigger**: Start scraping immediately  
✅ **Real-time Monitoring**: Watch tasks progress live  
✅ **Task Management**: Cancel running tasks  
✅ **Results Display**: See new ads found, competitors processed

### Interface Features:
- 🎨 Beautiful, dark-themed UI
- 📱 Fully responsive (works on mobile)
- ⚡ Real-time updates
- 🔔 Visual status indicators
- 💾 Save/Reset configurations
- 📊 Competitor overview with latest ad dates

## 🗂️ File Structure

New files added:

```
frontend/
└── src/
    └── app/
        └── daily-scraping/
            └── page.tsx              # Main UI page

backend/
└── app/
    ├── routers/
    │   └── daily_scraping.py        # API endpoints
    └── tasks/
        └── daily_ads_scraper.py      # Background tasks

# Documentation
├── DAILY_SCRAPING_GUIDE.md           # Backend guide
├── DAILY_SCRAPING_SETUP.md           # This file
├── daily_scraping_cli.py             # CLI tool (optional)
└── frontend/
    └── DAILY_SCRAPING_FRONTEND.md    # Frontend guide
```

## 🎯 Usage Flow

```
┌─────────────────────────────────────────────────────────┐
│                    User Opens Frontend                   │
│              http://localhost:3000                       │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Navigate to Daily Scraping                  │
│            (Sidebar: Clock Icon)                         │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│           Configure Settings in UI                       │
│   • Schedule Time: 02:00                                 │
│   • Countries: AE, US, UK                                │
│   • Max Pages: 3                                         │
│   • Delay: 2 seconds                                     │
│   • Enable: ON                                           │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Click "Save Configuration"                  │
│         (Stores settings in backend)                     │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│         Optional: Click "Start Manual Scraping"          │
│           (Tests immediately)                            │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│            Watch Real-time Progress                      │
│   • Task Status: PENDING → STARTED → SUCCESS             │
│   • See competitors processed                            │
│   • View new ads found                                   │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│           Automatic Daily Execution                      │
│    (Celery Beat runs at scheduled time)                 │
└─────────────────────────────────────────────────────────┘
```

## 🔧 API Endpoints Available

All accessible through the frontend, but also available via API:

```bash
# Start daily scraping
POST http://localhost:8000/api/v1/scraping/daily/start

# Start specific competitors
POST http://localhost:8000/api/v1/scraping/competitors/scrape

# Check task status
GET http://localhost:8000/api/v1/scraping/tasks/{task_id}/status

# Get active competitors
GET http://localhost:8000/api/v1/scraping/active-competitors

# View active tasks
GET http://localhost:8000/api/v1/scraping/tasks/active

# Cancel task
DELETE http://localhost:8000/api/v1/scraping/tasks/{task_id}/cancel
```

## 📝 Example Configuration

**Recommended for Daily Use:**
```
Enable Daily Scraping: ✅ ON
Schedule Time: 02:00 (2 AM)
Max Pages per Competitor: 3
Delay Between Requests: 2 seconds
Hours Lookback: 24
Active Status: Active Only
Countries: ✅ UAE, ✅ US, ✅ UK
```

**For Testing:**
```
Enable Daily Scraping: ❌ OFF
Max Pages per Competitor: 1
Delay Between Requests: 1 second
Hours Lookback: 48
Active Status: All
Countries: ✅ UAE
```

## 🐛 Troubleshooting

### Frontend Not Loading
```bash
# Check if containers are running
docker-compose ps

# Check frontend logs
docker-compose logs -f web

# Restart frontend
docker-compose restart web
```

### API Calls Failing
```bash
# Check backend logs
docker-compose logs -f api

# Verify API is accessible
curl http://localhost:8000/api/v1/health

# Check CORS settings
docker-compose logs api | grep CORS
```

### No Competitors Showing
1. Go to Competitors page first
2. Add at least one competitor
3. Make sure competitor is **Active**
4. Click **Refresh** button in Daily Scraping page

### Tasks Not Running
```bash
# Check Celery worker
docker-compose logs -f worker

# Check Celery beat
docker-compose logs -f beat

# Restart Celery services
docker-compose restart worker beat
```

## 📖 Documentation

- **Frontend Guide**: `frontend/DAILY_SCRAPING_FRONTEND.md`
- **Backend Guide**: `DAILY_SCRAPING_GUIDE.md`
- **CLI Tool**: Use `python daily_scraping_cli.py --help`
- **API Docs**: Visit `http://localhost:8000/docs`

## 🎨 UI Preview

The interface includes:

1. **Header Section**
   - Title and description
   - Refresh and Start Manual Scraping buttons

2. **Task Status Card** (when running)
   - Live status updates
   - Progress indicators
   - Results display
   - Cancel button

3. **Configuration Cards**
   - Schedule Configuration (left)
   - Scraping Parameters (right)

4. **Countries Selection**
   - Grid of country checkboxes with flags
   - Multi-select capability

5. **Active Competitors**
   - List of saved pages
   - Latest ad dates
   - Count summary

6. **Competitor Selection Card** (NEW)
   - Checkbox list of all competitors
   - Select All / Clear Selection buttons
   - Visual highlighting for selected competitors
   - Info indicator showing selection status
   - Leave empty to scrape all competitors

7. **Action Buttons**
   - Reset Changes
   - Save Configuration

8. **Info Card**
   - How daily scraping works
   - Key features explanation

## 🔐 Security Notes

- The frontend proxies API requests through Next.js
- No credentials are stored in frontend
- All sensitive operations happen in backend
- Task cancellation requires valid task ID

## 🚦 Status Indicators

- ⏱️ **Yellow Timer**: Task is pending
- 🔄 **Blue Spinner**: Task is running
- ✅ **Green Check**: Task completed successfully
- ❌ **Red X**: Task failed
- ⚪ **Gray Circle**: Unknown state

## 📞 Getting Help

1. **Check Frontend Console**: Press F12 in browser
2. **Check Backend Logs**: `docker-compose logs -f api worker`
3. **Test API Directly**: Visit `http://localhost:8000/docs`
4. **Review Documentation**: All MD files in project root

## 🎉 Success Checklist

After setup, you should be able to:

- [ ] Access Daily Scraping page at http://localhost:3000/daily-scraping
- [ ] See your active competitors listed
- [ ] Toggle Enable Daily Scraping switch
- [ ] Set schedule time
- [ ] Select target countries (try "Select All" button)
- [ ] Select specific competitors or leave empty for all
- [ ] Configure scraping parameters
- [ ] Click "Start Manual Scraping" button
- [ ] See task status update in real-time
- [ ] View results when task completes
- [ ] Save configuration successfully

If all items are checked ✅, you're ready to go! 🚀

---

**Enjoy your automated daily ads scraping! 🎯📊**