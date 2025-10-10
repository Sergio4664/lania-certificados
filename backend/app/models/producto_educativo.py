# backend/app/models/producto_educativo.py
from sqlalchemy import Column, Integer, String, Date
from sqlalchemy.orm import relationship
from app.database import Base

class ProductoEducativo(Base):
    __tablename__ = "productos_educativos"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(255), nullable=False)
    horas = Column(Integer, nullable=False)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)

    # Relación con la tabla de asociación
    docentes = relationship(
        "Docente",
        secondary="productos_educativos_docentes",
        back_populates="productos_educativos"
    )
    # Relación con inscripciones
    inscripciones = relationship("Inscripcion", back_populates="producto_educativo")