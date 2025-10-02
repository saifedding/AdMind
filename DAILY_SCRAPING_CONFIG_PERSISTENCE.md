# Daily Scraping Configuration Persistence

## Date: October 2, 2025

## Overview
Added persistent configuration storage for the Daily Scraping page using localStorage, allowing users to save their preferred settings and have them automatically restored on page reload.

## Features Implemented

### 1. ✅ Auto-Load Configuration on Page Load
- Configuration is automatically loaded from localStorage when the page loads
- User's last saved settings are restored instantly
- Falls back to default values if no saved configuration exists

### 2. ✅ Save Configuration Button
- Enhanced save button with loading state
- Saves all configuration to localStorage
- Visual feedback with success message
- Disabled when countries are not selected

### 3. ✅ Reload Saved Configuration Button
- Manually reload the last saved configuration
- Useful if user makes temporary changes and wants to revert
- Refreshes from localStorage without page reload

### 4. ✅ Reset to Defaults Button
- Clears saved configuration
- Resets all settings to default values
- Confirmation dialog to prevent accidental resets
- Styled in red to indicate destructive action

## Configuration Stored

The following settings are persisted in localStorage:

```typescript
interface DailyScrapingConfig {
  enabled: boolean;                    // Enable/disable daily scraping
  schedule_time: string;               // HH:MM format
  countries: string[];                 // Selected countries or ['ALL']
  max_pages_per_competitor: number;    // Max pages to scrape
  delay_between_requests: number;      // Delay in seconds
  hours_lookback: number;              // Hours to look back for new ads
  active_status: string;               // 'active', 'inactive', or 'all'
  selected_competitors: number[];      // Array of competitor IDs (empty = all)
}
```

### Default Values
```typescript
{
  enabled: false,
  schedule_time: "02:00",
  countries: ["AE", "US", "GB"],
  max_pages_per_competitor: 10,
  delay_between_requests: 2,
  hours_lookback: 24,
  active_status: "all",
  selected_competitors: []
}
```

## Storage Keys

### localStorage Keys Used:
- `dailyScrapingConfig` - Main configuration storage
- `scrapingTasks` - Task history (existing, not changed)

## Functions Added

### 1. `loadSavedConfiguration()`
```typescript
const loadSavedConfiguration = () => {
  try {
    const savedConfig = localStorage.getItem('dailyScrapingConfig');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      setConfig(parsed);
      console.log('Loaded saved configuration:', parsed);
    }
  } catch (error) {
    console.error('Failed to load saved configuration:', error);
  }
};
```

**Called**:
- On component mount (useEffect)
- When "Reload Saved" button is clicked

### 2. `saveConfiguration()`
```typescript
const saveConfiguration = async () => {
  setIsSaving(true);
  try {
    // Save configuration to localStorage
    localStorage.setItem('dailyScrapingConfig', JSON.stringify(config));
    
    // Simulate a small delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Configuration saved:', config);
    alert("Configuration saved successfully! Your settings will be remembered.");
  } catch (error) {
    console.error('Error saving configuration:', error);
    alert(`Error saving configuration: ${error}`);
  } finally {
    setIsSaving(false);
  }
};
```

**Called**:
- When "Save Configuration" button is clicked

### 3. `resetToDefaults()`
```typescript
const resetToDefaults = () => {
  if (confirm('Are you sure you want to reset all settings to default values?')) {
    const defaultConfig: DailyScrapingConfig = { /* default values */ };
    
    setConfig(defaultConfig);
    localStorage.removeItem('dailyScrapingConfig');
    console.log('Configuration reset to defaults');
    alert('Configuration has been reset to default values.');
  }
};
```

**Called**:
- When "Reset to Defaults" button is clicked

## UI Components

### Configuration Action Buttons Layout

```
┌──────────────────────────────────────────────────────────┐
│  [Reset to Defaults]      [Reload Saved] [Save Config]   │
│       (Red)                  (Outline)    (Primary)       │
└──────────────────────────────────────────────────────────┘
```

### Button States

**Save Configuration**:
- Disabled when: `isSaving` or `config.countries.length === 0`
- Shows spinner when saving
- Text changes from "Save Configuration" to "Saving..."
- Primary photon-colored button

**Reload Saved**:
- Always enabled
- Reloads configuration from localStorage
- Outline style

**Reset to Defaults**:
- Always enabled
- Shows confirmation dialog
- Red-themed for destructive action
- Clears localStorage

## User Workflows

### Workflow 1: First Time User
1. User visits Daily Scraping page
2. Default configuration is loaded
3. User modifies settings (countries, competitors, etc.)
4. User clicks "Save Configuration"
5. ✅ Settings saved to localStorage
6. Next visit: Settings are automatically restored

### Workflow 2: Returning User
1. User visits Daily Scraping page
2. ✅ Saved configuration automatically loaded
3. User can:
   - Use saved settings as-is
   - Make changes and save again
   - Reload saved settings if changes aren't wanted
   - Reset to defaults if needed

### Workflow 3: Experimenting with Settings
1. User has saved configuration
2. User makes temporary changes to test
3. User clicks "Reload Saved" to revert changes
4. ✅ Returns to last saved state without page reload

### Workflow 4: Starting Fresh
1. User wants to start over
2. User clicks "Reset to Defaults"
3. Confirmation dialog appears
4. User confirms
5. ✅ All settings reset to defaults
6. ✅ Saved configuration cleared from localStorage

## Benefits

1. **Convenience**: No need to reconfigure settings every time
2. **Efficiency**: Quick access to preferred scraping parameters
3. **Flexibility**: Easy to experiment and revert changes
4. **Reliability**: Settings persist across browser sessions
5. **User Control**: Clear options to save, reload, or reset

## Error Handling

### Load Errors
- Catches JSON parse errors
- Falls back to default configuration
- Logs error to console

### Save Errors
- Shows error alert to user
- Logs error to console
- Returns to normal state (not stuck in saving)

### Reset Errors
- Requires confirmation before executing
- Safely removes localStorage key
- Always succeeds (no external dependencies)

## Testing

### Test Case 1: Save and Reload
1. Change configuration settings
2. Click "Save Configuration"
3. ✅ See success message
4. Refresh the page
5. ✅ Settings are restored

### Test Case 2: Reload Without Saving
1. Have saved configuration
2. Make changes (don't save)
3. Click "Reload Saved"
4. ✅ Changes are discarded
5. ✅ Last saved settings restored

### Test Case 3: Reset to Defaults
1. Have custom configuration saved
2. Click "Reset to Defaults"
3. ✅ Confirmation dialog appears
4. Confirm reset
5. ✅ All settings reset to defaults
6. ✅ Refresh page shows defaults (saved config cleared)

### Test Case 4: First Visit (No Saved Config)
1. Clear localStorage
2. Visit Daily Scraping page
3. ✅ Default configuration loaded
4. ✅ No errors in console

## Browser Compatibility

Works in all modern browsers that support:
- localStorage API
- JSON.stringify/parse
- React useState hooks

**Supported Browsers**:
- Chrome/Edge (all recent versions)
- Firefox (all recent versions)
- Safari (all recent versions)

## Future Enhancements (Optional)

1. **Export/Import Config**: Download/upload config as JSON file
2. **Multiple Profiles**: Save and switch between different configurations
3. **Backend Sync**: Optionally sync configuration to backend database
4. **Config History**: Keep history of recent configurations
5. **Auto-Save**: Save configuration automatically on change (with debounce)
6. **Share Config**: Generate shareable links for configurations

## Migration Notes

- Existing users will start with default configuration on first visit
- Previous manual settings won't be automatically migrated
- Users will need to configure once and save
- No data loss risk (localStorage is separate from database)

## Files Modified

### Frontend
- `frontend/src/app/daily-scraping/page.tsx`
  - Added `loadSavedConfiguration()` function
  - Modified `saveConfiguration()` to use localStorage
  - Added `resetToDefaults()` function
  - Updated UI with new buttons
  - Added useEffect to load config on mount
  - Updated info card with persistence note

## Impact

✅ **User Experience**: Dramatically improved with persistent settings
✅ **Productivity**: No need to reconfigure on every visit  
✅ **Flexibility**: Easy to experiment with different settings  
✅ **Control**: Full control over save, reload, and reset  
✅ **Reliability**: Settings survive browser restarts  

## Example localStorage Data

```json
{
  "dailyScrapingConfig": {
    "enabled": true,
    "schedule_time": "03:00",
    "countries": ["ALL"],
    "max_pages_per_competitor": 15,
    "delay_between_requests": 3,
    "hours_lookback": 48,
    "active_status": "all",
    "selected_competitors": [1, 3, 5]
  }
}
```

This configuration would be automatically loaded on next page visit!
