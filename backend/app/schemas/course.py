# backend/app/schemas/course.py
from pydantic import BaseModel, validator
from datetime import date
from typing import Optional, List

class DocenteInfo(BaseModel):
    """Información básica del docente para mostrar en los cursos"""
    id: int
    full_name: str
    email: str

class CourseBase(BaseModel):
    code: str
    name: str
    start_date: date
    end_date: date
    hours: int
    
    @validator('end_date')
    def end_date_must_be_after_start_date(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('La fecha de fin debe ser posterior a la fecha de inicio')
        return v
    
    @validator('hours')
    def hours_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Las horas deben ser un número positivo')
        return v
    
    @validator('code')
    def code_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('El código del curso no puede estar vacío')
        return v.strip().upper()  # Normalizar a mayúsculas
    
    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('El nombre del curso no puede estar vacío')
        return v.strip()

class CourseCreate(CourseBase):
    created_by: int
    docente_ids: Optional[List[int]] = []  # Lista de IDs de docentes asignados

class CourseUpdate(BaseModel):
    name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    hours: int | None = None
    docente_ids: Optional[List[int]] = None
    
    @validator('end_date', always=True)
    def end_date_validation(cls, v, values):
        start_date = values.get('start_date')
        if v is not None and start_date is not None and v < start_date:
            raise ValueError('La fecha de fin debe ser posterior a la fecha de inicio')
        return v
    
    @validator('hours')
    def hours_must_be_positive(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Las horas deben ser un número positivo')
        return v

class CourseOut(CourseBase):
    id: int
    created_by: int
    docentes: Optional[List[DocenteInfo]] = []  # Lista de docentes asignados

    class Config:
        from_attributes = True
        # Permitir que Pydantic convierta automáticamente las fechas
        json_encoders = {
            date: lambda v: v.isoformat() if v else None
        }