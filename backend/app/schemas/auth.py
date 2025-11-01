#Ruta: backend/app/schemas/auth.py
from pydantic import BaseModel
from typing import Optional
import enum

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# El único rol con acceso al sistema es ADMINISTRADOR
class UserRole(str, enum.Enum):
    ADMINISTRADOR = "administrador"

# Define la estructura del usuario que se devuelve tras el login
class UserAuth(BaseModel):
    id: int
    nombre_completo: str
    email_institucional: str
    rol: UserRole

# El token que se devuelve al cliente
class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserAuth

# Los datos que se guardan dentro del JWT para su posterior validación
class TokenData(BaseModel):
    email: Optional[str] = None
    rol: Optional[UserRole] = None

class Config:
    from_attributes = True