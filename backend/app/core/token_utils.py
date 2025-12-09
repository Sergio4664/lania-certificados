import secrets
import hashlib
from datetime import timedelta, datetime, timezone
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks

# Importaciones de configuración y servicios
from app.core.config import settings # 💡 CORRECCIÓN 1: Importar la configuración centralizada
from app import models
from app.services import email_service


def create_and_send_password_reset_link(db: Session, user: models.Administrador, background_tasks: BackgroundTasks):
    """
    Genera el token de restablecimiento, lo guarda en la base de datos 
    y programa el envío del correo electrónico.
    """
    # 1. Generación y Hasheo del Token
    token_urlsafe = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token_urlsafe.encode()).hexdigest()
    
    # 2. Configuración de Expiración (basada en settings.RESET_TOKEN_EXPIRE_MINUTES)
    expires_delta = timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)
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
    
    # 4. Preparar URL y parámetros para el correo (CRÍTICO: Usar FRONTEND_URL)
    
    # Usamos settings.FRONTEND_URL y concatenamos la ruta de Angular
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token_urlsafe}"
    
    # Convertir minutos a horas para mostrar en el correo (opcional, pero útil)
    token_expire_minutes = settings.RESET_TOKEN_EXPIRE_MINUTES
    
    background_tasks.add_task(
        email_service.send_password_reset_email,
        email=user.email_institucional,     
        user_name=user.nombre_completo,
        # Se elimina el token, ya que el servicio de correo solo necesita la URL completa
        token_expire_minutes=token_expire_minutes, # Se pasa la duración
        reset_url=reset_url # El enlace completo y correcto
    )
    
    # Nota: No devolvemos nada, solo programamos la tarea
