from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# Propiedades compartidas
class AdministradorBase(BaseModel):
    nombre_completo: str
    email_institucional: EmailStr
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None
    activo: Optional[bool] = True

# Propiedades para la creación (requiere contraseña)
class AdministradorCreate(AdministradorBase):
    password: str

# Propiedades para la actualización (todos los campos opcionales)
class AdministradorUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    email_institucional: Optional[EmailStr] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None
    activo: Optional[bool] = None
    password: Optional[str] = None # Opcional para cambiar la contraseña

# Propiedades que se devuelven desde la API (sin la contraseña)
class Administrador(AdministradorBase):
    id: int
    fecha_creacion: datetime

class Config:
    from_attributes = True