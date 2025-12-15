import os
from typing import List


class Settings:
    """
    Application settings and configuration management.
    Uses simple environment variable access for now.
    """
    
    # Application Settings
    APP_NAME: str = "Ads Management API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
    INTERNAL_API_KEY: str = os.getenv("INTERNAL_API_KEY", os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production") + "-internal")
    
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://ads_user:ads_password@db:5432/ads_db")
    
    # Redis Configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379")
    
    # Celery Configuration
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://redis:6379")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379")
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
    
    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    
    # Task Configuration
    CELERY_TASK_TIME_LIMIT: int = 30 * 60  # 30 minutes
    CELERY_TASK_SOFT_TIME_LIMIT: int = 25 * 60  # 25 minutes
    
    # AI Service Configuration
    GOOGLE_AI_API_KEY: str = os.getenv("GOOGLE_AI_API_KEY", "")
    GOOGLE_AI_MODEL: str = os.getenv("GOOGLE_AI_MODEL", "gemini-pro")
    AI_ANALYSIS_ENABLED: bool = os.getenv("AI_ANALYSIS_ENABLED", "true").lower() == "true"
    
    # Logging Configuration
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")


# Create settings instance
settings = Settings()


def get_settings() -> Settings:
    """
    Dependency to get settings instance.
    Can be used in FastAPI dependency injection.
    """
    return settings 
