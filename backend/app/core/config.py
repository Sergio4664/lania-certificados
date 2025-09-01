# backend/app/core/config.py
from pydantic import BaseModel
from typing import List
import os

class Settings(BaseModel):
    # Database
    database_url: str = os.getenv("DATABASE_URL", "postgresql://lania_user:12345678@localhost/lania_certificates")
    
    # CORS
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:4200",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:4200",
        "http://127.0.0.1:8080",
    ]
    
    # JWT
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "12345678")
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 30

    class Config:
        env_file = ".env"

def get_settings() -> Settings:
    return Settings()