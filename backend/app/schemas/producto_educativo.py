# backend/app/schemas/producto_educativo.py
from pydantic import BaseModel, field_validator, ConfigDict
from datetime import date
from typing import List, Optional, TYPE_CHECKING

from app.models.enums import TipoProductoEnum, ModalidadEnum
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
    
    @field_validator('nombre')
    @classmethod
    def nombre_no_debe_estar_vacio(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('El nombre no puede estar vacío')
        return v.strip()

    @field_validator('horas')
    @classmethod
    def horas_deben_ser_positivas(cls, v: int) -> int:
        if v <= 0:
            raise ValueError('El número de horas debe ser positivo')
        return v

    @field_validator('fecha_fin')
    @classmethod
    def fecha_fin_posterior_a_inicio(cls, v: date, info) -> date:
        if 'fecha_inicio' in info.data and v < info.data['fecha_inicio']:
            raise ValueError('La fecha de fin debe ser posterior o igual a la fecha de inicio')
        return v

class ProductoEducativoCreate(ProductoEducativoBase):
    docente_ids: List[int] = []

class ProductoEducativoUpdate(BaseModel):
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
    docentes: List[DocenteOut] = []
    inscripciones: List['Inscripcion'] = []
    
    model_config = ConfigDict(from_attributes=True)

# La llamada a model_rebuild() se ha movido a schemas/__init__.py