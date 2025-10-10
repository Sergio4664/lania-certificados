# backend/app/routers/auth.py
import logging
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.models.user import User  # Asegúrate que el modelo se llame User en user.py
from app.schemas.auth import Token, Login
from app.core.security import verify_password, create_access_token, get_password_hash
from app.services.email_service import send_password_reset_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# --- Modelos Pydantic para las nuevas rutas ---
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    password: str
# -------------------------------------------

@router.post("/login", response_model=Token)
def login(payload: Login, db: Session = Depends(get_db)):
    try:
        # Buscar usuario por email
        logger.info(f"Intentando login para: {payload.email}")
        user = db.query(User).filter(User.email == payload.email).first()
        
        if not user:
            logger.warning(f"Usuario no encontrado: {payload.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Credenciales inválidas"
            )
        
        # Verificar si el usuario está activo
        if not user.is_active:
            logger.warning(f"Usuario inactivo: {payload.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Usuario inactivo"
            )
        
        # Verificar contraseña
        logger.info(f"Verificando contraseña para: {payload.email}")
        if not verify_password(payload.password, user.hashed_password):
            logger.warning(f"Contraseña incorrecta para: {payload.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Credenciales inválidas"
            )
        
        # Crear token usando el user.id como en tu security.py
        access_token = create_access_token(str(user.id))
        logger.info(f"Login exitoso para: {payload.email}")
        
        return Token(access_token=access_token)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

# --- NUEVOS ENDPOINTS PARA RESTABLECER CONTRASEÑA ---

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Inicia el proceso de reseteo de contraseña.
    Genera un token y lo envía por correo electrónico.
    """
    try:
        logger.info(f"Solicitud de restablecimiento de contraseña para: {request.email}")
        user = db.query(User).filter(User.email == request.email).first()
        
        # Por seguridad, no revelamos si el correo existe o no.
        # Siempre devolvemos el mismo mensaje.
        if user:
            # Generar token seguro
            token = secrets.token_urlsafe(32)
            expiration = datetime.utcnow() + timedelta(hours=1) # Token válido por 1 hora

            user.reset_password_token = token
            user.reset_token_expires_at = expiration
            db.commit()

            # Enviar correo (asegúrate de que la URL del frontend sea la correcta)
            reset_link = f"http://localhost:4200/reset-password/{token}" 
            send_password_reset_email(user.email, user.full_name, reset_link)
            logger.info(f"Correo de restablecimiento enviado a: {user.email}")

        return {"message": "Si tu correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña."}

    except Exception as e:
        logger.error(f"Error en forgot_password: {str(e)}")
        # No lanzar un error HTTP 500 para no revelar información del sistema.
        # Simplemente registramos el error y devolvemos el mensaje genérico.
        return {"message": "Si tu correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña."}


@router.post("/reset-password/{token}", status_code=status.HTTP_200_OK)
def reset_password(token: str, request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Restablece la contraseña del usuario utilizando el token proporcionado.
    """
    try:
        new_password = request.password
        if not new_password or len(new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La contraseña debe tener al menos 8 caracteres."
            )

        logger.info(f"Intento de restablecimiento de contraseña con token: {token[:8]}...")
        user = db.query(User).filter(User.reset_password_token == token).first()

        if not user or user.reset_token_expires_at is None or user.reset_token_expires_at < datetime.utcnow():
            logger.warning(f"Token inválido o expirado: {token[:8]}...")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El token es inválido o ha expirado."
            )

        # Actualizar contraseña y limpiar el token de reseteo
        user.hashed_password = get_password_hash(new_password)
        user.reset_password_token = None
        user.reset_token_expires_at = None
        db.commit()

        logger.info(f"Contraseña actualizada exitosamente para el usuario: {user.email}")
        return {"message": "Contraseña actualizada exitosamente."}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en reset_password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor al restablecer la contraseña."
        )