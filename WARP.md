# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands
once u udpate something in the backend make sure that its refelect by restart the docker if this indeed 
### Docker Operations
```bash
# Start entire application stack (preferred for development)
docker-compose up --build

# Start specific services only
docker-compose up api db redis

# View logs for specific services
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f worker

# Reset database and volumes
docker-compose down -v
docker-compose up --build

# Access PostgreSQL database directly
docker-compose exec db psql -U ads_user -d ads_db

# Stop all services
docker-compose down
```

### Backend Development
```bash
# Run tests (within backend container or directory)
pytest
pytest backend/test_ad_grouping.py
pytest backend/test_creative_comparison.py

# Database migrations using Alembic
cd backend
alembic upgrade head
alembic revision --autogenerate -m "description"

# Run backend independently (for development)
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Celery worker operations
celery -A app.celery_worker worker --loglevel=info
celery -A app.celery_worker beat --loglevel=info
celery -A app.celery inspect active
```

### Frontend Development
```bash
cd frontend

# Development server with Turbopack
npm run dev

# Build and start production
npm run build
npm start

# Linting
npm run lint
```

### Testing Individual Components
```bash
# Test ad grouping logic
python backend/test_ad_grouping.py

# Test creative comparison
python backend/test_creative_comparison.py

# Run enhanced video comparison tests
python test_enhanced_video_comparison.py
```

## Architecture Overview

### Monorepo Structure
- **Backend**: FastAPI application with PostgreSQL, Redis, and Celery
- **Frontend**: Next.js 15 with App Router, TypeScript, and Tailwind CSS
- **Infrastructure**: Docker Compose orchestrating 6 services

### Key Services Architecture

#### FastAPI Backend (`backend/app/`)
- **Entry Point**: `main.py` - FastAPI app with CORS, router inclusion, and lifespan management
- **Database**: SQLAlchemy ORM with Alembic migrations, PostgreSQL backend
- **Background Processing**: Celery with Redis broker for async tasks
- **Core Modules**:
  - `routers/` - API endpoints (health, ads, competitors)
  - `services/` - Business logic (ad extraction, AI analysis, Facebook scraping)
  - `models/` - SQLAlchemy models and DTOs
  - `tasks/` - Celery background task definitions

#### Next.js Frontend (`frontend/src/`)
- **App Router**: Uses Next.js 15 App Directory structure
- **UI Framework**: Tailwind CSS with Radix UI components
- **Key Pages**: Dashboard, Ads, Competitors, Ad Sets, Tasks
- **Component System**: Reusable UI components in `components/ui/`

#### Database Schema
- **Core Models**: Ad, AdSet, Competitor, Campaign
- **Relationships**: Ads grouped into AdSets, linked to Competitors
- **Enhanced Features**: AI analysis fields, creative comparison, targeting data

### Background Processing System
- **Celery Workers**: Handle Facebook ad scraping, AI analysis, creative comparison
- **Celery Beat**: Scheduled tasks (hourly ad scraping, 6-hourly AI batch analysis)
- **Task Types**:
  - `facebook_ads_scraper_task` - Automated ad data collection
  - `ai_analysis_tasks` - AI-powered ad content analysis
  - `basic_tasks` - General background operations

### AI Integration
- **Google Generative AI**: Gemini model for ad content analysis
- **Creative Comparison**: Image and video similarity analysis using OpenCV/Pillow
- **Enhanced Extraction**: AI-powered parsing of ad metadata and targeting

## Development Workflow

### Environment Setup
1. Copy `.env.example` to `.env` and configure
2. Ensure Docker and Docker Compose are installed
3. Run `docker-compose up --build` to start all services

### Database Development
- Use Alembic for schema changes: `alembic revision --autogenerate -m "description"`
- Apply migrations: `alembic upgrade head`
- Direct DB access via `docker-compose exec db psql -U ads_user -d ads_db`

### API Development
- FastAPI auto-documentation available at `http://localhost:8000/docs`
- Health checks at `/api/v1/health` and `/api/v1/health/detailed`
- Internal API endpoints for system management

### Frontend Development
- Development server at `http://localhost:3000`
- Uses Turbopack for fast rebuilds (`npm run dev`)
- Component library based on shadcn/ui with Radix primitives
- **Daily Scraping UI**: Full-featured interface at `/daily-scraping` for configuring automated scraping

### Testing Strategy
- **Backend**: pytest for unit and integration tests
- **Ad Processing**: Specific test scripts for ad grouping and creative comparison
- **Database**: Test with sample data using utility scripts

## Service Dependencies

### Port Mapping
- Frontend (web): 3000
- Backend (api): 8000  
- PostgreSQL (db): 5432
- Redis: 6379
- Celery worker: No exposed port
- Celery beat: No exposed port

### Data Flow
1. **Facebook Ad Scraping**: Scheduled Celery tasks collect ad data
2. **Ad Processing**: Enhanced extraction service processes and groups ads
3. **AI Analysis**: Background tasks analyze ad content and performance
4. **Frontend Display**: Next.js app consumes FastAPI endpoints
5. **Background Tasks**: Celery handles async operations (scraping, analysis)

### Configuration Management
- Environment variables via `.env` file
- Settings centralized in `backend/app/core/config.py`
- Docker environment variables in `docker-compose.yml`
- TypeScript configuration with strict mode enabled
- Pyright configuration for Python type checking (relaxed settings)

## Key Integration Points

### API Endpoints
- `/api/v1/health` - Health monitoring
- `/api/v1/ads` - Ad data management
- `/api/v1/competitors` - Competitor management
- `/api/v1/scraping/*` - Daily scraping control and monitoring
- Internal API for system operations

### Background Task Integration
- Facebook API integration for ad data collection
- Google AI API for content analysis
- Creative comparison algorithms for duplicate detection
- Automated ad grouping based on content similarity

### Frontend-Backend Communication
- RESTful API communication
- Real-time task status monitoring
- Paginated data loading for large datasets
- Error handling and user feedback systems

## Daily Scraping Feature

### Frontend Interface
- Access at `http://localhost:3000/daily-scraping`
- Configure schedule time, countries, and scraping parameters
- Start manual scraping with real-time progress monitoring
- View active competitors and latest ad dates
- Enable/disable automatic daily scraping

### CLI Tool (Optional)
```bash
# List active competitors
python daily_scraping_cli.py competitors

# Start daily scraping for all competitors
python daily_scraping_cli.py daily --monitor

# Scrape specific competitors
python daily_scraping_cli.py specific 1 2 3 --monitor

# Check task status
python daily_scraping_cli.py status <task_id>
```

### Configuration
- **Schedule**: Set daily run time in frontend UI
- **Countries**: Multi-select from 9 countries (UAE, US, UK, etc.)
- **Parameters**: Max pages (1-10), delay (1-10s), hours lookback (1-168)
- **Status Filter**: Active only, Inactive only, or All ads

### Documentation
- `DAILY_SCRAPING_SETUP.md` - Quick setup guide
- `DAILY_SCRAPING_GUIDE.md` - Comprehensive backend guide
- `frontend/DAILY_SCRAPING_FRONTEND.md` - Frontend user guide
