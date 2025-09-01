# backend/app/models/course.py
from sqlalchemy import Column, BigInteger, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Course(Base):
    __tablename__ = "course"

    id = Column(BigInteger, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    hours = Column(BigInteger, nullable=False)

    created_by = Column(BigInteger, ForeignKey("app_user.id"))
    creator = relationship("User", back_populates="courses")

    # relaciones
    certificates = relationship("Certificate", back_populates="course", cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    
    # Relación many-to-many con Docente
    docentes = relationship(
        "Docente",
        secondary="course_docentes",
        back_populates="courses"
    )