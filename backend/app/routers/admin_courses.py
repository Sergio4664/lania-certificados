# backend/app/routers/admin_courses.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models.course import Course
from app.models.user import User
from app.models.docente import Docente
from app.schemas.course import CourseCreate, CourseUpdate, CourseOut, DocenteInfo
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/courses", tags=["admin-courses"])

@router.post("/", response_model=CourseOut)
def create_course(course: CourseCreate, db: Session = Depends(get_db)):
    try:
        # Crear el curso
        course_data = course.dict()
        docente_ids = course_data.pop('docente_ids', [])
        
        # Verificar que el creador existe y es admin activo
        creator = db.query(User).filter(
            User.id == course_data['created_by'],
            User.is_active == True
        ).first()
        
        if not creator:
            raise HTTPException(400, "El usuario creador no existe o no está activo")
        
        db_course = Course(**course_data)
        db.add(db_course)
        db.flush()  # Para obtener el ID sin hacer commit completo
        
        # Asignar docentes si se proporcionaron
        if docente_ids:
            # Filtrar que sean docentes activos
            docentes = db.query(Docente).filter(
                Docente.id.in_(docente_ids),
                Docente.is_active == True
            ).all()
            
            if len(docentes) != len(docente_ids):
                db.rollback()
                found_ids = [d.id for d in docentes]
                missing_ids = [did for did in docente_ids if did not in found_ids]
                raise HTTPException(400, f"Docentes no encontrados o inactivos: {missing_ids}")
            
            # Asignar docentes al curso
            for docente in docentes:
                db_course.docentes.append(docente)
        
        db.commit()
        db.refresh(db_course)
        
        # Convertir a dict manualmente para incluir docentes
        result = CourseOut(
            id=db_course.id,
            code=db_course.code,
            name=db_course.name,
            start_date=db_course.start_date,
            end_date=db_course.end_date,
            hours=db_course.hours,
            created_by=db_course.created_by,
            course_type=db_course.course_type,
            modality=db_course.modality,
            docentes=[
                DocenteInfo(
                    id=docente.id,
                    full_name=docente.full_name,
                    email=docente.email
                )
                for docente in db_course.docentes
            ]
        )
        return result
        
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error de integridad al crear curso: {str(e)}")
        if "duplicate key value violates unique constraint" in str(e):
            raise HTTPException(400, "Ya existe un curso con ese código")
        raise HTTPException(500, f"Error de integridad en la base de datos: {str(e)}")
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error inesperado al crear curso: {str(e)}")
        raise HTTPException(500, f"Error interno del servidor: {str(e)}")

@router.get("/")
def list_courses(db: Session = Depends(get_db)):
    try:
        courses = db.query(Course).all()
        result = []
        for course in courses:
            course_dict = {
                "id": course.id,
                "code": course.code,
                "name": course.name,
                "start_date": course.start_date.isoformat() if course.start_date else None,
                "end_date": course.end_date.isoformat() if course.end_date else None,
                "hours": course.hours,
                "created_by": course.created_by,
                "course_type": course.course_type,
                "modality": course.modality,
                "docentes": [
                    {
                        "id": docente.id,
                        "full_name": docente.full_name,
                        "email": docente.email
                    }
                    for docente in course.docentes
                ]
            }
            result.append(course_dict)
        return result
    except Exception as e:
        logger.error(f"Error al listar cursos: {str(e)}")
        raise HTTPException(500, f"Error interno del servidor: {str(e)}")

@router.get("/{course_id}")
def get_course(course_id: int, db: Session = Depends(get_db)):
    try:
        course = db.query(Course).get(course_id)
        if not course:
            raise HTTPException(404, "Curso no encontrado")
        
        return {
            "id": course.id,
            "code": course.code,
            "name": course.name,
            "start_date": course.start_date.isoformat(),
            "end_date": course.end_date.isoformat(),
            "hours": course.hours,
            "created_by": course.created_by,
            "course_type": course.course_type,
            "modality": course.modality,
            "docentes": [
                {
                    "id": docente.id,
                    "full_name": docente.full_name,
                    "email": docente.email
                }
                for docente in course.docentes
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener curso {course_id}: {str(e)}")
        raise HTTPException(500, f"Error interno del servidor: {str(e)}")

@router.put("/{course_id}")
def update_course(course_id: int, data: CourseUpdate, db: Session = Depends(get_db)):
    try:
        course = db.query(Course).get(course_id)
        if not course:
            raise HTTPException(404, "Curso no encontrado")
        
        # Actualizar campos básicos
        update_data = data.dict(exclude_unset=True, exclude={'docente_ids'})
        for field, value in update_data.items():
            setattr(course, field, value)
        
        # Actualizar docentes si se proporcionaron
        if data.docente_ids is not None:
            # Obtener docentes activos
            docentes = db.query(Docente).filter(
                Docente.id.in_(data.docente_ids),
                Docente.is_active == True
            ).all()
            
            if len(docentes) != len(data.docente_ids):
                found_ids = [d.id for d in docentes]
                missing_ids = [did for did in data.docente_ids if did not in found_ids]
                raise HTTPException(400, f"Docentes no encontrados o inactivos: {missing_ids}")
            
            # Reemplazar la lista de docentes
            course.docentes.clear()
            for docente in docentes:
                course.docentes.append(docente)
        
        db.commit()
        db.refresh(course)
        
        return {
            "id": course.id,
            "code": course.code,
            "name": course.name,
            "start_date": course.start_date.isoformat(),
            "end_date": course.end_date.isoformat(),
            "hours": course.hours,
            "created_by": course.created_by,
            "course_type": course.course_type,
            "modality": course.modality,
            "docentes": [
                {
                    "id": docente.id,
                    "full_name": docente.full_name,
                    "email": docente.email
                }
                for docente in course.docentes
            ]
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error al actualizar curso {course_id}: {str(e)}")
        raise HTTPException(500, f"Error interno del servidor: {str(e)}")

@router.delete("/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db)):
    try:
        course = db.query(Course).get(course_id)
        if not course:
            raise HTTPException(404, "Curso no encontrado")
        
        db.delete(course)
        db.commit()
        return {"message": "Curso eliminado correctamente"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error al eliminar curso {course_id}: {str(e)}")
        raise HTTPException(500, f"Error interno del servidor: {str(e)}")