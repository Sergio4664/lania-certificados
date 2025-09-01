# backend/app/schemas/docente.py
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class DocenteBase(BaseModel):
    full_name: str
    email: EmailStr
    telefono: Optional[str] = None
    especialidad: Optional[str] = None

class DocenteCreate(DocenteBase):
    password: Optional[str] = None

class DocenteUpdate(BaseModel):
    """Schema para actualizar un docente (todos los campos opcionales)"""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    especialidad: Optional[str] = None
    is_active: Optional[bool] = None

class DocenteOut(DocenteBase):
    """Schema para respuesta con los datos del docente"""
    id: int
    is_active: bool
    fecha_registro: datetime

    class Config:
        from_attributes = True