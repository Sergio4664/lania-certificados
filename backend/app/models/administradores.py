# backend/app/models/administradores.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import CITEXT
from app.database import Base

class Administrador(Base):
    __tablename__ = "administradores"

    id = Column(Integer, primary_key=True)
    nombre_completo = Column(String(255), nullable=False)
    email_institucional = Column(CITEXT, unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    telefono = Column(String(20), nullable=True)
    whatsapp = Column(String(20), nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)