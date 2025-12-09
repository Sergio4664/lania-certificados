# backend/app/schemas/__init__.py

# 1. Importar todos los esquemas involucrados en el ciclo de dependencias

from .producto_educativo import (
    ProductoEducativo,
    ProductoEducativoOut,
    ProductoEducativoWithDetails  # 💡 Faltaba importar esta clase
)
from .docente import (
    Docente, 
    DocenteOut
)
from .inscripcion import (
    Inscripcion, 
    InscripcionOut
)
from .certificado import (
    Certificado, 
    CertificadoOut
)
from .participante import (
    Participante, 
    ParticipanteOut  # 💡 Faltaba importar esta clase
)

# (Importamos los otros esquemas también para ser consistentes)
from . import administrador
from . import auth


# 2. Reconstruir TODOS los modelos que usan referencias de texto (comillas)
#    para resolver las dependencias circulares.

# --- De producto_educativo.py ---
ProductoEducativo.model_rebuild()
ProductoEducativoOut.model_rebuild()
ProductoEducativoWithDetails.model_rebuild()  # 💡 Faltaba esta llamada

# --- De docente.py ---
Docente.model_rebuild()
DocenteOut.model_rebuild()

# --- De inscripcion.py ---
Inscripcion.model_rebuild()
InscripcionOut.model_rebuild()

# --- De certificado.py ---
Certificado.model_rebuild()
CertificadoOut.model_rebuild()

# --- De participante.py ---
Participante.model_rebuild()
ParticipanteOut.model_rebuild()  # 💡 Faltaba esta llamada