from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext

# La importación debe ser de la instancia 'settings' en minúscula
from app.core.config import settings

# Contexto para el hasheo de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Usar la instancia 'settings' (minúscula) para leer los valores
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    """Crea un nuevo token de acceso JWT."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = subject.copy()
    to_encode.update({"exp": expire})
    
    # Usar la instancia 'settings' (minúscula) para obtener la clave secreta
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña plana contra su hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Genera el hash de una contraseña."""
    return pwd_context.hash(password)