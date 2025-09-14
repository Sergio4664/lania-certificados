# backend/app/models/certificate.py
from sqlalchemy import Column, BigInteger, String, ForeignKey, DateTime, LargeBinary, Enum, Boolean
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class Certificate(Base):
    __tablename__ = "certificate"

    id = Column(BigInteger, primary_key=True, index=True)
    course_id = Column(BigInteger, ForeignKey("course.id"), nullable=False)
    participant_id = Column(BigInteger, ForeignKey("participant.id"), nullable=False)

    kind = Column(String, nullable=False)
    status = Column(String, nullable=False, default="EN_PROCESO")
    serial = Column(String, unique=True, nullable=False)
    qr_token = Column(String, unique=True, nullable=False)
    pdf_path = Column(String)
    issued_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow)
    pdf_content = Column(LargeBinary)
    include_competencias = Column(Boolean, default=False, nullable=False)

    # relaciones
    course = relationship("Course", back_populates="certificates")
    participant = relationship("Participant", back_populates="certificates")