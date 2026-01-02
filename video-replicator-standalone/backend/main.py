"""
Video Replicator API - Standalone Backend
Analyzes videos and generates VEO prompts for recreation
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.routers import video_replicator

app = FastAPI(
    title="Video Replicator API",
    description="Analyze videos and generate VEO prompts for recreation",
    version="1.0.0"
)

# CORS middleware - Allow Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
        os.getenv("FRONTEND_URL", "*")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(video_replicator.router, prefix="/api/v1", tags=["Video Replicator"])

@app.get("/")
async def root():
    return {"message": "Video Replicator API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
