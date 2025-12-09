from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app import models
from app.schemas import auth as schemas_auth
from app.database import get_db
# --- CORRECCIÓN AQUÍ ---
# Se importa la función 'get_settings'
from app.core.config import get_settings

# Se llama a la función para obtener la instancia de la configuración
settings = get_settings()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_current_admin_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.Administrador:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # 🎯 CORRECCIÓN: Se usa .get_secret_value() para obtener el valor de la clave secreta como un string.
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY.get_secret_value(), # <--- CORREGIDO
            algorithms=[settings.ALGORITHM]
        )
        email: str = payload.get("sub")
        role: str = payload.get("rol")
        if email is None or role is None:
            raise credentials_exception
        token_data = schemas_auth.TokenData(email=email, rol=role)
    except JWTError:
        raise credentials_exception

    if token_data.rol != schemas_auth.UserRole.ADMINISTRADOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permisos insuficientes",
        )

    user = db.query(models.Administrador).filter(models.Administrador.email_institucional == token_data.email).first()
    if user is None:
        raise credentials_exception
    if not user.activo:
         raise HTTPException(status_code=400, detail="Usuario inactivo")
         
    return user