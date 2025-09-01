# backend/app/models/association_tables.py
from sqlalchemy import Table, Column, Integer, ForeignKey
from app.database import Base

# Tabla de asociación para many-to-many entre Course y Docente
# Coincide exactamente con la estructura de PostgreSQL
course_docente_association = Table(
    'course_docentes',
    Base.metadata,
    Column('course_id', Integer, ForeignKey('course.id', ondelete='CASCADE'), primary_key=True),
    Column('docente_id', Integer, ForeignKey('docentes.id', ondelete='CASCADE'), primary_key=True)
)