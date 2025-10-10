# backend/app/models/participante.py
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import CITEXT
from app.database import Base

class Participante(Base):
    __tablename__ = "participantes"

    id = Column(Integer, primary_key=True)
    nombre_completo = Column(String(255), nullable=False)
    email_personal = Column(CITEXT, unique=True, nullable=False)
    email_institucional = Column(CITEXT, nullable=True)
    telefono = Column(String(20), nullable=True)
    whatsapp = Column(String(20), nullable=True)

    # Relación con inscripciones
    inscripciones = relationship("Inscripcion", back_populates="participante")