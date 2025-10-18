# backend/app/models/certificado.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.database import Base

class Certificado(Base):
    __tablename__ = "certificados"

    id = Column(Integer, primary_key=True)
    folio = Column(String, unique=True, index=True, default=lambda: f"LANIA-2025-{uuid.uuid4().hex[:8].upper()}")
    fecha_emision = Column(DateTime(timezone=True), server_default=func.now())
    archivo_path = Column(String)

    # --- Foreign Keys ---
    inscripcion_id = Column(Integer, ForeignKey("inscripciones.id"), nullable=True)
    docente_id = Column(Integer, ForeignKey("docentes.id"), nullable=True)
    producto_educativo_id = Column(Integer, ForeignKey("productos_educativos.id"), nullable=False)

    # --- ✅ CORRECTION: ADD THE RELATIONSHIPS ---
    # These lines tell SQLAlchemy how to connect this model to others.
    inscripcion = relationship("Inscripcion", back_populates="certificados")
    docente = relationship("Docente", back_populates="certificados")
    producto_educativo = relationship("ProductoEducativo")