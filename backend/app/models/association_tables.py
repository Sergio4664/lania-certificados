# backend/app/models/association_tables.py
from sqlalchemy import Table, Column, Integer, ForeignKey
from app.database import Base

productos_educativos_docentes = Table(
    'productos_educativos_docentes', Base.metadata,
    Column('producto_educativo_id', Integer, ForeignKey('productos_educativos.id'), primary_key=True),
    Column('docente_id', Integer, ForeignKey('docentes.id'), primary_key=True)
)