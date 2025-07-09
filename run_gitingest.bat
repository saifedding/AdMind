@echo off
setlocal

:: Define the base directory
set "BASE_DIR=%CD%"

:: Pull latest updates from git in main repository
echo Pulling latest updates from git in main repository...
cd /d "%BASE_DIR%"
git pull
if %ERRORLEVEL% neq 0 (
    echo Git pull failed in main repository
)

:: Process frontend
echo Processing frontend...
cd /d "%BASE_DIR%\frontend"
if %ERRORLEVEL% neq 0 (
    echo Failed to change to frontend directory
    exit /b %ERRORLEVEL%
)
gitingest . --output "%BASE_DIR%\frontend-digest.txt"
if %ERRORLEVEL% neq 0 (
    echo gitingest failed for frontend
)

:: Process backend
echo Processing backend...
cd /d "%BASE_DIR%\backend"
if %ERRORLEVEL% neq 0 (
    echo Failed to change to backend directory
    exit /b %ERRORLEVEL%
)
gitingest . --output "%BASE_DIR%\backend-digest.txt"
if %ERRORLEVEL% neq 0 (
    echo gitingest failed for backend
)

echo Done.
endlocal