@echo off
setlocal enabledelayedexpansion

echo ======================================
echo    Docker Rebuild ^& Restart Script
echo ======================================
echo.

:: Stop all containers
echo [1/4] Stopping containers...
docker-compose down
if %errorlevel% neq 0 (
    echo [FAILED] Could not stop containers
    exit /b 1
)
echo [SUCCESS] Containers stopped
echo.

:: Rebuild containers
echo [2/4] Rebuilding containers...
docker-compose build
if %errorlevel% neq 0 (
    echo [FAILED] Could not rebuild containers
    exit /b 1
)
echo [SUCCESS] Containers rebuilt
echo.

:: Start containers
echo [3/4] Starting containers...
docker-compose up -d
if %errorlevel% neq 0 (
    echo [FAILED] Could not start containers
    exit /b 1
)
echo [SUCCESS] Containers started
echo.

:: Show status
echo [4/4] Checking status...
docker-compose ps
echo.

echo ======================================
echo    Rebuild Complete!
echo ======================================
echo.
echo View logs with: docker-compose logs -f
echo Stop containers: docker-compose down
echo.

pause
