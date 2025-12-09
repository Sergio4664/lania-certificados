# backend/app/models/__init__.py
# Este archivo importa todos los modelos para que SQLAlchemy los reconozca.

from .administradores import Administrador
from .docente import Docente
from .participante import Participante
from .producto_educativo import ProductoEducativo
from .inscripciones import Inscripcion
from .certificado import Certificado
from .association_tables import productos_educativos_docentes
from .token_restablecimiento import TokenRestablecimientoPassword

# Opcional: __all__ para definir qué se exporta del módulo
__all__ = [
    "Administrador",
    "Docente",
    "Participante",
    "ProductoEducativo",
    "Inscripcion",
    "Certificado",
    "productos_educativos_docentes",
    "token_restablecimiento",
]