# backend/app/schemas/certificado.py

from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from .inscripcion import Inscripcion

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
        from_attributes = True

# ✅ NUEVO: Esquema para la verificación pública que faltaba
class CertificadoPublic(BaseModel):
    folio: str
    fecha_emision: datetime
    nombre_participante: str
    nombre_producto: str
    horas: int
    nombre_docente: str