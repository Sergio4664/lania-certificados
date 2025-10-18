# backend/app/schemas/__init__.py

# 1. Importar todos los esquemas que se usan en las referencias a futuro.
from .docente import Docente, DocenteOut
from .participante import Participante
from .producto_educativo import ProductoEducativo
from .certificado import Certificado
from .inscripcion import Inscripcion

# 2. Reconstruir los modelos para resolver las referencias.
# Esto conecta los strings (ej. 'DocenteOut') con las clases reales.
Docente.model_rebuild()
ProductoEducativo.model_rebuild()
Inscripcion.model_rebuild()
Certificado.model_rebuild()