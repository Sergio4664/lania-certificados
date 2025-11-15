from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .inscripcion import InscripcionOut
    from .docente import DocenteOut
    from .producto_educativo import ProductoEducativoOut

class CertificadoBase(BaseModel):
    folio: str
    fecha_emision: datetime
    archivo_path: Optional[str] = None

    inscripcion_id: Optional[int] = None
    docente_id: Optional[int] = None
    producto_educativo_id: Optional[int] = None
    
    # ✅ CORRECCIÓN CRÍTICA: Añadir con_competencias al esquema base
    con_competencias: bool = False

class CertificadoOut(CertificadoBase):
    id: int
    folio: str
    fecha_emision: datetime
    con_competencias: bool = False  # ✅ Asegurar que siempre esté presente
    model_config = ConfigDict(from_attributes=True)

class Certificado(CertificadoBase):
    id: int
    inscripcion: Optional['InscripcionOut'] = None
    docente: Optional['DocenteOut'] = None
    producto_educativo: Optional['ProductoEducativoOut'] = None
    con_competencias: bool = False  # ✅ Asegurar que siempre esté presente

    model_config = ConfigDict(from_attributes=True)

class CertificadoCreate(BaseModel):
    inscripcion_id: Optional[int] = None
    docente_id: Optional[int] = None
    producto_educativo_id: Optional[int] = None
    con_competencias: bool = False

class CertificadoPublic(BaseModel):
    folio: str
    fecha_emision: datetime
    participante_nombre: str
    producto_educativo_nombre: str
    tipo_producto: str
    con_competencias: bool = False  # ✅ Añadir aquí también
    
    model_config = ConfigDict(from_attributes=True)
    
class EmisionMasivaResponse(BaseModel):
    success: list[dict]
    errors: list[dict]

class Config:
    from_attributes = True

