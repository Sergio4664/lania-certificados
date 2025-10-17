# backend/app/schemas/certificado.py

from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from .inscripcion import Inscripcion  # Asegúrate de que esta importación funcione en tu estructura

class CertificadoBase(BaseModel):
    inscripcion_id: Optional[int] = None
    docente_id: Optional[int] = None
    producto_educativo_id: int

class CertificadoCreate(CertificadoBase):
    pass

class Certificado(CertificadoBase):
    id: int
    folio: str
    fecha_emision: datetime
    archivo_path: str
    inscripcion: Optional[Inscripcion] = None

    class Config:
        # ✅ CORRECCIÓN: Se cambió 'orm_mode' por 'from_attributes'
        from_attributes = True