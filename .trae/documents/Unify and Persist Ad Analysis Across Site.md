## What’s Breaking
- Analysis run from the Download Ads page isn’t reliably linked to a canonical `Ad` record, so after refresh the UI can’t find the analysis.
- `AdAnalysis` exists per ad/version, but some flows analyze only a video URL without resolving the `ad_id`, leaving history disconnected.
- Frontend lists rely on `GET /api/v1/ads` and `GET /download-history`; they don’t consistently show an “analyzed” state because linking and summary fields are missing or not returned.

## Backend Changes
1. Link every analysis to an `Ad`:
- In `backend/app/tasks/ai_analysis_tasks.py`, update `analyze_ad_video_task(...)` to resolve or create an `Ad` by `ad_archive_id` or library metadata, then set `AdAnalysis.ad_id` and `used_video_url`. Mark prior versions `is_current=0`, set new `is_current=1`, and increment `version_number`.
- When analysis is triggered from library endpoints, also upsert `DownloadHistory.ad_id` (see `backend/app/models/download_history.py`) so history rows stay linked.

2. Ensure list endpoints surface analysis:
- In `backend/app/routers/ads.py`, make `GET /api/v1/ads` include the current analysis summary for each ad (from `Ad.analysis` where `is_current=1`). Keep/implement `has_analysis` filter.
- In `GET /download-history`, include `has_analysis` boolean when `ad_id` is set and a current `AdAnalysis` exists.

3. Stabilize analyze entry points:
- Confirm/implement `POST /ads/{ad_id}/analyze` to enqueue `ai_analysis_task(ad_id)`; return `task_id`.
- Confirm `GET /ads/analysis/tasks/{task_id}/status` and ensure it reflects `is_current` promotion once complete.

4. DTOs & transformers:
- In `backend/app/models/dto/ad_dto.py`, include `is_analyzed` (derived from presence of current analysis) and a compact `analysis_summary` for list views.
- Keep full `raw_ai_response`/extended fields for detail views, versions via `GET /ads/{ad_id}/analysis/history`.

## Frontend Changes
1. Ads page analyze action:
- Add an "Analyze" button per ad. Call `POST /ads/{ad_id}/analyze`, poll task status, then refresh the specific ad item via `GET /api/v1/ads` or `GET /api/v1/ads/{id}` to show `is_analyzed` and `analysis_summary`.

2. Download Ads page linking:
- After `POST /ads/library/analyze-video`, update the table row with the returned `ad_id`. Persist the link by saving `DownloadHistory.ad_id` (backend change above) and display an "Analyzed" badge when `has_analysis` is true.

3. Types & UI state:
- Update `frontend/src/lib/transformers.ts` to include `isAnalyzed` and `analysisSummary` in `Ad` and `DownloadHistory` UI types.
- Ensure filters like `has_analysis` work in list pages.

## Data Flow After Fix
- Library analyze → resolve/create `Ad` → create `AdAnalysis`(is_current=1) → update `DownloadHistory.ad_id` → all lists (`/ads`, `/download-history`) show analyzed state consistently.
- Ads page analyze → enqueue task → on complete, `AdAnalysis` promoted as current → refresh item shows analyzed.

## Verification
- Run analysis from both Ads and Download Ads pages; confirm `AdAnalysis` created with `ad_id`, `is_current=1`.
- Refresh pages; verify `is_analyzed` and `analysis_summary` appear in Ads and Download History.
- Check analysis history via `GET /ads/{ad_id}/analysis/history` shows versions correctly.

## Notes on Files
- Core: `backend/app/tasks/ai_analysis_tasks.py`, `backend/app/routers/ads.py`, `backend/app/models/ad_analysis.py`, `backend/app/models/ad.py`, `backend/app/models/download_history.py`, `backend/app/models/dto/ad_dto.py`.
- Frontend: `frontend/src/lib/api.ts`, `frontend/src/app/ads/page.tsx`, `frontend/src/app/download-ads/page.tsx`, `frontend/src/lib/transformers.ts`.
