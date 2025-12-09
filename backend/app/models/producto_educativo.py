# --- ✅ CAMBIO 1: Importar Boolean ---
from sqlalchemy import Column, Integer, String, Date, Text, Enum, Boolean
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

    # --- ✅ CAMBIO 2: Añadir esta columna ---
    # Por defecto, todos los nuevos registros estarán activos (True)
    is_active = Column(Boolean, default=True, nullable=False)
    # --- FIN DEL CAMBIO ---

    docentes = relationship(
        "Docente",
        secondary="productos_educativos_docentes",
        back_populates="productos_educativos"
    )
    
    # Esta relación se queda exactamente como la tenías
    inscripciones = relationship("Inscripcion", back_populates="producto_educativo")