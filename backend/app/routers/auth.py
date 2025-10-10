# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app import models, schemas
from app.core import security

router = APIRouter(
    tags=["Auth"]
)

def authenticate_user(db: Session, email: str, password: str):
    # Primero, intentar autenticar como Administrador
    admin = db.query(models.Administrador).filter(models.Administrador.email_institucional == email).first()
    if admin and security.verify_password(password, admin.password_hash):
        return admin, schemas.UserRole.ADMINISTRADOR

    # Si no es admin, intentar autenticar como Docente
    docente = db.query(models.Docente).filter(models.Docente.email_institucional == email).first()
    if docente and security.verify_password(password, docente.password_hash):
        return docente, schemas.UserRole.DOCENTE

    # Si no se encuentra en ninguna de las dos tablas o la contraseña es incorrecta
    return None, None

@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user, role = authenticate_user(db, email=form_data.username, password=form_data.password)
    
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
        data={"sub": user.email_institucional, "rol": role.value},
        expires_delta=access_token_expires
    )

    # Crear el objeto de usuario para la respuesta
    user_auth_data = schemas.UserAuth(
        id=user.id,
        nombre_completo=user.nombre_completo,
        email_institucional=user.email_institucional,
        rol=role
    )

    return {"access_token": access_token, "token_type": "bearer", "user": user_auth_data}