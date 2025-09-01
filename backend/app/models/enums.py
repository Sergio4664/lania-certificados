# backend/app/models/enums.py
from enum import Enum as PyEnum

class CertificateStatus(str, PyEnum):
    EN_PROCESO = "EN_PROCESO"
    FALTA_TAREAS = "FALTA_TAREAS"
    NO_CONCLUYO = "NO_CONCLUYO"
    LISTO_PARA_DESCARGAR = "LISTO_PARA_DESCARGAR"
    REVOCADO = "REVOCADO"

class CertificateKind(str, PyEnum):
    ASISTENCIA = "ASISTENCIA"
    APROBACION = "APROBACION" 
    PARTICIPACION = "PARTICIPACION"
    DIPLOMADO = "DIPLOMADO"
    TALLER = "TALLER"