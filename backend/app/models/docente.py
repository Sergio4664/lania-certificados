# backend/app/models/docente.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Docente(Base):
    __tablename__ = "docentes"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    telefono = Column(String(20), nullable=True)
    especialidad = Column(String(150), nullable=True)
    fecha_registro = Column(DateTime, default=func.now())
    is_active = Column(Boolean, default=True)
    password = Column(String(250), nullable=True)
    user_id = Column(Integer, nullable=True)
    
    # Relación many-to-many con Course
    courses = relationship(
        "Course",
        secondary="course_docentes",
        back_populates="docentes"
    )