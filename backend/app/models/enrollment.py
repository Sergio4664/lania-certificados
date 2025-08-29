from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Enrollment(Base):
    __tablename__ = "enrollment"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("course.id"))
    participant_id = Column(Integer, ForeignKey("participant.id"))

    # relaciones
    course = relationship("Course", back_populates="enrollments")
    participant = relationship("Participant", back_populates="enrollments")
