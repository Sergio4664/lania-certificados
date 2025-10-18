# backend/app/schemas/producto_educativo.py
from pydantic import BaseModel, ConfigDict
from typing import List, Optional, TYPE_CHECKING
from datetime import date

# Importa los esquemas necesarios para las referencias
if TYPE_CHECKING:
    from .docente import DocenteOut
    from .inscripcion import Inscripcion  # Asegúrate de importar Inscripcion

class ProductoEducativoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    horas: int
    fecha_inicio: date
    fecha_fin: date

class ProductoEducativoCreate(ProductoEducativoBase):
    docentes_ids: List[int] = []

class ProductoEducativoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    horas: Optional[int] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    docentes_ids: Optional[List[int]] = None

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
    inscripciones: List['Inscripcion'] = []
    model_config = ConfigDict(from_attributes=True)