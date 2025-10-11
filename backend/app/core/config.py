from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """
    Define las variables de configuración que la aplicación necesita.
    pydantic-settings las cargará automáticamente desde el archivo .env.
    """
    
    # --- Base de Datos ---
    # AHORA ESPERA UNA ÚNICA VARIABLE, TAL COMO ESTÁ EN TU .env
    DATABASE_URL: str

    # --- Autenticación JWT ---
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # --- Configuración de Correo (SMTP) ---
    SMTP_SERVER: str
    SMTP_PORT: int
    SMTP_LOGIN: str
    SMTP_PASSWORD: str
    SMTP_SENDER_EMAIL: str
    SMTP_SENDER_NAME: str
    
    BREVO_API_KEY: str

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()