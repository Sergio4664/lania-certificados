from pydantic import BaseModel, EmailStr
from typing import Optional

# Propiedades compartidas
class ParticipanteBase(BaseModel):
    nombre_completo: str
    email_personal: EmailStr
    email_institucional: Optional[EmailStr] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None

# Propiedades para la creación
class ParticipanteCreate(ParticipanteBase):
    pass

# Propiedades para la actualización
class ParticipanteUpdate(ParticipanteBase):
    nombre_completo: Optional[str] = None
    email_personal: Optional[EmailStr] = None

# Propiedades que se devuelven desde la API
class Participante(ParticipanteBase):
    id: int

    class Config:
        from_attributes = True