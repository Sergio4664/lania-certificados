# backend/app/schemas/certificado.py
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .inscripcion import InscripcionOut # ✅ Usar el esquema sin ciclo
    from .docente import DocenteOut
    from .producto_educativo import ProductoEducativoOut # ✅ Usar el esquema sin ciclo

class CertificadoBase(BaseModel):
    folio: str
    fecha_emision: datetime
    archivo_path: Optional[str] = None

    # Añadimos los IDs base para que estén disponibles
    inscripcion_id: Optional[int] = None
    docente_id: Optional[int] = None
    producto_educativo_id: Optional[int] = None

# --- ✅ SOLUCIÓN: Esquema de salida sin recursión ---
# Este es el esquema que usaremos en las listas para evitar ciclos
class CertificadoOut(CertificadoBase):
    id: int
    folio: str
    fecha_emision: datetime
    model_config = ConfigDict(from_attributes=True)

# Esquema completo para cuando necesites todos los detalles
class Certificado(CertificadoBase):
    id: int
    inscripcion: Optional['InscripcionOut'] = None
    docente: Optional['DocenteOut'] = None
    producto_educativo: 'ProductoEducativoOut'

    model_config = ConfigDict(from_attributes=True)

# ... resto de esquemas (Create, Public, etc.)
class CertificadoCreate(BaseModel):
    inscripcion_id: Optional[int] = None
    docente_id: Optional[int] = None
    producto_educativo_id: Optional[int] = None
    con_competencias: bool = False

class CertificadoPublic(BaseModel):
    folio: str
    fecha_emision: datetime
    
    # --- INICIO DE CORRECCIÓN ---
    participante_nombre: str       # <-- Debe coincidir con el frontend
    producto_educativo_nombre: str  # <-- CAMBIADO de 'producto_nombre'
    tipo_producto: str              # <-- AÑADIDO
    # --- FIN DE CORRECCIÓN ---
    
    model_config = ConfigDict(from_attributes=True)
    
class EmisionMasivaResponse(BaseModel):
    success: list[dict]
    errors: list[dict]

class Config:
    from_attributes = True