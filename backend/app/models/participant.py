# backend/app/models/participant.py
from sqlalchemy import Column, BigInteger, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class Participant(Base):
    __tablename__ = "participant"

    id = Column(BigInteger, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    personal_email = Column(String, unique=True)
    institutional_email = Column(String(150), unique=True, index=True, nullable=False)
    telefono = Column(String(20), nullable=True)
    whatsapp = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    # relaciones
    enrollments = relationship("Enrollment", back_populates="participant", cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="participant", cascade="all, delete-orphan")