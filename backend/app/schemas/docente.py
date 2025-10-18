from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional

# Propiedades compartidas
class DocenteBase(BaseModel):
    nombre_completo: str
    email_institucional: EmailStr
    email_personal: Optional[EmailStr] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None
    especialidad: Optional[str] = None

    @field_validator('email_institucional')
    @classmethod
    def validate_email_domain(cls, v):
        if not v.endswith('@lania.edu.mx'):
            raise ValueError('El correo institucional debe tener el dominio @lania.edu.mx')
        return v

# Propiedades para la creación
class DocenteCreate(DocenteBase):
    pass

# Propiedades para la actualización
class DocenteUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    email_institucional: Optional[EmailStr] = None
    email_personal: Optional[EmailStr] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None
    especialidad: Optional[str] = None

    @field_validator('email_institucional')
    @classmethod
    def validate_email_domain_optional(cls, v):
        if v and not v.endswith('@lania.edu.mx'):
            raise ValueError('El correo institucional debe tener el dominio @lania.edu.mx')
        return v

# --- Esquema para la Salida (Respuesta de la API) ---
# Hereda de DocenteBase y añade los campos que genera la base de datos.
class DocenteOut(DocenteBase):
    id: int

class DocenteCertificadoCreate(BaseModel):
    producto_id: int
    docente_id: int

    class Config:
        # CORRECCIÓN: 'orm_mode' se renombra a 'from_attributes' en Pydantic v2
        from_attributes = True