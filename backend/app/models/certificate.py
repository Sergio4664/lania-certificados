# backend/app/models/certificate.py
from sqlalchemy import Column, BigInteger, String, ForeignKey, DateTime, LargeBinary, Enum
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
from app.models.enums import CertificateStatus, CertificateKind


class Certificate(Base):
    __tablename__ = "certificate"

    id = Column(BigInteger, primary_key=True, index=True)
    course_id = Column(BigInteger, ForeignKey("course.id"), nullable=False)
    participant_id = Column(BigInteger, ForeignKey("participant.id"), nullable=False)

    kind = Column(Enum(CertificateKind), nullable=False)
    status = Column(Enum(CertificateStatus), nullable=False, default=CertificateStatus.EN_PROCESO)
    serial = Column(String, unique=True, nullable=False)
    qr_token = Column(String, unique=True, nullable=False)
    pdf_path = Column(String)
    issued_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow)
    pdf_content = Column(LargeBinary)

    # relaciones
    course = relationship("Course", back_populates="certificates")
    participant = relationship("Participant", back_populates="certificates")