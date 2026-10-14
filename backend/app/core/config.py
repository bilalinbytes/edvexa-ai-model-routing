from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Edvexa AI Model Evaluation & Routing Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database: SQLite fallback by default for local execution without Docker/Postgres
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./edvexa.db")
    
    # Redis URL with in-process worker queue fallback
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_REDIS_QUEUE: bool = os.getenv("USE_REDIS_QUEUE", "false").lower() in ("true", "1", "t")
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ]
    
    # Worker and Reliability Settings
    WORKER_CONCURRENCY: int = 4
    JOB_CLAIM_TIMEOUT_SECONDS: int = 60  # If job stuck in RUNNING without heartbeat, can be reclaimed
    MAX_JOB_RETRIES: int = 3
    DEFAULT_TIMEOUT_SECONDS: float = 10.0
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
