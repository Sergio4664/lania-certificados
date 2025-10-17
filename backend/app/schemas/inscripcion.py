from pydantic import BaseModel, ConfigDict
from datetime import datetime

# Importa los esquemas que necesitas, pero sin anidarlos directamente
from .participante import Participante
from .producto_educativo import ProductoEducativo

class InscripcionBase(BaseModel):
    producto_educativo_id: int
    participante_id: int

class InscripcionCreate(InscripcionBase):
    pass

# Este es el esquema principal para mostrar las inscripciones
class Inscripcion(InscripcionBase):
    id: int
    fecha_inscripcion: datetime
    
    # Anida los objetos completos aquí
    participante: Participante
    producto_educativo: ProductoEducativo

    # FIX: Reemplaza 'orm_mode' por 'from_attributes' para Pydantic v2
    model_config = ConfigDict(from_attributes=True)