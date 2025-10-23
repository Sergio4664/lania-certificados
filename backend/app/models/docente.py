#Ruta: backend/app/models/docente.py
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import CITEXT
from app.database import Base

class Docente(Base):
    __tablename__ = "docentes"

    id = Column(Integer, primary_key=True)
    nombre_completo = Column(String(255), nullable=False)
    email_institucional = Column(CITEXT, unique=True, nullable=False)

    # CORRECCIÓN: Añadir unique=True a estos campos
    email_personal = Column(CITEXT, unique=True, nullable=True)
    telefono = Column(String(20), unique=True, nullable=True)
    whatsapp = Column(String(20), unique=True, nullable=True)

    especialidad = Column(String(255), nullable=True)

    productos_educativos = relationship(
        "ProductoEducativo",
        secondary="productos_educativos_docentes",
        back_populates="docentes"
    )

    # --- ✅ CORRECCIÓN AQUÍ ---
    # Se añade la relación inversa para que SQLAlchemy pueda encontrar los certificados de un docente.
    certificados = relationship("Certificado", back_populates="docente")
    
