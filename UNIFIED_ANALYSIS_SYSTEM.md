# Unified Analysis System

## Overview

The Unified Analysis System provides a consistent ad analysis experience across the entire application. It centralizes analysis functionality, ensures data consistency, and handles duplicate ads with shared analysis.

## Features

### 🎯 **Unified Analysis Across All Pages**
- **Download Ads**: Analyze ads from Facebook Ad Library URLs
- **Ad Library**: Analyze scraped ads from competitors
- **Ad Sets**: Analyze entire ad sets using the best performing ad as representative
- **Individual Ads**: Deep analysis with custom instructions

### 🔄 **Smart Duplicate Handling**
- Ads in the same ad set automatically share analysis results
- Prevents redundant analysis of identical creatives
- Maintains consistency across ad variants

### 💾 **Persistent Storage**
- All analysis results are saved to the database with versioning
- Analysis history tracking with version numbers
- Automatic caching for performance

### 🎨 **Rich UI Components**
- **UnifiedAnalysisPanel**: Full-featured analysis interface with tabs
- **AnalysisStatusBadge**: Compact status indicator for ad lists
- Consistent design across all pages

## Architecture

### Backend Components

#### `UnifiedAnalysisService`
- **Location**: `backend/app/services/unified_analysis_service.py`
- **Purpose**: Core service handling all analysis operations
- **Features**:
  - Single ad analysis
  - Ad set analysis (analyzes best performing ad)
  - Analysis history management
  - Duplicate handling for ad sets

#### API Endpoints
- **Location**: `backend/app/routers/ads.py`
- **Endpoints**:
  - `POST /ads/{ad_id}/unified-analyze` - Analyze single ad
  - `POST /ad-sets/{ad_set_id}/unified-analyze` - Analyze ad set
  - `GET /ads/{ad_id}/unified-analysis` - Get analysis
  - `GET /ads/{ad_id}/analysis-history` - Get analysis history
  - `POST /ads/{ad_id}/regenerate-analysis` - Regenerate with custom instruction
  - `DELETE /ads/{ad_id}/unified-analysis` - Delete analysis
  - `GET /ads/analysis-status` - Check analysis status for multiple ads

### Frontend Components

#### `UnifiedAnalysisPanel`
- **Location**: `frontend/src/components/unified-analysis/UnifiedAnalysisPanel.tsx`
- **Features**:
  - Tabbed interface (Analysis, Transcript, Prompts, Insights)
  - Custom instruction support
  - Analysis history
  - Regeneration capabilities
  - Score visualization

#### `AnalysisStatusBadge`
- **Location**: `frontend/src/components/unified-analysis/AnalysisStatusBadge.tsx`
- **Features**:
  - Compact status indicator
  - One-click analysis trigger
  - Loading states
  - Multiple sizes (sm, md, lg)

### Database Schema

#### `AdAnalysis` Model
```sql
CREATE TABLE ad_analyses (
    id SERIAL PRIMARY KEY,
    ad_id BIGINT REFERENCES ads(id),
    is_current INTEGER DEFAULT 1,  -- 1 = current, 0 = archived
    version_number INTEGER DEFAULT 1,
    used_video_url VARCHAR,
    summary TEXT,
    hook_score FLOAT,
    overall_score FLOAT,
    target_audience VARCHAR,
    content_themes JSON,
    raw_ai_response JSON,  -- Complete AI response
    analysis_version VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Usage Examples

### 1. Analyze Single Ad
```typescript
import { adsApi } from '@/lib/api';

const result = await adsApi.unifiedAnalyzeAd(adId, {
  custom_instruction: "Focus on emotional appeal",
  generate_prompts: true,
  force_reanalyze: false
});
```

### 2. Analyze Ad Set
```typescript
const result = await adsApi.unifiedAnalyzeAdSet(adSetId, {
  generate_prompts: true
});
// Automatically applies analysis to all ads in the set
```

### 3. Using Components
```tsx
// Full analysis panel
<UnifiedAnalysisPanel 
  adId={adId}
  adSetId={adSetId}
  showAdSetAnalysis={true}
  onAnalysisComplete={(result) => console.log(result)}
/>

// Status badge in ad lists
<AnalysisStatusBadge
  adId={adId}
  hasAnalysis={!!ad.analysis}
  showAnalyzeButton={true}
  size="sm"
/>
```

## Integration Points

### 1. Download Ads Page
- **File**: `frontend/src/app/download-ads-new/page.tsx`
- **Integration**: Replaces custom analysis UI with `UnifiedAnalysisPanel`
- **Benefit**: Consistent analysis experience for downloaded ads

### 2. Main Ads Page
- **File**: `frontend/src/app/ads/page.tsx`
- **Integration**: `AnalysisStatusBadge` in `AdCard` component
- **Benefit**: Quick analysis status and one-click analysis

### 3. Ad Detail Page
- **File**: `frontend/src/app/ads/[id]/page.tsx`
- **Integration**: Full `UnifiedAnalysisPanel` for detailed analysis
- **Benefit**: Complete analysis interface with history and regeneration

### 4. Ad Sets
- **Integration**: Ad set analysis analyzes the best performing ad and applies results to all variants
- **Benefit**: Consistent analysis across ad variants without redundant processing

## Benefits

### 🚀 **Performance**
- Eliminates duplicate analysis of identical ads
- Caches results for instant loading
- Efficient database queries with proper indexing

### 🎯 **Consistency**
- Same analysis interface across all pages
- Unified data format and storage
- Consistent scoring and metrics

### 🔧 **Maintainability**
- Single source of truth for analysis logic
- Centralized error handling
- Easy to add new analysis features

### 👥 **User Experience**
- Familiar interface regardless of entry point
- Clear analysis status indicators
- Seamless workflow from discovery to analysis

## Future Enhancements

1. **Batch Analysis**: Analyze multiple ads simultaneously
2. **Analysis Templates**: Pre-defined analysis instructions for different use cases
3. **Comparative Analysis**: Compare analysis results across ads
4. **Export Features**: Export analysis results to various formats
5. **Analysis Scheduling**: Automatic re-analysis of ads over time

## Configuration

### Environment Variables
```bash
# Backend
REDIS_URL=redis://redis:6379  # For caching
DATABASE_URL=postgresql://...  # For persistent storage

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000  # Backend API URL
```

### Dependencies
- **Backend**: SQLAlchemy, Redis, Google AI Service
- **Frontend**: React, TypeScript, Tailwind CSS, Lucide Icons

## Troubleshooting

### Common Issues

1. **Analysis Not Saving**
   - Check database connection
   - Verify `AdAnalysis` table exists
   - Check for foreign key constraints

2. **Status Badge Not Updating**
   - Ensure `ad.id` is provided
   - Check API endpoint connectivity
   - Verify analysis status endpoint

3. **Duplicate Analysis**
   - Check ad set grouping logic
   - Verify `content_signature` generation
   - Review duplicate detection in `UnifiedAnalysisService`

### Debug Mode
Enable debug logging in the backend:
```python
import logging
logging.getLogger('app.services.unified_analysis_service').setLevel(logging.DEBUG)
```

## Migration Guide

### From Legacy Analysis System

1. **Database Migration**:
   ```sql
   -- Migrate existing analysis data
   INSERT INTO ad_analyses (ad_id, raw_ai_response, is_current, version_number)
   SELECT id, analysis_data, 1, 1 FROM ads WHERE analysis_data IS NOT NULL;
   ```

2. **Frontend Updates**:
   - Replace custom analysis components with `UnifiedAnalysisPanel`
   - Add `AnalysisStatusBadge` to ad lists
   - Update API calls to use unified endpoints

3. **Backend Updates**:
   - Import `UnifiedAnalysisService` in existing routes
   - Replace direct AI service calls with unified service
   - Update response formats to match unified schema

This unified system provides a robust, scalable foundation for ad analysis across the entire application while maintaining consistency and performance.