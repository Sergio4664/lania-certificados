# backend/app/schemas/docente.py
from pydantic import BaseModel, EmailStr, validator
from datetime import datetime
from typing import Optional

class DocenteBase(BaseModel):
    full_name: str
    email: EmailStr
    telefono: Optional[str] = None
    especialidad: Optional[str] = None

    @validator('email')
    def validate_email_domain(cls, v):
        if not v.endswith('@lania.edu.mx'):
            raise ValueError('El correo debe tener el dominio @lania.edu.mx')
        return v

class DocenteCreate(DocenteBase):
    telefono: str

class DocenteUpdate(BaseModel):
    """Schema para actualizar un docente (todos los campos opcionales)"""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    especialidad: Optional[str] = None
    is_active: Optional[bool] = None

    @validator('email')
    def validate_email_domain_optional(cls, v):
        if v and not v.endswith('@lania.edu.mx'):
            raise ValueError('El correo debe tener el dominio @lania.edu.mx')
        return v

class DocenteOut(DocenteBase):
    """Schema para respuesta con los datos del docente"""
    id: int
    is_active: bool
    fecha_registro: datetime

    class Config:
        from_attributes = True