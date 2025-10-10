# backend/app/models/user.py
from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "app_user"

    id = Column(BigInteger, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    hashed_password = Column(Text, nullable=False) 
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.DOCENTE)

    reset_password_token = Column(String, nullable=True)
    reset_password_expires_at = Column(DateTime, nullable=True)
    # relaciones
    courses = relationship("Course", back_populates="creator")