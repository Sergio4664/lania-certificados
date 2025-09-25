# backend/app/schemas/docente.py
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional

# --- Esquema Base ---
# Contiene los campos comunes para todos los demás esquemas.
class DocenteBase(BaseModel):
    especialidad: str
    full_name: str
    institutional_email: EmailStr
    personal_email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None
    is_active: bool = True

# --- Esquema para la Creación ---
# Hereda de DocenteBase. No necesita cambios.
class DocenteCreate(DocenteBase):
    pass # telefono es opcional en la base, por lo que no es necesario re-declararlo aquí.

# --- Esquema para la Actualización ---
# Todos los campos son opcionales para permitir actualizaciones parciales.
class DocenteUpdate(BaseModel):
    especialidad: Optional[str] = None
    full_name: Optional[str] = None
    institutional_email: Optional[EmailStr] = None
    personal_email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None
    is_active: Optional[bool] = None

    # CORRECCIÓN: Se usa 'field_validator' en Pydantic v2
    @field_validator('institutional_email')
    @classmethod
    def validate_email_domain_optional(cls, v):
        if v and not v.endswith('@lania.edu.mx'):
            raise ValueError('El correo institucional debe tener el dominio @lania.edu.mx')
        return v

# --- Esquema para la Salida (Respuesta de la API) ---
# Hereda de DocenteBase y añade los campos que genera la base de datos.
class DocenteOut(DocenteBase):
    id: int
    fecha_registro: datetime

    class Config:
        # CORRECCIÓN: 'orm_mode' se renombra a 'from_attributes' en Pydantic v2
        from_attributes = True