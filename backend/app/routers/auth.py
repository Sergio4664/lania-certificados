# Ruta: backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime, timezone
import secrets
import hashlib

from app.database import get_db
from app import models
from app.schemas.auth import Token, UserAuth, UserRole, ForgotPasswordRequest, ResetPasswordRequest
from app.core import security
from app.services import email_service

router = APIRouter(
    tags=["Auth"]
)

def authenticate_admin(db: Session, email: str, password: str):
    """Autentica únicamente a un administrador."""
    # La función recibe 'email' y lo usa para filtrar por 'email_institucional'
    admin = db.query(models.Administrador).filter(models.Administrador.email_institucional == email).first()
    if not admin:
        return None
    if not security.verify_password(password, admin.password_hash):
        return None
    return admin

@router.post("/token", response_model=Token)
async def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    # Se llama a la función con el parámetro 'email', que es el correcto
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
    subject={"sub": user.email_institucional, "rol": UserRole.ADMINISTRADOR.value},
    expires_delta=access_token_expires
)
    user_auth_data = UserAuth(
        id=user.id,
        nombre_completo=user.nombre_completo,
        email_institucional=user.email_institucional,
        rol=UserRole.ADMINISTRADOR
    )

    return {"access_token": access_token, "token_type": "bearer", "user": user_auth_data}

# ... (el resto del código de forgot/reset password no necesita cambios)
@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    admin = db.query(models.Administrador).filter(models.Administrador.email_institucional == request.email).first()
    if not admin:
        return {"message": "Si existe una cuenta con este correo, se ha enviado un enlace para restablecer la contraseña."}
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires_delta = timedelta(hours=1)
    expires_at = datetime.now(timezone.utc) + expires_delta
    existing_token = db.query(models.TokenRestablecimientoPassword).filter(models.TokenRestablecimientoPassword.email == request.email).first()
    if existing_token:
        existing_token.token = token_hash
        existing_token.fecha_expiracion = expires_at
    else:
        db.add(models.TokenRestablecimientoPassword(email=request.email, token=token_hash, fecha_expiracion=expires_at))
    db.commit()
    reset_link = f"http://localhost:4200/reset-password/{token}"
    background_tasks.add_task(
        email_service.send_password_reset_email,
        recipient_email=admin.email_institucional,
        user_name=admin.nombre_completo,
        reset_link=reset_link
    )
    return {"message": "Si existe una cuenta con este correo, se ha enviado un enlace para restablecer la contraseña."}

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(request.token.encode()).hexdigest()
    reset_token = db.query(models.TokenRestablecimientoPassword).filter(models.TokenRestablecimientoPassword.token == token_hash).first()
    if not reset_token or reset_token.fecha_expiracion < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="El token es inválido o ha expirado.")
    admin = db.query(models.Administrador).filter(models.Administrador.email_institucional == reset_token.email).first()
    if not admin:
        raise HTTPException(status_code=400, detail="Usuario no encontrado.")
    hashed_password = security.get_password_hash(request.new_password)
    admin.password_hash = hashed_password
    db.delete(reset_token)
    db.commit()
    return {"message": "Contraseña actualizada exitosamente."}