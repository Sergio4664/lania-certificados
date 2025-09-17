# backend/app/core/security.py
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database import get_db
from app.models.user import User as UserModel

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Añadimos el "esquema" de autenticación ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
# ----------------------------------------------

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verificar contraseña"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash de contraseña"""
    return pwd_context.hash(password)

def create_access_token(user_id: str) -> str:
    """Crear JWT token"""
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expire_minutes)
    to_encode = {"sub": str(user_id), "exp": expire} # Aseguramos que user_id sea string
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

# --- AÑADE ESTA NUEVA FUNCIÓN ---
def get_current_active_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> UserModel:
    """
    Decodifica el token, obtiene el ID de usuario, y retorna el
    objeto de usuario desde la base de datos si está activo.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(UserModel).filter(UserModel.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user
# -----------------------------------