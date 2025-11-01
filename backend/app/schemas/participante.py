from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .inscripcion import InscripcionOut # Asume que tienes un InscripcionOut
    from .certificado import CertificadoOut # Asume que tienes un CertificadoOut

class ParticipanteBase(BaseModel):
    nombre_completo: str
    email_personal: EmailStr
    email_institucional: Optional[EmailStr] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None

class ParticipanteCreate(ParticipanteBase):
    pass

class ParticipanteUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    email_personal: Optional[EmailStr] = None
    email_institucional: Optional[EmailStr] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None

class Participante(ParticipanteBase):
    id: int
    inscripciones: List['InscripcionOut'] = []
    certificados: List['CertificadoOut'] = []
    model_config = ConfigDict(from_attributes=True)

# --- 💡 INICIO DE LA CORRECCIÓN ---
#
# Añadimos la clase 'ParticipanteOut' que faltaba.
# Esta es la versión "simple" que otros esquemas (como InscripcionOut)
# pueden importar de forma segura sin crear un ciclo de dependencia.
#
class ParticipanteOut(ParticipanteBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
# --- 💡 FIN DE LA CORRECCIÓN ---

class Config:
    from_attributes = True