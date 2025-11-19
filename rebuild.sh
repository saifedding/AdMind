#!/bin/bash

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}======================================${NC}"
echo -e "${YELLOW}   Docker Rebuild & Restart Script${NC}"
echo -e "${YELLOW}======================================${NC}"
echo ""

# Stop all containers
echo -e "${YELLOW}[1/4] Stopping containers...${NC}"
docker-compose down
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Containers stopped${NC}"
else
    echo -e "${RED}✗ Failed to stop containers${NC}"
    exit 1
fi
echo ""

# Rebuild containers
echo -e "${YELLOW}[2/4] Rebuilding containers...${NC}"
docker-compose build --no-cache
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Containers rebuilt${NC}"
else
    echo -e "${RED}✗ Failed to rebuild containers${NC}"
    exit 1
fi
echo ""

# Start containers
echo -e "${YELLOW}[3/4] Starting containers...${NC}"
docker-compose up -d
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Containers started${NC}"
else
    echo -e "${RED}✗ Failed to start containers${NC}"
    exit 1
fi
echo ""

# Show status
echo -e "${YELLOW}[4/4] Checking status...${NC}"
docker-compose ps
echo ""

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}   Rebuild Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "View logs with: docker-compose logs -f"
echo "Stop containers: docker-compose down"
