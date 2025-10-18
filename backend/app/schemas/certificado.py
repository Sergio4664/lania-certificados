# backend/app/schemas/certificado.py
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .inscripcion import Inscripcion
    from .docente import DocenteDTO

class CertificadoBase(BaseModel):
    folio: str
    fecha_emision: datetime
    archivo_path: Optional[str] = None
    inscripcion_id: Optional[int] = None
    docente_id: Optional[int] = None
    producto_educativo_id: Optional[int] = None

class CertificadoCreate(BaseModel):
    inscripcion_id: Optional[int] = None
    docente_id: Optional[int] = None
    producto_educativo_id: Optional[int] = None
    con_competencias: bool = False

class CertificadoInDB(CertificadoBase):
    id: int
    inscripcion: Optional['Inscripcion'] = None
    docente: Optional['DocenteDTO'] = None

    model_config = ConfigDict(from_attributes=True)

class CertificadoPublic(BaseModel):
    folio: str
    fecha_emision: datetime
    nombre_participante: str
    nombre_producto: str
    horas: int
    nombre_docente: str

class EmisionMasivaResponse(BaseModel):
    success: list[dict]
    errors: list[dict]

# La llamada a model_rebuild() se ha movido a schemas/__init__.py