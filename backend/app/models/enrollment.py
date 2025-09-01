# backend/app/models/enrollment.py
from sqlalchemy import Column, BigInteger, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Enrollment(Base):
    __tablename__ = "enrollment"

    id = Column(BigInteger, primary_key=True, index=True)
    course_id = Column(BigInteger, ForeignKey("course.id"))
    participant_id = Column(BigInteger, ForeignKey("participant.id"))

    # relaciones
    course = relationship("Course", back_populates="enrollments")
    participant = relationship("Participant", back_populates="enrollments")