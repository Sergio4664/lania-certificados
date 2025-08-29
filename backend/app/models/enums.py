# backend/app/models/enums.py
from enum import Enum as PyEnum
from app.database import Base 
from sqlalchemy.orm import declarative_base
from sqlalchemy import MetaData

Base = declarative_base(metadata=MetaData())

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