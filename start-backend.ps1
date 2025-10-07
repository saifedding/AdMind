# Start Backend Server Script
Write-Host "Starting Ads Backend Server..." -ForegroundColor Green

# Navigate to backend directory
Set-Location "C:\Users\ASUS\Documents\coding area\ads\backend"

# Check if virtual environment exists
if (Test-Path "venv\Scripts\Activate.ps1") {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & ".\venv\Scripts\Activate.ps1"
}

# Start uvicorn server
Write-Host "Starting Uvicorn server on http://localhost:8000" -ForegroundColor Cyan
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
