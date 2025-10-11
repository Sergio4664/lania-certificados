from pydantic import BaseModel, field_validator
from datetime import date
from typing import List, Optional

# Importamos el schema de Docente para poder anidarlo en la respuesta de la API
from .docente import Docente

# Propiedades compartidas que tendrán todos los schemas de ProductoEducativo
class ProductoEducativoBase(BaseModel):
    nombre: str
    horas: int
    fecha_inicio: date
    fecha_fin: date

    # --- VALIDACIONES CONSERVADAS Y ACTUALIZADAS ---

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
        # 'info.data' contiene los otros campos del modelo que se están validando
        if 'fecha_inicio' in info.data and v < info.data['fecha_inicio']:
            raise ValueError('La fecha de fin debe ser posterior o igual a la fecha de inicio')
        return v

# Schema para la creación de un nuevo producto educativo
class ProductoEducativoCreate(ProductoEducativoBase):
    # Al crear, se puede pasar una lista de IDs de los docentes que impartirán el producto
    docentes_ids: List[int] = []

# Schema para la actualización (todos los campos son opcionales)
class ProductoEducativoUpdate(BaseModel):
    nombre: Optional[str] = None
    horas: Optional[int] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    docentes_ids: Optional[List[int]] = None

# Schema para la respuesta de la API (lo que se devuelve al cliente)
class ProductoEducativo(ProductoEducativoBase):
    id: int
    # En la respuesta, se incluye la lista completa de objetos Docente, no solo sus IDs
    docentes: List[Docente] = []

    class Config:
        # Permite que Pydantic cree el schema a partir de un objeto de SQLAlchemy
        from_attributes = True