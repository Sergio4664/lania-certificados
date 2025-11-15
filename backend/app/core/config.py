from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
from pydantic import SecretStr # 💡 1. Importar SecretStr

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: SecretStr # 💡 2. Corregido: Usar SecretStr para seguridad
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    FRONTEND_URL: str = "http://localhost:4200"
    
    # 🎯 CORREGIDO: Se añade la variable faltante que causaba el error 500 en forgot-password
    # Se recomienda un valor de 30 o 60 minutos para un token de restablecimiento por seguridad.
    RESET_TOKEN_EXPIRE_MINUTES: int = 60 

    # Variables de Correo (SMTP)
    SMTP_SERVER: str
    SMTP_PORT: int
    SMTP_LOGIN: str
    SMTP_PASSWORD: str
    SMTP_SENDER_EMAIL: str
    SMTP_SENDER_NAME: str

    # ✅ CORRECCIÓN: Se añade la variable que estaba en .env pero faltaba aquí
    BREVO_API_KEY: Optional[str] = None

    # Necesario si el binario no está en el PATH del sistema.
    WKHTMLTOPDF_PATH: Optional[str] = None

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()