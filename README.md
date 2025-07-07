# Ads Management Platform

A comprehensive monorepo containing a FastAPI backend, Next.js frontend, PostgreSQL database, and Redis cache for managing Facebook Ads data.

## 🏗️ Project Structure

```
ads/
├── backend/                 # FastAPI Python backend
│   ├── app/                # Application code
│   │   ├── routers/        # API route handlers
│   │   ├── main.py         # FastAPI application entry point
│   │   ├── database.py     # Database configuration
│   │   ├── celery.py       # Celery configuration
│   │   └── tasks.py        # Background tasks
│   ├── Dockerfile          # Backend container definition
│   └── requirements.txt    # Python dependencies
├── frontend/               # Next.js React frontend
│   ├── src/                # Source code
│   │   └── app/           # Next.js 13+ app directory
│   ├── Dockerfile         # Frontend container definition
│   └── package.json       # Node.js dependencies
├── docker-compose.yml     # Multi-service orchestration
├── env.example           # Environment variables template
└── README.md             # This file
```

## 🚀 Quick Start

### Prerequisites

Make sure you have the following installed:
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Setup Instructions

1. **Clone the repository and navigate to the project directory:**
   ```bash
   cd ads
   ```

2. **Create environment file:**
   ```bash
   cp env.example .env
   ```
   Edit `.env` file with your actual configuration values.

3. **Start the entire application stack:**
   ```bash
   docker-compose up --build
   ```

4. **Access the applications:**
   - **Frontend:** http://localhost:3000
   - **Backend API:** http://localhost:8000
   - **API Documentation:** http://localhost:8000/docs
   - **ReDoc Documentation:** http://localhost:8000/redoc

## 🐳 Docker Services

The application consists of 6 Docker services:

| Service | Port | Description |
|---------|------|-------------|
| **web** | 3000 | Next.js frontend application |
| **api** | 8000 | FastAPI backend API |
| **db** | 5432 | PostgreSQL database |
| **redis** | 6379 | Redis cache and Celery broker |
| **worker** | - | Celery worker for background tasks |
| **beat** | - | Celery beat for scheduled tasks |

## 🛠️ Development

### Backend Development

The backend uses FastAPI with the following key features:
- **Database:** PostgreSQL with SQLAlchemy ORM
- **Background Tasks:** Celery with Redis broker
- **API Documentation:** Auto-generated with Swagger UI
- **Health Checks:** Built-in health monitoring endpoints

Key API endpoints:
- `GET /api/v1/health` - Basic health check
- `GET /api/v1/health/detailed` - Detailed health with DB/Redis status
- `GET /api/v1/ads` - List ads with pagination
- `GET /api/v1/ads/stats/summary` - Ads statistics summary

### Frontend Development

The frontend uses Next.js 15 with:
- **Framework:** Next.js with App Router
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **HTTP Client:** Axios
- **UI Components:** Custom components with Tailwind

### Database Management

The PostgreSQL database is automatically created with persistent volumes. To access the database directly:

```bash
docker-compose exec db psql -U ads_user -d ads_db
```

### Background Tasks

Celery workers handle background processing:
- **Worker:** Processes async tasks
- **Beat:** Handles scheduled tasks
- **Monitor:** You can add Flower for task monitoring

To manually trigger a task:
```bash
docker-compose exec worker celery -A app.celery inspect active
```

## 🔧 Environment Variables

Copy `env.example` to `.env` and configure these key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_DB` | Database name | `ads_db` |
| `POSTGRES_USER` | Database user | `ads_user` |
| `POSTGRES_PASSWORD` | Database password | `ads_password` |
| `SECRET_KEY` | Backend secret key | Change in production |
| `NEXT_PUBLIC_API_URL` | Frontend API URL | `http://localhost:8000` |
| `FACEBOOK_ACCESS_TOKEN` | Facebook API token | Your token |

## 📝 API Documentation

Once the backend is running, you can access:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **OpenAPI Schema:** http://localhost:8000/openapi.json

## 🔄 Common Commands

### Start all services:
```bash
docker-compose up --build
```

### Start specific service:
```bash
docker-compose up api
```

### View logs:
```bash
docker-compose logs -f api
docker-compose logs -f web
```

### Stop all services:
```bash
docker-compose down
```

### Reset database:
```bash
docker-compose down -v
docker-compose up --build
```

### Install new Python package:
```bash
# Add to backend/requirements.txt, then:
docker-compose build api
docker-compose up api
```

### Install new Node.js package:
```bash
# Add to frontend/package.json, then:
docker-compose build web
docker-compose up web
```

## 🏃‍♂️ Production Deployment

For production deployment:

1. **Environment:** Update `.env` with production values
2. **Security:** Change all default passwords and secrets
3. **SSL:** Configure HTTPS/SSL certificates
4. **Scaling:** Use production-grade PostgreSQL and Redis
5. **Monitoring:** Add application monitoring and logging

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test locally with `docker-compose up --build`
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Development Stack:**
- Backend: FastAPI + PostgreSQL + Redis + Celery
- Frontend: Next.js + TypeScript + Tailwind CSS
- Containerization: Docker + Docker Compose
- Database: PostgreSQL with persistent volumes
- Cache: Redis for caching and task brokerage 