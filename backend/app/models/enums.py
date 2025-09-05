# backend/app/models/enums.py
from enum import Enum as PyEnum


class CertificateStatus(str, PyEnum):
    EN_PROCESO = "EN_PROCESO"
    FALTA_TAREAS = "FALTA_TAREAS"
    NO_CONCLUYO = "NO_CONCLUYO"
    LISTO_PARA_DESCARGAR = "LISTO_PARA_DESCARGAR"
    REVOCADO = "REVOCADO"

class CertificateKind(str, PyEnum):
    PARTICIPANTE = "PARTICIPANTE"  # Para píldoras educativas
    PONENTE = "PONENTE"           # Para conferencias

class CourseType(str, PyEnum):
    PILDORA_EDUCATIVA = "PILDORA_EDUCATIVA"
    INYECCION_EDUCATIVA = "INYECCION_EDUCATIVA"
    CURSO_EDUCATIVO = "CURSO_EDUCATIVO"

class CourseModality(str, PyEnum):
    REMOTA = "REMOTA"
    PRESENCIAL = "PRESENCIAL"
    HIBRIDA = "HIBRIDA"