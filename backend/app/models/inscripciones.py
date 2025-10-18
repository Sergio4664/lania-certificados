from sqlalchemy import Column, Integer, ForeignKey, Date, func, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class Inscripcion(Base):
    __tablename__ = "inscripciones"
    
    # Agregamos una restricción para que un participante no pueda inscribirse dos veces al mismo producto
    __table_args__ = (
        UniqueConstraint('participante_id', 'producto_educativo_id', name='inscripciones_participante_producto_key'),
    )

    id = Column(Integer, primary_key=True)
    
    # Llave foránea a la nueva tabla 'participantes'
    participante_id = Column(Integer, ForeignKey("participantes.id"), nullable=False)
    
    # Llave foránea a la nueva tabla 'productos_educativos'
    producto_educativo_id = Column(Integer, ForeignKey("productos_educativos.id"), nullable=False)
    
    fecha_inscripcion = Column(Date, server_default=func.now(), nullable=False)

    # Relaciones actualizadas
    participante = relationship("Participante", back_populates="inscripciones")
    producto_educativo = relationship("ProductoEducativo", back_populates="inscripciones")

    # --- ✅ CORRECCIÓN AQUÍ ---
    # Renombramos la relación a plural y nos aseguramos de que coincida con el modelo Certificado.
    certificados = relationship("Certificado", back_populates="inscripcion")