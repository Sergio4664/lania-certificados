# backend/app/schemas/inscripcion.py
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING

from .participante import Participante

if TYPE_CHECKING:
    from .producto_educativo import ProductoEducativo
    from .certificado import Certificado

class InscripcionBase(BaseModel):
    fecha_inscripcion: datetime
    participante_id: int
    producto_educativo_id: int

class InscripcionCreate(BaseModel):
    participante_id: int
    producto_educativo_id: int

class Inscripcion(InscripcionBase):
    id: int
    participante: Participante
    producto_educativo: 'ProductoEducativo'
    certificados: List['Certificado'] = []

    model_config = ConfigDict(from_attributes=True)

# La llamada a model_rebuild() se ha movido a schemas/__init__.py