# Offline Save Functionality

## Overview
The **Save button** now downloads ad content (images, videos, text) to your computer for **offline viewing**. You can view the ads without an internet connection!

## How It Works

### When You Click Save:
1. ✅ **Downloads all images** from the ad
2. ✅ **Downloads all videos** from the ad  
3. ✅ **Creates an HTML file** with all ad content
4. ✅ **Packages everything** into a ZIP file
5. ✅ **Downloads to your computer** (check Downloads folder)
6. ✅ **Marks ad as saved** in the database

### What You Get:
A ZIP file named: `ad_[competitor]_[id]_[timestamp].zip`

**Inside the ZIP:**
```
ad_competitor_123_1234567890.zip/
├── index.html          # Open this to view offline
├── ad-data.json        # Raw JSON data
├── images/
│   ├── image_1.jpg
│   ├── image_2.jpg
│   └── ...
└── videos/
    ├── video_1.mp4
    ├── video_2.mp4
    └── ...
```

## Viewing Offline

1. **Extract the ZIP file** to any folder
2. **Open `index.html`** in any web browser
3. **View everything offline** - no internet needed!

The HTML file displays:
- ✅ Ad title and copy
- ✅ All images in a grid
- ✅ All videos (playable)
- ✅ AI analysis scores
- ✅ Competitor information
- ✅ Call-to-action
- ✅ Metadata (ad ID, archive ID, etc.)

## Features

### Beautiful Offline Viewer
- **Dark theme** - easy on the eyes
- **Responsive layout** - works on mobile and desktop
- **Video controls** - play, pause, seek
- **Image grid** - see all images at once
- **Organized sections** - easy to navigate

### CORS-Free Downloads
- Uses client-side fetch to download media
- No backend proxy needed
- Works directly from Facebook CDN URLs

### Progress Indication
- Button shows loading state while downloading
- Success message shows what was downloaded
- Error handling if download fails

## Button States

### Gray Button (Not Saved)
- Icon: Empty disk
- Tooltip: "Download ad for offline viewing (images, videos, HTML)"
- Click: Downloads and saves

### Green Button (Saved)
- Icon: Filled disk
- Tooltip: "Ad downloaded (click to download again)"
- Click: Downloads again (updates existing)

## Technical Details

### Download Process:
1. **Fetch media** - Downloads images and videos using fetch()
2. **Create ZIP** - Uses JSZip library to package files
3. **Generate HTML** - Creates styled HTML with embedded media
4. **Save locally** - Triggers browser download
5. **Update DB** - Marks ad as saved (is_favorite = true)

### File Sizes:
- Images: Original quality (typically 100KB - 2MB each)
- Videos: Original quality (typically 5MB - 50MB each)
- HTML: ~10KB
- Total ZIP: Varies (10MB - 200MB depending on content)

### Browser Compatibility:
- ✅ Chrome/Edge
- ✅ Firefox  
- ✅ Safari
- ✅ Opera
- ✅ Brave

### Libraries Used:
- `jszip` - For creating ZIP files
- Built-in `fetch()` - For downloading media
- Built-in `Blob` - For file handling

## Troubleshooting

### Download Fails
**Issue**: Ad download fails with error message
**Solutions**:
1. Check internet connection
2. Verify media URLs are accessible
3. Try again (temporary network issue)
4. Check browser console for specific errors

### Large File Size
**Issue**: ZIP file is very large
**Reason**: Videos can be 20-100MB each
**Solution**: This is normal - high-quality videos are large

### CORS Errors
**Issue**: "Failed to fetch" errors in console
**Reason**: Facebook CDN blocking cross-origin requests
**Solution**: Media URLs are typically CORS-friendly, but if blocked:
- The download will skip that file
- Other files will still download
- HTML will still be created

### No Videos Playing
**Issue**: Videos don't play in offline HTML
**Reason**: Browser doesn't support MP4 codec
**Solution**: 
- Try different browser
- Video files are still in /videos/ folder
- Can open them directly in VLC or similar

## Usage Examples

### Save Single Ad:
```
1. Browse to /ads page
2. Find an ad you like
3. Click the gray Save button
4. Wait for download (5-30 seconds)
5. Check Downloads folder
6. Extract ZIP and open index.html
```

### Save Multiple Ads:
```
1. Browse through ads
2. Click Save on each ad you want
3. Each downloads as separate ZIP
4. Organize in folders as needed
```

### Re-download Updated Content:
```
1. Click Refresh button to update media URLs
2. Click Save button again
3. New ZIP downloads with fresh content
```

## Privacy & Storage

### What's Stored Locally:
- ZIP files in your Downloads folder
- No tracking or analytics
- Completely offline after download

### What's Stored in Database:
- `is_favorite` flag (marks as "saved")
- Original ad data (always stored)
- No copy of downloaded files

### Disk Space:
- Each ad: 10MB - 200MB (depends on videos)
- 100 ads: ~1GB - 5GB
- Recommend keeping only important ads saved

## Future Enhancements

Potential improvements:
- [ ] Progress bar during download
- [ ] Download queue for multiple ads
- [ ] Selective download (images only, videos only)
- [ ] Cloud storage integration
- [ ] Share downloaded packages
- [ ] Export to PDF format

## Code Location

**Frontend**:
- Download utility: `frontend/src/lib/downloadUtils.ts`
- AdCard component: `frontend/src/features/dashboard/components/AdCard.tsx`
- Save handler: `handleSaveClick()` function

**Dependencies**:
- `jszip`: ^3.10.1
- No backend changes required

## Summary

✅ **Click Save** → Downloads complete ad package
✅ **Open HTML** → View offline without internet
✅ **Keep forever** → Saved on your computer
✅ **Share easily** → Send ZIP to colleagues
✅ **Professional** → Beautiful formatted viewer

Perfect for:
- 📁 Building swipe file collections
- 💼 Client presentations  
- 🎓 Educational purposes
- 🔍 Competitive research
- 📱 Mobile viewing (extract and view)
