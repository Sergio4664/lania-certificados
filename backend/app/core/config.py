# app/core/config.py
from pydantic import BaseModel
from functools import lru_cache
import os

class Settings(BaseModel):
    database_url: str = "postgresql+psycopg2://lania_user:12345678@localhost:5432/lania_certificates"
    secret_key: str = "12345678"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    cors_origins: list[str] = ["http://localhost:4200"]

@lru_cache
def get_settings() -> Settings:
    return Settings(
        database_url=os.getenv("DATABASE_URL", "postgresql+psycopg2://lania_user:12345678@localhost:5432/lania_certificates"),
        secret_key=os.getenv("SECRET_KEY", "12345678"),
        algorithm=os.getenv("ALGORITHM", "HS256"),
        access_token_expire_minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")),
    )
