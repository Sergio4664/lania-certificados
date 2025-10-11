from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app import models
# --- CORRECCIÓN DE IMPORTACIÓN ---
# En lugar de "from app import schemas", importamos las clases específicas que necesitamos.
from app.schemas.auth import Token, UserAuth, UserRole
from app.core import security

router = APIRouter(
    tags=["Auth"]
)

def authenticate_admin(db: Session, email: str, password: str):
    """Autentica únicamente a un administrador."""
    admin = db.query(models.Administrador).filter(models.Administrador.email_institucional == email).first()
    if not admin:
        return None
    if not security.verify_password(password, admin.password_hash):
        return None
    return admin

# Ahora usamos 'Token' directamente, sin el prefijo 'schemas.'
@router.post("/token", response_model=Token)
async def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_admin(db, email=form_data.username, password=form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.activo:
        raise HTTPException(status_code=400, detail="Usuario inactivo")

    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        # Usamos 'UserRole' directamente
        data={"sub": user.email_institucional, "rol": UserRole.ADMINISTRADOR.value},
        expires_delta=access_token_expires
    )

    # Usamos 'UserAuth' directamente
    user_auth_data = UserAuth(
        id=user.id,
        nombre_completo=user.nombre_completo,
        email_institucional=user.email_institucional,
        rol=UserRole.ADMINISTRADOR
    )

    return {"access_token": access_token, "token_type": "bearer", "user": user_auth_data}