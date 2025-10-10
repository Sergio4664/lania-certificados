import logging
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.models.user import User
from app.schemas.auth import Token, Login
from app.core.security import verify_password, create_access_token, get_password_hash
from app.services.email_service import send_password_reset_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    password: str

@router.post("/login", response_model=Token)
def login(payload: Login, db: Session = Depends(get_db)):
    try:
        logger.info(f"Intentando login para: {payload.email}")
        user = db.query(User).filter(User.email == payload.email).first()
        
        if not user or not user.is_active or not verify_password(payload.password, user.hashed_password):
            logger.warning(f"Intento de login fallido para: {payload.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Correo o contraseña incorrectos"
            )
        
        access_token = create_access_token(str(user.id))
        logger.info(f"Login exitoso para: {payload.email}")
        
        return Token(access_token=access_token, token_type="bearer")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inesperado en login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

# --- ENDPOINTS PARA RESTABLECER CONTRASEÑA ---

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Inicia el proceso de reseteo de contraseña.
    Genera un token y lo envía por correo electrónico.
    """
    try:
        logger.info(f"Solicitud de restablecimiento de contraseña para: {request.email}")
        user = db.query(User).filter(User.email == request.email, User.is_active == True).first()
        
        if user:
            token = secrets.token_urlsafe(32)
            expiration = datetime.utcnow() + timedelta(hours=1)

            user.reset_password_token = token
            user.reset_token_expires_at = expiration
            db.commit()

            # Asegúrate de que la URL del frontend sea la correcta
            reset_link = f"http://localhost:4200/reset-password/{token}" 
            send_password_reset_email(user.email, user.full_name, reset_link)
            logger.info(f"Correo de restablecimiento enviado a: {user.email}")

    except Exception as e:
        logger.error(f"Error en forgot_password al procesar para {request.email}: {str(e)}")
        # No se lanza una excepción para no revelar si un correo existe o no.
    
    # Siempre se devuelve el mismo mensaje por seguridad
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
