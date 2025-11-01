from pydantic import BaseModel, ConfigDict, model_validator
from typing import List, Optional, TYPE_CHECKING
from datetime import date
from app.models.enums import TipoProductoEnum, ModalidadEnum

# Importa los esquemas necesarios para las referencias
if TYPE_CHECKING:
    from .docente import DocenteOut
    from .inscripcion import InscripcionOut

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
 if self.fecha_inicio and self.fecha_fin:
  if self.fecha_fin < self.fecha_inicio:
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
   if self.fecha_inicio and self.fecha_fin:
     if self.fecha_fin < self.fecha_inicio:
       raise ValueError('La fecha de finalización no puede ser anterior a la fecha de inicio.')
     return self

class ProductoEducativoOut(ProductoEducativoBase):
  id: int
  docentes: List['DocenteOut'] = []
  model_config = ConfigDict(from_attributes=True)

# Este es tu esquema detallado principal
class ProductoEducativo(ProductoEducativoBase):
  id: int
  docentes: List['DocenteOut'] = []
  inscripciones: List['InscripcionOut'] = []
  model_config = ConfigDict(from_attributes=True)


# --- 💡 INICIO DE LA CORRECCIÓN ---
#
# Añadimos la clase que falta.
# Hacemos que 'ProductoEducativoWithDetails' herede de 'ProductoEducativo',
# así tendrá todos los campos (id, docentes, inscripciones)
# y el router 'admin_productos_educativos.py' podrá importarla.
#
class ProductoEducativoWithDetails(ProductoEducativo):
    pass
# --- 💡 FIN DE LA CORRECCIÓN ---

class Config:
    from_attributes = True