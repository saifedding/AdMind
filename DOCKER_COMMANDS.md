# Docker Commands Reference

Quick reference for rebuilding and managing Docker containers.

## Quick Rebuild Commands

### Option 1: NPM Scripts (Recommended)
```bash
# Rebuild and restart (uses cache)
npm run rebuild

# Clean rebuild (no cache - slower but ensures fresh build)
npm run rebuild:clean

# Start containers
npm run start

# Stop containers
npm run stop

# View all logs
npm run logs

# View API logs only
npm run logs:api

# View worker logs only
npm run logs:worker

# Restart containers
npm run restart

# Check container status
npm run status
```

### Option 2: Batch File (Windows)
```cmd
# Double-click or run from command line
rebuild.bat
```

### Option 3: Shell Script (Git Bash/Linux/Mac)
```bash
# Make executable (first time only)
chmod +x rebuild.sh

# Run the script
./rebuild.sh
```

### Option 4: Manual Commands
```bash
# Full rebuild sequence
docker-compose down
docker-compose build
docker-compose up -d

# Clean rebuild (no cache)
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Rebuild specific service
docker-compose build api
docker-compose up -d api
```

## Common Operations

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f worker
docker-compose logs -f db

# Last 50 lines
docker-compose logs --tail=50 api
```

### Container Management
```bash
# List running containers
docker-compose ps

# Stop all containers
docker-compose down

# Start containers
docker-compose up -d

# Restart specific service
docker-compose restart api

# Remove containers and volumes
docker-compose down -v
```

### Database Operations
```bash
# Access PostgreSQL
docker-compose exec db psql -U ads_user -d ads_db

# Create database backup
docker-compose exec db pg_dump -U ads_user ads_db > backup.sql

# Restore database backup
docker-compose exec -T db psql -U ads_user ads_db < backup.sql
```

### Troubleshooting
```bash
# Check container health
docker-compose ps

# View resource usage
docker stats

# Clean up unused resources
docker system prune

# Remove all stopped containers
docker container prune

# Remove unused images
docker image prune
```

## When to Use Each Command

- **`npm run rebuild`** - After code changes (uses cache, faster)
- **`npm run rebuild:clean`** - After dependency changes or if rebuild fails
- **`npm run logs:api`** - To debug API issues
- **`npm run status`** - To check if containers are running
- **`docker-compose down -v`** - To reset database (⚠️ deletes all data)

## Services

- **api** - FastAPI backend (port 8000)
- **worker** - Celery worker (background tasks)
- **beat** - Celery beat (scheduled tasks)
- **db** - PostgreSQL database (port 5432)
- **redis** - Redis cache (port 6379)
