# backend/app/schemas/__init__.py

# 1. Importar todos los esquemas que tienen dependencias
from .docente import Docente, DocenteOut
from .participante import Participante
from .producto_educativo import ProductoEducativo
from .certificado import CertificadoInDB
from .inscripcion import Inscripcion

# 2. Reconstruir los modelos en el orden de dependencia
# (los que son necesitados por otros van primero)
Inscripcion.model_rebuild()
ProductoEducativo.model_rebuild()
CertificadoInDB.model_rebuild()