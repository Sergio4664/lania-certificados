# backend/app/schemas/docente.py
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from typing import List, Optional, TYPE_CHECKING
import re

if TYPE_CHECKING:
    # Asegúrese de que esta importación sea correcta según su estructura de archivos
    from .producto_educativo import ProductoEducativo

# Lista de dominios de correo permitidos
ALLOWED_EMAIL_DOMAINS = [
    "@gmail.com",
    "@hotmail.com",
    "@outlook.com",
    "@lania.edu.mx",
    # Añada aquí otros dominios si es necesario
]

# --- 1. ESQUEMA BASE (NO CONTIENE VALIDACIÓN) ---
class DocenteBase(BaseModel):
    nombre_completo: str
    especialidad: Optional[str] = None
    email_personal: EmailStr
    email_institucional: Optional[EmailStr] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None


# --- 2. MIXIN CON LA LÓGICA DE VALIDACIÓN (SOLO PARA ENTRADA) ---
class DocenteValidation(BaseModel):
    """Contiene los validadores de dominio y longitud que solo se aplicarán a los inputs."""
    
    # ✅ LÍNEA CRÍTICA: Desactiva la verificación de campos para que el Mixin funcione
    model_config = ConfigDict(check_fields=False) 
    
    # VALIDACIÓN DE DOMINIOS DE CORREO
    # CORRECCIÓN: Se añade 'check_fields=False' aquí para evitar PydanticUserError.
    @field_validator('email_personal', 'email_institucional', check_fields=False)
    @classmethod
    def validate_email_domain(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        
        if not any(v.lower().endswith(domain) for domain in ALLOWED_EMAIL_DOMAINS):
            allowed_str = ", ".join(ALLOWED_EMAIL_DOMAINS)
            raise ValueError(
                f"El dominio del correo electrónico no está permitido. Dominios válidos: {allowed_str}"
            )
        return v

    # VALIDACIÓN DE TELÉFONO Y WHATSAPP (Mínimo 10, Máximo 14)
    # CORRECCIÓN: Se añade 'check_fields=False' aquí para evitar PydanticUserError.
    @field_validator('telefono', 'whatsapp', mode='before', check_fields=False)
    @classmethod
    def validate_phone_number_length(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        
        # Limpiar el número de cualquier carácter no numérico
        cleaned_number = re.sub(r'[^0-9]', '', v)
        length = len(cleaned_number)
        
        if length < 10:
            raise ValueError(
                "El número de teléfono o WhatsApp debe tener un mínimo de 10 dígitos."
            )
        if length > 14:
            raise ValueError(
                "El número de teléfono o WhatsApp debe tener un máximo de 14 dígitos."
            )
            
        return cleaned_number


# --- 3. ESQUEMAS DE ENTRADA (APLICAN VALIDACIÓN) ---

class DocenteCreate(DocenteBase, DocenteValidation):
    """Hereda los campos de DocenteBase y los validadores de DocenteValidation."""
    pass

class DocenteUpdate(DocenteValidation):
    """Hereda los validadores de DocenteValidation y define campos opcionales para la actualización."""
    nombre_completo: Optional[str] = None
    especialidad: Optional[str] = None
    email_personal: Optional[EmailStr] = None
    email_institucional: Optional[EmailStr] = None
    telefono: Optional[str] = None
    whatsapp: Optional[str] = None


# --- 4. ESQUEMAS DE SALIDA (NO APLICAN VALIDACIÓN) ---

class DocenteOut(DocenteBase):
    """Usado para mostrar datos que salen de la DB. Hereda DocenteBase (sin validadores)."""
    id: int
    model_config = ConfigDict(from_attributes=True)

# Esquema completo con relaciones
class Docente(DocenteOut):
    """Usado para mostrar datos con relaciones. Hereda DocenteOut (sin validadores)."""
    productos_educativos: List['ProductoEducativo'] = []
    model_config = ConfigDict(from_attributes=True)