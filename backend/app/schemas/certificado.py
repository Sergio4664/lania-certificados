from pydantic import BaseModel
from datetime import date
from typing import Optional

# Propiedades compartidas
class CertificadoBase(BaseModel):
    inscripcion_id: int
    folio: str
    fecha_emision: date

# Propiedades para la creación
class CertificadoCreate(CertificadoBase):
    pass

# Propiedades para la actualización (por si se necesita cambiar algo en el futuro)
class CertificadoUpdate(BaseModel):
    folio: Optional[str] = None
    fecha_emision: Optional[date] = None
    url_validacion: Optional[str] = None

# Propiedades que se devuelven desde la API
class Certificado(CertificadoBase):
    id: int
    url_validacion: Optional[str] = None

    class Config:
        from_attributes = True

# Schema especial para la página de verificación pública
class CertificadoPublic(BaseModel):
    folio: str
    fecha_emision: date
    nombre_participante: str
    nombre_producto: str
    horas: int
    nombre_docente: str # Se concatenarán los nombres de los docentes aquí