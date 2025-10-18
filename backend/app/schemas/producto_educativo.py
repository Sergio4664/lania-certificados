# backend/app/schemas/producto_educativo.py
from pydantic import BaseModel, field_validator, ConfigDict
from datetime import date
from typing import List, Optional, TYPE_CHECKING

from app.models.enums import TipoProductoEnum, ModalidadEnum
from .docente import DocenteDTO # Usamos el DTO simple para evitar ciclos

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
    
    # ... (Validadores se mantienen igual) ...

class ProductoEducativoCreate(ProductoEducativoBase):
    docente_ids: List[int] = []

class ProductoEducativoUpdate(BaseModel):
    # ... (Campos opcionales se mantienen igual) ...
    nombre: Optional[str] = None
    horas: Optional[int] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    docente_ids: Optional[List[int]] = None
    tipo_producto: Optional[TipoProductoEnum] = None
    modalidad: Optional[ModalidadEnum] = None
    competencias: Optional[str] = None


class ProductoEducativo(ProductoEducativoBase):
    id: int
    docentes: List[DocenteDTO] = []
    inscripciones: List['Inscripcion'] = []
    
    model_config = ConfigDict(from_attributes=True)

# La llamada a model_rebuild() se ha movido a schemas/__init__.py