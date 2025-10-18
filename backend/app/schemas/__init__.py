# backend/app/schemas/__init__.py

# 1. Importar TODOS los esquemas que se usan en las referencias a futuro.
# Esto los pone en el mismo "ámbito" para que Pydantic los encuentre.
from .docente import Docente
from .participante import Participante
from .producto_educativo import ProductoEducativo
from .certificado import CertificadoInDB
from .inscripcion import Inscripcion

# 2. Reconstruir los modelos que contienen las referencias.
# El orden aquí ya no es tan crítico porque todos los nombres ya fueron importados.
Docente.model_rebuild()
ProductoEducativo.model_rebuild()
Inscripcion.model_rebuild()
CertificadoInDB.model_rebuild()
Participante.model_rebuild()