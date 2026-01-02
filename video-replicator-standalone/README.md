# Video Replicator Studio - Standalone

Analyze videos and generate VEO prompts for recreation. Supports Instagram, TikTok, YouTube, and direct video URLs.

## Features

### 🎬 Video Replicator
- **Video Analysis**: Analyze any video URL to extract scenes, transcript, and style
- **Scene Detection**: Auto or manual scene splitting (max 8 seconds per scene for VEO)
- **Dialogue Editing**: Edit dialogue per scene
- **Translation**: Arabic ↔ English translation with diacritics support
- **Prompt Generation**: Generate detailed VEO prompts for each scene
- **Session Persistence**: Save and load sessions

### 📝 Script-to-Video (NEW!)
- **Script Input**: Paste your script and AI generates 3 creative concepts
- **Style Reference**: Optionally analyze a reference video to inspire the concepts
- **Storyboard Selection**: Choose one or more concepts to proceed with
- **Storyboard Editing**: Edit and customize AI-generated storyboards
- **Multi-Style Support**: Select multiple concepts and generate prompts for each
- **Translation**: Built-in Arabic ↔ English translation

## Prerequisites

- Python 3.10+
- Node.js 18+
- Google Gemini API Key
- yt-dlp (for video downloading)

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env
# Edit .env and add your GOOGLE_API_KEY

# Run the server
python main.py
```

Backend will run at: http://localhost:8001

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local (optional - defaults to localhost:8001)
echo "NEXT_PUBLIC_API_URL=http://localhost:8001" > .env.local

# Run development server
npm run dev
```

Frontend will run at: http://localhost:3000

## Environment Variables

### Backend (.env)
```
GOOGLE_API_KEY=your_gemini_api_key_here
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8001
```

## API Endpoints

### Video Replicator
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/analyze-video-url` | POST | Analyze video URL |
| `/api/v1/generate-scene-prompt` | POST | Generate prompt for single scene |
| `/api/v1/generate-all-prompts` | POST | Generate prompts for all scenes |
| `/api/v1/translate-script` | POST | Translate single text |
| `/api/v1/translate-all` | POST | Translate all dialogues |

### Script-to-Video
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/generate-storyboards` | POST | Generate creative storyboard concepts |
| `/api/v1/generate-replication-prompts` | POST | Generate prompts in replication mode |
| `/api/v1/generate-prompts-from-storyboard` | POST | Generate prompts from edited storyboard |

## Usage

### Video Replicator
1. Enter a video URL (Instagram, TikTok, YouTube, or direct link)
2. Click "Analyze" to extract scenes
3. Edit dialogue for each scene if needed
4. Click "Generate All Prompts" or generate individually
5. Copy prompts to use with VEO

### Script-to-Video
1. Enter your script in the text area
2. (Optional) Add a style reference video URL and analyze it
3. Click "Generate 3 Creative Concepts"
4. Select and edit your preferred concepts
5. Generate final VEO prompts
6. Copy prompts to use with VEO

## Tech Stack

- **Backend**: FastAPI, Google Generative AI (Gemini), yt-dlp
- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui

## Deployment

### Deploy to Production (FREE)

Deploy your app to Render + Vercel for **$0/month**:

**Quick Deploy** (10 minutes):
- 📖 Read: [`DEPLOY_NOW.md`](./DEPLOY_NOW.md) - Step-by-step commands
- ✅ Use: [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md) - Track progress

**Detailed Guides**:
- 📚 Full Guide: [`DEPLOYMENT.md`](./DEPLOYMENT.md) - Complete documentation
- 🏗️ Architecture: [`ARCHITECTURE.md`](./ARCHITECTURE.md) - System overview

**What you get**:
- ✅ Frontend on Vercel (global CDN, auto HTTPS)
- ✅ Backend on Render (Python, yt-dlp support)
- ✅ 100% free tier (perfect for personal use)
- ✅ Auto-deploy on git push

## License

MIT
