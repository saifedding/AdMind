# Architecture Overview

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USER BROWSER                         │
│                    https://your-app.vercel.app               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTPS Requests
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Next.js 14 App                                        │ │
│  │  - Video Replicator UI                                 │ │
│  │  - Script-to-Video UI                                  │ │
│  │  - Settings Page                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  Environment Variables:                                       │
│  - NEXT_PUBLIC_API_URL                                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ API Calls
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  RENDER (Backend)                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  FastAPI Server                                        │ │
│  │  - Video Analysis API                                  │ │
│  │  - Prompt Generation API                               │ │
│  │  - Translation API                                     │ │
│  │  - Storyboard Generation API                           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  Dependencies:                                                │
│  - yt-dlp (video downloading)                                │
│  - google-generativeai (Gemini API)                          │
│                                                               │
│  Environment Variables:                                       │
│  - GOOGLE_API_KEY                                            │
│  - FRONTEND_URL (for CORS)                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ API Calls
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   GOOGLE GEMINI API                          │
│  - Video Analysis (Gemini 2.5 Flash)                        │
│  - Prompt Generation                                         │
│  - Translation                                               │
│  - Storyboard Generation                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Request Flow

### 1. Video Analysis Flow

```
User enters video URL
    ↓
Frontend sends POST to /api/v1/analyze-video-url
    ↓
Backend downloads video with yt-dlp
    ↓
Backend uploads video to Gemini API
    ↓
Gemini analyzes video (scenes, transcript, style)
    ↓
Backend returns analysis to frontend
    ↓
User sees scenes and can edit dialogues
```

### 2. Prompt Generation Flow

```
User clicks "Generate All Prompts"
    ↓
Frontend sends POST to /api/v1/generate-all-prompts
    ↓
Backend processes each scene with Gemini
    ↓
Gemini generates VEO-compatible prompts
    ↓
Backend returns all prompts to frontend
    ↓
User can copy prompts for VEO
```

### 3. Script-to-Video Flow

```
User enters script
    ↓
Frontend sends POST to /api/v1/generate-storyboards
    ↓
Backend sends script to Gemini
    ↓
Gemini generates 3 creative concepts
    ↓
User selects and edits concepts
    ↓
Frontend sends POST to /api/v1/generate-prompts-from-storyboard
    ↓
Backend generates final VEO prompts
    ↓
User copies prompts for VEO
```

---

## Technology Stack

### Frontend (Vercel)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React Hooks + Local Storage
- **Deployment**: Vercel (Free Tier)

### Backend (Render)
- **Framework**: FastAPI
- **Language**: Python 3.11
- **AI**: Google Generative AI (Gemini)
- **Video Processing**: yt-dlp
- **Deployment**: Render (Free Tier)

### External Services
- **AI Provider**: Google Gemini API
- **Video Sources**: YouTube, Instagram, TikTok, Direct URLs

---

## Data Flow

### Local Storage (Frontend)
```
- Video analysis sessions
- Script-to-video sessions
- User settings (API preferences)
- Generated prompts history
```

### No Database Required
- All data stored in browser localStorage
- Sessions persist across page refreshes
- No backend database needed
- Privacy-friendly (data never leaves user's browser)

---

## Security

### API Keys
- ✅ `GOOGLE_API_KEY` stored securely in Render environment
- ✅ Never exposed to frontend
- ✅ Not committed to Git

### CORS
- ✅ Backend only accepts requests from Vercel frontend
- ✅ Configurable via `FRONTEND_URL` environment variable

### HTTPS
- ✅ Both Vercel and Render provide automatic HTTPS
- ✅ All communication encrypted

---

## Scalability

### Current Limits (Free Tier)
- **Render**: 750 hours/month, spins down after 15 min
- **Vercel**: Unlimited requests, 100 deployments/day
- **Gemini API**: Rate limits apply (check Google Cloud)

### Upgrade Path
- **Render**: $7/month for always-on instance
- **Vercel**: $20/month for Pro (faster builds, analytics)
- **Gemini API**: Pay-as-you-go pricing

---

## Monitoring

### Render Dashboard
- View backend logs
- Monitor CPU/memory usage
- Check deployment status

### Vercel Dashboard
- View frontend logs
- Monitor build times
- Check deployment status

### Optional: UptimeRobot
- Keep backend awake (ping /health every 5 min)
- Get alerts if backend goes down
- Free tier: 50 monitors

---

## Cost Breakdown

| Service | Free Tier | Monthly Cost |
|---------|-----------|--------------|
| Vercel | Unlimited | $0 |
| Render | 750 hrs | $0 |
| Gemini API | Pay-per-use | ~$0-5 (light usage) |
| **Total** | | **~$0-5/month** |

Perfect for personal projects and demos! 🎉
