from pydantic import BaseModel, ConfigDict
from typing import Optional, TYPE_CHECKING, List # 💡 Importar List

# Importa los nuevos esquemas de salida que no tienen ciclos
if TYPE_CHECKING:
  from .participante import Participante, ParticipanteOut # 👈 Importar 'ParticipanteOut'
from .producto_educativo import ProductoEducativoOut
from .certificado import CertificadoOut

class InscripcionBase(BaseModel):
  participante_id: int
producto_educativo_id: int

class InscripcionCreate(InscripcionBase):
 pass

# --- ✅ SOLUCIÓN: Esquema de salida sin recursión ---
class InscripcionOut(InscripcionBase):
 id: int
# --- 💡 CORRECCIÓN 2: Usar 'ParticipanteOut' para romper el ciclo ---
participante: 'ParticipanteOut' # 👈 Usar el esquema simple 'Out'    
producto_educativo: 'ProductoEducativoOut'
certificados: List['CertificadoOut'] = [] # 👈 Cambiado a List (mejor práctica)
model_config = ConfigDict(from_attributes=True)

# Esquema completo para vistas de detalle si fuera necesario
class Inscripcion(InscripcionBase):
 id: int
 # --- 💡 CORRECCIÓN 3: Usar 'ParticipanteOut' aquí también por seguridad ---
participante: 'ParticipanteOut' # 👈 Usar el esquema simple 'Out'

producto_educativo: 'ProductoEducativoOut'
certificados: List['CertificadoOut'] = [] # 👈 Cambiado a List (mejor práctica)

model_config = ConfigDict(from_attributes=True)

class Config:
    from_attributes = True