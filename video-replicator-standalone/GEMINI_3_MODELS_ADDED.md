# Gemini 3.0 Models Added

## Summary
Added Gemini 3.0 Flash and Pro models to the video-replicator-standalone project.

## Changes Made

### 1. VideoReplicator Component
**File:** `frontend/src/components/VideoReplicator.tsx`

- Added `gemini-3.0-flash` option (Fastest)
- Added `gemini-3.0-pro` option (Best)
- Changed default model from `gemini-2.5-flash` to `gemini-3.0-flash`
- Kept existing models: 2.5 Flash, 2.5 Pro, 2.0 Flash

### 2. ScriptToVideo Component
**File:** `frontend/src/components/ScriptToVideo.tsx`

- Added `gemini-3.0-flash` option (Fastest)
- Added `gemini-3.0-pro` option (Best)
- Changed default model from `gemini-2.5-flash` to `gemini-3.0-flash`
- Kept existing models: 2.5 Flash, 2.5 Pro, 2.0 Flash

## Model Options (in order)
1. **Gemini 3.0 Flash** - Fastest (NEW, DEFAULT)
2. **Gemini 3.0 Pro** - Best quality (NEW)
3. **Gemini 2.5 Flash** - Fast
4. **Gemini 2.5 Pro** - Better quality
5. **Gemini 2.0 Flash** - Legacy

## Benefits
- Users can now access the latest Gemini 3.0 models
- Gemini 3.0 Flash provides faster response times
- Gemini 3.0 Pro offers improved quality for complex analysis
- Default model upgraded to latest version for best experience

## Backend Compatibility
The backend `google_ai_service.py` already supports these model names through the Gemini API, so no backend changes are required.
