# backend/app/schemas/__init__.py

# 1. Importar todos los esquemas, incluyendo los nuevos 'Out'
from .docente import Docente, DocenteOut
from .participante import Participante
from .producto_educativo import ProductoEducativo, ProductoEducativoOut
from .certificado import Certificado, CertificadoOut
from .inscripcion import Inscripcion, InscripcionOut

# 2. Reconstruir los modelos para resolver las referencias.
Docente.model_rebuild()
DocenteOut.model_rebuild() # ✅ Reconstruir nuevo esquema
ProductoEducativo.model_rebuild()
ProductoEducativoOut.model_rebuild() # ✅ Reconstruir nuevo esquema
Inscripcion.model_rebuild()
InscripcionOut.model_rebuild() # ✅ Reconstruir nuevo esquema
Certificado.model_rebuild()
CertificadoOut.model_rebuild() # ✅ Reconstruir nuevo esquema
Participante.model_rebuild()