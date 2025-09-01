# backend/app/models/__init__.py
# Importar todas las tablas en orden correcto para evitar problemas de dependencias
from .user import User
from .docente import Docente
from .association_tables import course_docente_association
from .course import Course
from .participant import Participant
from .enrollment import Enrollment
from .certificate import Certificate

# Asegurar que todas las relaciones se configuren correctamente
__all__ = [
    "User", 
    "Docente", 
    "Course", 
    "Participant", 
    "Enrollment",
    "Certificate",
    "course_docente_association"
]