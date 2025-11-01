# backend/app/schemas/docente.py
from pydantic import BaseModel, ConfigDict, EmailStr
from typing import List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .producto_educativo import ProductoEducativo

class DocenteBase(BaseModel):
    nombre_completo: str
    especialidad: Optional[str] = None
    email_personal: EmailStr
    email_institucional: Optional[EmailStr] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None

class DocenteCreate(DocenteBase):
    pass

class DocenteUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    # ... otros campos opcionales ...

# ✅ Este es el nombre correcto que usaremos
class DocenteOut(DocenteBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# Esquema completo con relaciones
class Docente(DocenteOut):
    productos_educativos: List['ProductoEducativo'] = []
    model_config = ConfigDict(from_attributes=True)

class Config:
    from_attributes = True