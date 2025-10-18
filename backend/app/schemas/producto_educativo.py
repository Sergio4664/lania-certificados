# backend/app/schemas/producto_educativo.py
from pydantic import BaseModel, field_validator, ConfigDict
from datetime import date
from typing import List, Optional, TYPE_CHECKING

from app.models.enums import TipoProductoEnum, ModalidadEnum

# --- ✅ CORRECCIÓN CRÍTICA AQUÍ ---
# Importamos 'DocenteOut' en lugar de 'DocenteDTO'
from .docente import DocenteOut

if TYPE_CHECKING:
    from .inscripcion import Inscripcion

class ProductoEducativoBase(BaseModel):
    nombre: str
    horas: int
    fecha_inicio: date
    fecha_fin: date
    tipo_producto: TipoProductoEnum
    modalidad: ModalidadEnum
    competencias: Optional[str] = None
    
    # ... (tus validadores aquí, no necesitan cambios)

class ProductoEducativoCreate(ProductoEducativoBase):
    docente_ids: List[int] = []

class ProductoEducativoUpdate(BaseModel):
    nombre: Optional[str] = None
    horas: Optional[int] = None
    # ... otros campos opcionales ...
    docente_ids: Optional[List[int]] = None

class ProductoEducativo(ProductoEducativoBase):
    id: int
    
    # --- ✅ CORRECCIÓN CRÍTICA AQUÍ ---
    # La relación debe apuntar a 'DocenteOut'
    docentes: List[DocenteOut] = [] 
    inscripciones: List['Inscripcion'] = []
    
    model_config = ConfigDict(from_attributes=True)