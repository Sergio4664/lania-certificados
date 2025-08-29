from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class Participant(Base):
    __tablename__ = "participant"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    # relaciones
    enrollments = relationship("Enrollment", back_populates="participant", cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="participant", cascade="all, delete-orphan")
