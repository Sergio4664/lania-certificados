# app/schemas/participant.py
from pydantic import BaseModel, EmailStr
from datetime import datetime

class ParticipantBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: str | None = None

class ParticipantCreate(ParticipantBase):
    """Schema para crear un participante"""
    pass

class ParticipantUpdate(BaseModel):
    """Schema para actualizar un participante (todos los campos opcionales)"""
    email: EmailStr | None = None
    full_name: str | None = None
    phone: str | None = None

class ParticipantOut(ParticipantBase):
    """Schema para respuesta con los datos del participante"""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True