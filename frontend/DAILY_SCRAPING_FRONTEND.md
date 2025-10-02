# Daily Scraping Frontend - User Guide

## 🎯 Overview

The Daily Scraping Control panel provides a comprehensive interface to configure and manage automated daily ads scraping from your saved Facebook pages.

## 📍 Accessing the Feature

1. Start the application:
   ```bash
   docker-compose up --build
   ```

2. Open your browser to `http://localhost:3000`

3. Navigate to **Daily Scraping** from the sidebar menu (Clock icon)

## 🎨 Features

### 1. **Schedule Configuration**
- **Enable/Disable Daily Scraping**: Toggle automatic daily scraping on/off
- **Schedule Time**: Set the exact time (24-hour format) when scraping should run daily
- **Hours Lookback**: Configure how many hours back to look for new ads (default: 24 hours)

### 2. **Scraping Parameters**
- **Max Pages per Competitor**: Control how many pages of ads to scrape (1-10)
- **Request Delay**: Set delay between requests in seconds to avoid rate limiting (1-10 seconds)
- **Ad Status Filter**: Choose to scrape Active Only, Inactive Only, or All Ads

### 3. **Target Countries**
Select from multiple countries:
- UAE 🇦🇪
- United States 🇺🇸
- United Kingdom 🇬🇧
- Saudi Arabia 🇸🇦
- Egypt 🇪🇬
- Germany 🇩🇪
- France 🇫🇷
- Canada 🇨🇦
- Australia 🇦🇺

### 4. **Active Competitors Overview**
- View all active competitors that will be included in scraping
- See the latest ad date for each competitor
- Quick overview of total active competitors

### 5. **Manual Scraping**
- **Start Manual Scraping**: Trigger scraping immediately with current settings
- **Real-time Task Status**: Monitor running tasks with live updates
- **Cancel Task**: Stop a running scraping task
- **Task Results**: View detailed results including:
  - Competitors processed
  - New ads found
  - Errors (if any)

## 🚀 Quick Start Guide

### Step 1: Add Competitors
Before using daily scraping, make sure you have active competitors:
1. Go to the **Competitors** page
2. Add Facebook pages you want to monitor
3. Ensure they are marked as **Active**

### Step 2: Configure Settings
1. Navigate to **Daily Scraping** page
2. Enable daily scraping with the toggle switch
3. Set your preferred schedule time (e.g., 02:00 for 2 AM)
4. Configure scraping parameters:
   - Max Pages: 3 (recommended)
   - Delay: 2 seconds (recommended)
   - Hours Lookback: 24 hours
5. Select target countries
6. Click **Save Configuration**

### Step 3: Test with Manual Scraping
Before relying on automatic scheduling:
1. Click **Start Manual Scraping**
2. Monitor the task status in real-time
3. Verify results when complete

### Step 4: Monitor Results
- Check the task status section for progress
- View detailed results when scraping completes
- Check for any errors and address them

## 📊 Understanding the Interface

### Configuration Cards

#### Schedule Configuration Card
- **Purpose**: Control when and how often scraping runs
- **Key Settings**:
  - Enable/Disable toggle
  - Time picker (24-hour format)
  - Hours lookback slider

#### Scraping Parameters Card
- **Purpose**: Fine-tune scraping behavior
- **Key Settings**:
  - Max pages slider
  - Request delay input
  - Status filter dropdown

### Task Status Display

When a scraping task is running, you'll see:
- ⏱️ **Timer Icon**: Task is pending
- 🔄 **Spinning Icon**: Task is running
- ✅ **Check Icon**: Task completed successfully
- ❌ **X Icon**: Task failed

Task results show:
- Number of competitors processed
- Total new ads found
- Any errors encountered

### Competitors Overview

Shows a list of active competitors with:
- Competitor name
- Facebook Page ID
- Latest ad date
- Up to 5 competitors displayed (with count for remaining)

## ⚙️ Configuration Best Practices

### Recommended Settings for Daily Use
```
Schedule Time: 02:00 (2 AM)
Countries: AE, US, UK (or your target markets)
Max Pages: 3
Request Delay: 2 seconds
Hours Lookback: 24
Active Status: Active Only
```

### For Testing
```
Max Pages: 1
Request Delay: 1 second
Hours Lookback: 48
Active Status: All
```

### For Comprehensive Scraping
```
Max Pages: 5
Request Delay: 3 seconds
Hours Lookback: 24
Active Status: Active Only
```

## 🔍 Troubleshooting

### "No Active Competitors Found"
**Solution**: 
1. Go to the Competitors page
2. Add competitors or activate existing ones
3. Return to Daily Scraping page
4. Click Refresh button

### Task Stuck in Pending
**Solution**:
1. Check if Celery worker is running: `docker-compose logs -f worker`
2. Restart worker if needed: `docker-compose restart worker beat`
3. Cancel the stuck task and try again

### Configuration Not Saving
**Solution**:
1. Check browser console for errors (F12)
2. Verify backend is running: `http://localhost:8000/docs`
3. Check Docker logs: `docker-compose logs -f api`

### No New Ads Found
**Possible Reasons**:
- Competitors haven't published new ads
- Hours lookback setting is too short
- Ads already exist in database (duplicate detection working correctly)

**What to Check**:
1. Visit Facebook Ads Library manually to verify ads exist
2. Check the latest ad date for each competitor
3. Adjust hours lookback if needed

## 🎯 Usage Tips

### Daily Workflow
1. **Morning Check**: View Daily Scraping page to see overnight results
2. **Review New Ads**: Go to Ads page to browse newly scraped content
3. **Adjust Settings**: Fine-tune based on results (more/fewer pages, different countries)

### Weekly Maintenance
1. **Review Competitors**: Ensure list is up-to-date
2. **Check Schedule**: Verify timing works for your workflow
3. **Adjust Parameters**: Based on success rate and data quality

### Monthly Review
1. **Analyze Patterns**: Look at scraping success rates
2. **Update Countries**: Add/remove based on relevance
3. **Optimize Settings**: Adjust max pages and delays based on performance

## 🔗 Related Pages

- **Competitors**: Manage your saved Facebook pages
- **Ads**: Browse and search scraped ads
- **Tasks**: View all background task history
- **Settings**: Additional system configuration

## 📱 Mobile Support

The Daily Scraping interface is fully responsive:
- All features accessible on mobile devices
- Touch-friendly controls
- Optimized layouts for small screens

## 🆘 Getting Help

If you encounter issues:
1. Check the browser console (F12) for error messages
2. Review backend logs: `docker-compose logs -f api worker`
3. Test API directly: `http://localhost:8000/docs`
4. Refer to `DAILY_SCRAPING_GUIDE.md` for backend details

## 🎨 UI Components Used

The page uses the following design system components:
- **Cards**: For organizing sections
- **Buttons**: Primary actions and controls
- **Inputs**: Time, number, and text inputs
- **Switches**: Toggle controls
- **Select**: Dropdown menus
- **Checkboxes**: Country selection
- **Labels**: Form field labels

All components follow the AdMind design system with:
- Dark-first approach
- Iridium & Photon color palette
- Consistent spacing and typography
- Accessible controls

---

**Happy Scraping! 🎯📊**