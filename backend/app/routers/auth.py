from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
# Se añade la importación de configuración centralizada
from app.core.config import settings 

from app.database import get_db
from app import models
from app.schemas.auth import Token, UserAuth, UserRole, ForgotPasswordRequest, ResetPasswordRequest
from app.core import security
from app.core.token_utils import create_and_send_password_reset_link
import hashlib
from datetime import datetime, timezone

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

# 🚨 NUEVO ENDPOINT DE DIAGNÓSTICO TEMPORAL 🚨
# Se usará para verificar que la SECRET_KEY se cargó correctamente desde .env
@router.get("/diagnose-key")
def diagnose_key():
    # Obtiene el valor real de la clave (SecretStr requiere .get_secret_value())
    secret_value = settings.SECRET_KEY.get_secret_value()
    
    # Define la clave por defecto que se usa si .env falla
    DEFAULT_SECRET_INDICATOR = "un-secreto-super-seguro" 

    is_default = DEFAULT_SECRET_INDICATOR in secret_value

    if is_default:
        return {
            "status": "ERROR CRÍTICO", 
            "message": "¡ESTÁ USANDO LA CLAVE POR DEFECTO! El token será inválido.", 
            "key_start": secret_value[:10]
        }
    else:
        return {
            "status": "OK", 
            "message": "Clave cargada correctamente desde .env.", 
            "key_start": secret_value[:10] # Muestra solo el inicio por seguridad
        }
# 🚨 FIN DEL ENDPOINT DE DIAGNÓSTICO 🚨


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

    # Usar la configuración de seguridad para el tiempo de expiración
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

# -------------------------------------------------------------------------
# RUTAS DE RESTABLECIMIENTO DE CONTRASEÑA
# -------------------------------------------------------------------------

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    admin = db.query(models.Administrador).filter(models.Administrador.email_institucional == request.email).first()
    
    # Bloqueo intencional para evitar enumeración de usuarios
    if not admin:
        # Mensaje genérico para todos los casos
        return {"message": "Si existe una cuenta con este correo, se ha enviado un enlace para restablecer la contraseña."}
    
    # Llama a la función centralizada: genera el token, lo guarda y programa el envío del correo.
    create_and_send_password_reset_link(db, admin, background_tasks)
    
    # El mensaje de respuesta se mantiene genérico para proteger contra enumeración.
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
    
    # Actualiza la contraseña
    hashed_password = security.get_password_hash(request.new_password)
    admin.password_hash = hashed_password
    
    # Elimina el token de la base de datos para que no pueda ser reutilizado
    db.delete(reset_token)
    db.commit()
    
    return {"message": "Contraseña actualizada exitosamente."}