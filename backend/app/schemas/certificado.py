# backend/app/schemas/certificado.py
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .inscripcion import Inscripcion
    from .docente import DocenteOut

class CertificadoBase(BaseModel):
    # ... campos base ...
    folio: str
    fecha_emision: datetime
    archivo_path: Optional[str] = None
    inscripcion_id: Optional[int] = None
    docente_id: Optional[int] = None
    producto_educativo_id: Optional[int] = None

class CertificadoCreate(BaseModel):
    # ... campos de creación ...
    inscripcion_id: Optional[int] = None
    docente_id: Optional[int] = None
    producto_educativo_id: Optional[int] = None
    con_competencias: bool = False

class Certificado(CertificadoBase):
    id: int
    
    # --- ✅ CORRECCIÓN CRÍTICA ---
    # Ambas relaciones deben ser referencias a futuro
    inscripcion: Optional['Inscripcion'] = None
    docente: Optional['DocenteOut'] = None

    model_config = ConfigDict(from_attributes=True)

# ... resto de esquemas (CertificadoPublic, etc.)
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