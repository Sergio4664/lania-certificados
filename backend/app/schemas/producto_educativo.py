# backend/app/schemas/producto_educativo.py
from pydantic import BaseModel, ConfigDict, model_validator
from typing import List, Optional, TYPE_CHECKING
from datetime import date
from app.models.enums import TipoProductoEnum, ModalidadEnum

# Importa los esquemas necesarios para las referencias
if TYPE_CHECKING:
    from .docente import DocenteOut
    from .inscripcion import InscripcionOut  # Asegúrate de importar Inscripcion

class ProductoEducativoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    horas: int
    fecha_inicio: date
    fecha_fin: date
    tipo_producto: TipoProductoEnum
    modalidad: ModalidadEnum
    competencias: Optional[str] = None

    @model_validator(mode='after')
    def check_dates(self) -> 'ProductoEducativoBase':
        # Se asegura de que ambas fechas existan antes de comparar
        if self.fecha_inicio and self.fecha_fin:
            if self.fecha_fin < self.fecha_inicio:
                # Si la fecha de fin es anterior, lanza un error claro.
                raise ValueError('La fecha de finalización no puede ser anterior a la fecha de inicio.')
        return self

class ProductoEducativoCreate(ProductoEducativoBase):
    docentes_ids: List[int] = []

class ProductoEducativoUpdate(BaseModel):
    nombre: Optional[str] = None
    horas: Optional[int] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    tipo_producto: Optional[TipoProductoEnum] = None
    modalidad: Optional[ModalidadEnum] = None
    competencias: Optional[str] = None
    docentes_ids: Optional[List[int]] = None

    @model_validator(mode='after')
    def check_update_dates(self) -> 'ProductoEducativoUpdate':
        # Compara las fechas solo si ambas están presentes en la petición de actualización
        if self.fecha_inicio and self.fecha_fin:
            if self.fecha_fin < self.fecha_inicio:
                raise ValueError('La fecha de finalización no puede ser anterior a la fecha de inicio.')
        return self

# --- ✅ SOLUCIÓN: Esquema de salida sin recursión ---
# Este esquema muestra los docentes, pero NO las inscripciones para romper el ciclo.
class ProductoEducativoOut(ProductoEducativoBase):
    id: int
    docentes: List['DocenteOut'] = []
    model_config = ConfigDict(from_attributes=True)

# Esquema completo que sí carga las relaciones (para vistas de detalle, si es necesario)
class ProductoEducativo(ProductoEducativoBase):
    id: int
    docentes: List['DocenteOut'] = []
    # La relación a 'Inscripcion' causa el ciclo, por eso la separamos.
    inscripciones: List['InscripcionOut'] = []
    model_config = ConfigDict(from_attributes=True)