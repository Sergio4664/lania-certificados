# backend/app/models/certificado.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.database import Base

class Certificado(Base):
    __tablename__ = "certificados"

    id = Column(Integer, primary_key=True, index=True)
    folio = Column(String, unique=True, index=True, default=lambda: f"LANIA-2025-{uuid.uuid4().hex[:8].upper()}")
    
    # --- ✅ ESTA LÍNEA ES LA CLAVE ---
    fecha_emision = Column(DateTime(timezone=True), server_default=func.now())
    
    archivo_path = Column(String)

    con_competencias = Column(Boolean, default=False, nullable=False)

    # --- Foreign Keys ---
    inscripcion_id = Column(Integer, ForeignKey("inscripciones.id"), nullable=True)
    docente_id = Column(Integer, ForeignKey("docentes.id"), nullable=True)
    producto_educativo_id = Column(Integer, ForeignKey("productos_educativos.id"), nullable=False)

    # --- Relaciones ---
    inscripcion = relationship("Inscripcion", back_populates="certificados")
    docente = relationship("Docente", back_populates="certificados")
    producto_educativo = relationship("ProductoEducativo")