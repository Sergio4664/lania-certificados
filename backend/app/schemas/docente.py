# backend/app/schemas/docente.py
from pydantic import BaseModel, ConfigDict, EmailStr
from typing import List, Optional, TYPE_CHECKING

# Usar TYPE_CHECKING para evitar la importación circular en tiempo de ejecución
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
    especialidad: Optional[str] = None
    email_personal: Optional[EmailStr] = None
    email_institucional: Optional[EmailStr] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None

# --- ✅ NOMBRE CORRECTO ---
# Esta es la clase que tu router necesita importar.
class DocenteOut(DocenteBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# Esquema completo con sus relaciones (usado internamente para resolver dependencias)
class Docente(DocenteOut):
    # Referencia a Futuro para evitar bucles de importación
    productos_educativos: List['ProductoEducativo'] = []
    
    model_config = ConfigDict(from_attributes=True)