# backend/app/core/config.py
from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from dotenv import load_dotenv
from functools import lru_cache 
from pydantic import SecretStr, EmailStr # Importar SecretStr

# Cargamos el archivo .env ubicado en el directorio backend
# Ya que el código de la API se ejecuta desde app/main.py,
# la ruta debe ser relativa al directorio de la aplicación o usar Path.
# Usaremos Path para asegurar la ruta: Path(__file__).resolve().parent.parent
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

class Settings(BaseSettings):
    """
    Configuración base de la aplicación, cargada desde el entorno o .env.
    Usa pydantic-settings (Pydantic V2).
    """
    # --- CONFIGURACIÓN DE SEGURIDAD Y TOKEN ---
    DATABASE_URL: str
    SECRET_KEY: SecretStr # Usar SecretStr para ocultar el valor en logs
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # 💡 Configuración del tiempo de expiración del token de restablecimiento.
    RESET_TOKEN_EXPIRE_MINUTES: int = 60 

    # --- CONFIGURACIÓN DE DESPLIEGUE Y SERVICIOS ASÍNCRONOS ---
    # URL pública base de la aplicación (para generar QR de verificación y enlaces de restablecimiento)
    BASE_URL: str = "https://siscol.lania.mx:8443"
    
    # URL de Redis para RQ (Colas de tareas)
    REDIS_URL: str = "redis://localhost:6379" 

    # --- CONFIGURACIÓN DE CORREO (SMTP/Brevo) ---
    # Brevo API Key (si se usa la librería 'brevo-python')
    BREVO_API_KEY: Optional[str] = None
    EMAIL_SENDER: str = "no-reply@tudominio.com"

    # Variables de Correo SMTP (si se usa un cliente SMTP tradicional en lugar de Brevo)
    SMTP_SERVER: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_LOGIN: Optional[str] = None
    SMTP_PASSWORD: Optional[SecretStr] = None # Usar SecretStr para la contraseña
    SMTP_SENDER_EMAIL: Optional[EmailStr] = None # Usar EmailStr para validación
    SMTP_SENDER_NAME: Optional[str] = None
    
    # Necesario para pdfkit o wkhtmltopdf
    WKHTMLTOPDF_PATH: Optional[str] = None
    
    # Configuración del motor de Pydantic V2
    model_config = SettingsConfigDict(
        env_file='.env', 
        env_file_encoding='utf-8', 
        case_sensitive=True
    )

# Cache de la configuración (singleton)
@lru_cache()
def get_settings():
    """Retorna la instancia de Settings, usando caché para eficiencia."""
    return Settings()

# 🚨 CORRECCIÓN: Definir la variable global 'settings' para la importación en otros módulos.
settings = get_settings()