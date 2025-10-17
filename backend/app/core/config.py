# backend/app/core/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    FRONTEND_URL: str = "http://localhost:4200"

    # Variables de Correo (SMTP) - Nombres corregidos para coincidir con .env
    SMTP_SERVER: str
    SMTP_PORT: int
    SMTP_LOGIN: str
    SMTP_PASSWORD: str
    SMTP_SENDER_EMAIL: str
    SMTP_SENDER_NAME: str

    class Config:
        env_file = ".env"

# ✅ CORRECCIÓN: Usar una función con caché para cargar la configuración de forma segura
@lru_cache()
def get_settings():
    return Settings()

# Se exporta la función para ser usada en otros módulos
settings = get_settings()