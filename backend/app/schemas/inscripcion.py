# backend/app/schemas/inscripcion.py
from pydantic import BaseModel, ConfigDict
from typing import Optional, TYPE_CHECKING

# Importa los nuevos esquemas de salida que no tienen ciclos
if TYPE_CHECKING:
    from .participante import Participante
    from .producto_educativo import ProductoEducativoOut # ✅ Usar el esquema sin ciclo
    from .certificado import CertificadoOut # ✅ Usar un esquema simple para certificado

class InscripcionBase(BaseModel):
    participante_id: int
    producto_educativo_id: int

class InscripcionCreate(InscripcionBase):
    pass

# --- ✅ SOLUCIÓN: Esquema de salida sin recursión ---
class InscripcionOut(InscripcionBase):
    id: int
    participante: 'Participante'
    # Usamos el esquema 'ProductoEducativoOut' que no tiene la lista de inscripciones
    producto_educativo: 'ProductoEducativoOut'
    # Usamos un esquema simple 'CertificadoOut' que no vuelve a anidar la inscripción
    certificados: list['CertificadoOut'] = []
    model_config = ConfigDict(from_attributes=True)

# Esquema completo para vistas de detalle si fuera necesario
class Inscripcion(InscripcionBase):
    id: int
    
    participante: 'Participante'
    producto_educativo: 'ProductoEducativoOut' # Mantenemos el seguro aquí también
    certificados: list['CertificadoOut'] = []


    model_config = ConfigDict(from_attributes=True)