@echo off
cd frontend
if not exist node_modules (
    echo Installing dependencies...
    npm install
)
npm run dev
