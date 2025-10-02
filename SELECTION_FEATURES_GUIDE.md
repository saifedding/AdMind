# Competitor and Country Selection - Feature Guide

## 🎯 New Features Overview

The Daily Scraping interface now includes advanced selection capabilities for both competitors and countries, giving you granular control over what gets scraped.

## 🌍 Country Selection

### Features
- ✅ Multi-select checkboxes for 9 countries
- ✅ **"Select All" button** - Instantly select all countries
- ✅ **"Clear" button** - Deselect all countries
- ✅ Counter showing selected countries (e.g., "5 of 9 countries selected")
- ✅ Visual warning if no countries selected

### Available Countries
1. 🇦🇪 UAE
2. 🇺🇸 United States
3. 🇬🇧 United Kingdom
4. 🇸🇦 Saudi Arabia
5. 🇪🇬 Egypt
6. 🇩🇪 Germany
7. 🇫🇷 France
8. 🇨🇦 Canada
9. 🇦🇺 Australia

### How to Use

#### Select All Countries
```
1. Click "Select All" button in Countries section
2. All 9 countries will be checked instantly
```

#### Select Specific Countries
```
1. Check/uncheck individual country checkboxes
2. Countries are added/removed from selection
```

#### Clear Selection
```
1. Click "Clear" button
2. All countries will be unchecked
3. Warning will appear (need at least 1 country)
```

### Use Cases

**Global Scraping**:
```
✓ Select All Countries
Use when: You want comprehensive global coverage
```

**Regional Focus**:
```
✓ AE, SA, EG (Middle East)
✓ US, CA (North America)
✓ UK, DE, FR (Europe)
Use when: Targeting specific regions
```

**Testing**:
```
✓ Single country (e.g., AE only)
Use when: Testing or quick checks
```

## 👥 Competitor Selection

### Features
- ✅ Individual competitor checkboxes
- ✅ **"Select All" button** - Select all competitors
- ✅ **"Clear Selection" button** - Deselect all
- ✅ Visual highlighting for selected competitors
- ✅ Shows latest ad date for each competitor
- ✅ Scrollable list for many competitors
- ✅ **Smart default**: Empty selection = scrape ALL competitors

### Selection Modes

#### Mode 1: Scrape All Competitors (Default)
```
Selection: [] (empty - no checkboxes selected)
Result: All active competitors will be scraped
Indicator: "All X competitors will be scraped"
Best for: Daily automatic scraping
```

#### Mode 2: Scrape Specific Competitors
```
Selection: [✓] Selected competitors only
Result: Only checked competitors will be scraped
Indicator: "X of Y competitors selected"
Best for: Targeted scraping, testing specific pages
```

### How to Use

#### Select All Competitors
```
1. Click "Select All" button in Competitor Selection
2. All competitors will be checked
3. Counter shows: "X of Y competitors selected"
```

#### Select Specific Competitors
```
1. Check individual competitor checkboxes
2. Selected competitors highlighted in blue
3. Unselected remain in default gray
```

#### Clear Selection (Scrape All)
```
1. Click "Clear Selection" button
2. All checkboxes unchecked
3. Info message: "All X competitors will be scraped"
```

### Visual Indicators

**Selected Competitor**:
```
┌─────────────────────────────────────┐
│ ✓ Nike                              │
│   Page ID: 15087023549              │
│   Border: Blue                      │
│   Background: Light blue tint       │
└─────────────────────────────────────┘
```

**Unselected Competitor**:
```
┌─────────────────────────────────────┐
│ □ Adidas                            │
│   Page ID: 26735774584              │
│   Border: Gray                      │
│   Background: Default               │
└─────────────────────────────────────┘
```

## 🔄 How Selection Affects Scraping

### API Endpoint Selection

The interface **automatically chooses** the right API endpoint based on your competitor selection:

#### Empty Selection (Default)
```javascript
Endpoint: POST /api/v1/scraping/daily/start
Behavior: Scrapes all active competitors
Use Case: Daily automated scraping
```

#### Specific Competitors
```javascript
Endpoint: POST /api/v1/scraping/competitors/scrape
Payload: { competitor_ids: [1, 3, 5] }
Behavior: Scrapes only selected competitors
Use Case: Targeted scraping
```

### Scraping Logic

```
┌─────────────────────────────────────────────────┐
│  Start Manual Scraping Button Clicked          │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │ Check Selection    │
         └─────────┬──────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌──────────────┐    ┌──────────────────┐
│ No Selection │    │ Has Selection    │
│ (Empty)      │    │ (1+ competitors) │
└──────┬───────┘    └────────┬─────────┘
       │                     │
       ▼                     ▼
┌──────────────┐    ┌──────────────────┐
│ Daily Start  │    │ Specific Comp    │
│ All Comps    │    │ Selected Only    │
└──────────────┘    └──────────────────┘
```

## 💡 Common Workflows

### 1. Daily Automated Scraping
```
Countries: ✓ Select All (or your core markets)
Competitors: □ Leave empty (scrape all)
Schedule: Enabled at 02:00
Result: All competitors scraped daily from all countries
```

### 2. Test Specific Competitor
```
Countries: ✓ AE only
Competitors: ✓ Select one competitor
Max Pages: 1
Result: Quick test of single competitor
```

### 3. Regional Campaign Analysis
```
Countries: ✓ AE, SA, EG (Middle East)
Competitors: ✓ Select regional competitors
Max Pages: 5
Result: Comprehensive regional scraping
```

### 4. High-Priority Competitors
```
Countries: ✓ Select All
Competitors: ✓ Select top 5 competitors
Hours Lookback: 12
Result: Frequent updates for key competitors
```

### 5. New Competitor Onboarding
```
Countries: ✓ Select All
Competitors: ✓ Select newly added competitor only
Max Pages: 10
Hours Lookback: 168 (1 week)
Result: Historical data collection for new competitor
```

## 🎮 Keyboard Shortcuts

While the interface doesn't have built-in keyboard shortcuts, you can:

1. **Tab through checkboxes**: Navigate with keyboard
2. **Space to toggle**: Press space to check/uncheck
3. **Click labels**: Click anywhere on competitor/country label

## 📊 Selection Statistics

The interface shows real-time statistics:

### Countries
```
"5 of 9 countries selected"
```

### Competitors (No Selection)
```
ℹ️ "All 12 competitors will be scraped"
```

### Competitors (With Selection)
```
"3 of 12 competitors selected"
```

## ⚠️ Important Notes

### Country Selection
- ⚠️ **At least 1 country required** - Cannot scrape with no countries
- ℹ️ More countries = longer scraping time
- ℹ️ Facebook may have different ads per country

### Competitor Selection
- ✅ **Empty = All competitors** (this is intentional and useful!)
- ℹ️ Selected competitors must be active
- ℹ️ Individual competitor scraping uses slightly different API

### Performance Considerations
- **All Countries + All Competitors**: Longest scraping time
- **Few Countries + Selected Competitors**: Fastest scraping
- **Recommended**: Start with 2-3 countries and test

## 🔧 Troubleshooting

### "No countries selected" warning
**Fix**: Click "Select All" or check at least one country

### Selected competitor not scraped
**Check**: 
1. Competitor is marked as Active
2. Competitor has valid Page ID
3. Check task status for errors

### Scraping takes too long
**Solution**:
1. Reduce number of countries
2. Select specific competitors only
3. Reduce max_pages_per_competitor
4. Increase delay_between_requests

## 🎯 Best Practices

1. **Start Simple**: 
   - Use 1-3 countries
   - Test with 1-2 competitors first

2. **Expand Gradually**:
   - Add more countries after successful tests
   - Enable all competitors when confident

3. **Regular Review**:
   - Check which competitors are most valuable
   - Adjust country selection based on ad relevance

4. **Save Bandwidth**:
   - Use specific competitor selection for quick checks
   - Use "all competitors" for comprehensive daily runs

5. **Monitor Results**:
   - Check task results after each scraping
   - Adjust parameters based on success rate

---

**Pro Tip**: The "Select All" buttons are your friends! They're perfect for quick testing and comprehensive scraping setups. 🚀