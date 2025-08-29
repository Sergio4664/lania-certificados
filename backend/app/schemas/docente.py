# backend/app/schemas/docente.py
from pydantic import BaseModel, EmailStr, root_validator
from datetime import datetime
from typing import Optional

class DocenteBase(BaseModel):
    full_name: str
    email: EmailStr
    telefono: Optional[str] = None
    especialidad: Optional[str] = None

class DocenteCreate(DocenteBase):
    nombre_completo: Optional[str] = None

    @root_validator(pre=True)
    def split_nombre_completo(cls, values):
        nombre_completo = values.get("nombre_completo")
        if nombre_completo and (not values.get("nombre") or not values.get("apellidos")):
            partes = nombre_completo.strip().split(" ", 1)
            values["nombre"] = partes[0]
            values["apellidos"] = partes[1] if len(partes) > 1 else ""
        return values

class DocenteUpdate(BaseModel):
    """Schema para actualizar un docente (todos los campos opcionales)"""
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    especialidad: Optional[str] = None
    is_active: Optional[bool] = None

class DocenteInfo(BaseModel):
    """Información básica del docente para mostrar en los cursos"""
    id: int
    nombre: str
    apellidos: str
    email: str
    especialidad: Optional[str] = None
    
    @property
    def full_name(self) -> str:
        return f"{self.nombre} {self.apellidos}"

class DocenteOut(DocenteBase):
    """Schema para respuesta con los datos del docente"""
    id: int
    is_active: bool
    fecha_registro: datetime
    
    @property 
    def full_name(self) -> str:
        return f"{self.nombre} {self.apellidos}"

    class Config:
        from_attributes = True