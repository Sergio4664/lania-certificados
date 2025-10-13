from sqlalchemy import Column, Integer, String, Date, Text, Enum
from sqlalchemy.orm import relationship
from app.database import Base
from .enums import TipoProductoEnum, ModalidadEnum # Importar los enums

class ProductoEducativo(Base):
    __tablename__ = "productos_educativos"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(255), nullable=False)
    horas = Column(Integer, nullable=False)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    tipo_producto = Column(Enum(TipoProductoEnum), nullable=True)
    modalidad = Column(Enum(ModalidadEnum), nullable=True)
    competencias = Column(Text, nullable=True)

    docentes = relationship(
        "Docente",
        secondary="productos_educativos_docentes",
        back_populates="productos_educativos"
    )
    inscripciones = relationship("Inscripcion", back_populates="producto_educativo")
