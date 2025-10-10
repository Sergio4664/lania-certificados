# backend/app/models/certificado.py
from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Certificado(Base):
    __tablename__ = "certificados"

    id = Column(Integer, primary_key=True)
    inscripcion_id = Column(Integer, ForeignKey("inscripciones.id"), unique=True, nullable=False)
    folio = Column(String(50), unique=True, nullable=False)
    fecha_emision = Column(Date, nullable=False)
    url_validacion = Column(String(255), nullable=True)

    # Relación
    inscripcion = relationship("Inscripcion", back_populates="certificado")