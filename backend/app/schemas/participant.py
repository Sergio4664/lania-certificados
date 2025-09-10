# backend/app/schemas/participant.py
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class ParticipantBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: str

class ParticipantCreate(ParticipantBase):
    """Schema para crear un participante"""
    pass

class ParticipantUpdate(BaseModel):
    """Schema para actualizar un participante (todos los campos opcionales)"""
    email: EmailStr
    full_name: str
    phone: str

class ParticipantOut(ParticipantBase):
    """Schema para respuesta con los datos del participante"""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True