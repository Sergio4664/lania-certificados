import secrets
import hashlib
from datetime import timedelta, datetime, timezone
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks
from app import models
from app.services import email_service

# Asumiendo que esta configuración está en tu config.py o settings
PASSWORD_RESET_TOKEN_EXPIRE_HOURS = 1 
FRONTEND_RESET_PASSWORD_URL = "http://localhost:4200/reset-password"

def create_and_send_password_reset_link(db: Session, user: models.Administrador, background_tasks: BackgroundTasks):
    """
    Genera el token de restablecimiento, lo guarda en la base de datos 
    y programa el envío del correo electrónico.
    """
    # 1. Generación y Hasheo del Token
    token_urlsafe = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token_urlsafe.encode()).hexdigest()
    
    # 2. Configuración de Expiración
    expires_delta = timedelta(hours=PASSWORD_RESET_TOKEN_EXPIRE_HOURS)
    expires_at = datetime.now(timezone.utc) + expires_delta
    
    # 3. Guardar Token en DB (Reutilizar o crear)
    existing_token = db.query(models.TokenRestablecimientoPassword).filter(
        models.TokenRestablecimientoPassword.email == user.email_institucional
    ).first()
    
    if existing_token:
        existing_token.token = token_hash
        existing_token.fecha_expiracion = expires_at
    else:
        db.add(models.TokenRestablecimientoPassword(
            email=user.email_institucional, 
            token=token_hash, 
            fecha_expiracion=expires_at
        ))
        
    db.commit()
    
    # 4. Preparar enlace y enviar correo (Usando BackgroundTasks)
    reset_link = f"{FRONTEND_RESET_PASSWORD_URL}/{token_urlsafe}"
    
    background_tasks.add_task(
        email_service.send_password_reset_email,
        recipient_email=user.email_institucional,
        user_name=user.nombre_completo,
        reset_link=reset_link
    )
    
    # Nota: No devolvemos nada, solo programamos la tarea
