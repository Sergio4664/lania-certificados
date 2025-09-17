# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import Login, Token
from app.core.security import create_access_token, verify_password
from app.models.user import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

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
        
        # Crear token
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