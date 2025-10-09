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

    #Brevo
    brevo_api_key: str = os.getenv("JI085vrZMUydafFp")
    brevo_sender_email: str = os.getenv("sergiocervantes742@gmail.com")
    brevo_sender_name: str = os.getenv("LANIA Certificados")

    smtp_server: str = "smtp-relay.brevo.com"
    smtp_port: int = 587
    smtp_login: str = "98de08001@smtp-brevo.com"
    smtp_password: str = "JI085vrZMUydafFp"
    smtp_sender_email: str = "sergiocervantes742@gmail.com"
    smtp_sender_name: str = "LANIA Certificados"

    class Config:
        env_file = ".env"

def get_settings() -> Settings:
    return Settings()