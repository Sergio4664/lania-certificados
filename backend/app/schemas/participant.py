# backend/app/schemas/participant.py
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class ParticipantBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None

class ParticipantCreate(ParticipantBase):
    """Schema para crear un participante"""
    pass

class ParticipantUpdate(BaseModel):
    """Schema para actualizar un participante (todos los campos opcionales)"""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None

class ParticipantOut(ParticipantBase):
    """Schema para respuesta con los datos del participante"""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True