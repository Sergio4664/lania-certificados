from pydantic import BaseModel
from datetime import date

# Importamos los schemas que se anidarán para respuestas completas
from .participante import Participante
from .producto_educativo import ProductoEducativo

# Propiedades compartidas
class InscripcionBase(BaseModel):
    participante_id: int
    producto_educativo_id: int

# Propiedades para la creación
class InscripcionCreate(InscripcionBase):
    pass

# Propiedades que se devuelven desde la API
class Inscripcion(InscripcionBase):
    id: int
    fecha_inscripcion: date
    participante: Participante
    # Omitimos el producto educativo aquí para no crear una respuesta demasiado grande por defecto
    # Si se necesita, se puede crear un schema específico que lo incluya

    class Config:
        from_attributes = True

# Un schema más detallado para cuando se necesite toda la información
class InscripcionDetallada(Inscripcion):
    producto_educativo: ProductoEducativo