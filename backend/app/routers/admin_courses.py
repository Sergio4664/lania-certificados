# backend/app/routers/admin_courses.py
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models.course import Course
from app.models.user import User
from app.models.docente import Docente
from app.models.participant import Participant
from app.models.enrollment import Enrollment
from app.schemas.course import CourseCreate, CourseUpdate, CourseOut, DocenteInfo
from app.schemas.participant import ParticipantOut, ParticipantCreate
from pydantic import BaseModel
from typing import List
import logging
import pandas as pd
import io

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/courses", tags=["admin-courses"])

class EnrollmentRequest(BaseModel):
    participant_id: int

@router.post("/{course_id}/upload-participants/", response_model=List[ParticipantOut])
async def upload_participants(course_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    course = db.query(Course).get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Formato de archivo no soportado. Use CSV o Excel.")

        # Normalizar nombres de columnas (minúsculas y sin espacios)
        df.columns = [col.strip().lower() for col in df.columns]

        if 'email' not in df.columns or 'full_name' not in df.columns:
            raise HTTPException(status_code=400, detail="El archivo debe contener las columnas 'email' y 'full_name'.")

        newly_enrolled_participants = []
        for index, row in df.iterrows():
            participant_email = row.get('email')
            participant_name = row.get('full_name')
            # Buscar por 'phone' o 'telefono'
            participant_phone = row.get('phone', row.get('telefono'))

            if not isinstance(participant_email, str) or not isinstance(participant_name, str):
                continue

            participant = db.query(Participant).filter(Participant.email == participant_email).first()
            if not participant:
                new_participant_data = {
                    "email": participant_email,
                    "full_name": participant_name
                }
                # Añadir teléfono solo si existe y no está vacío
                if participant_phone and pd.notna(participant_phone):
                    new_participant_data["phone"] = str(participant_phone)

                new_participant = ParticipantCreate(**new_participant_data)
                participant = Participant(**new_participant.dict())
                db.add(participant)
                db.commit()
                db.refresh(participant)

            existing_enrollment = db.query(Enrollment).filter_by(course_id=course_id, participant_id=participant.id).first()
            if not existing_enrollment:
                new_enrollment = Enrollment(course_id=course_id, participant_id=participant.id)
                db.add(new_enrollment)
                db.commit()
                newly_enrolled_participants.append(participant)

        return newly_enrolled_participants

    except Exception as e:
        db.rollback()
        logger.error(f"Error al procesar el archivo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al procesar el archivo: {str(e)}")


@router.post("/", response_model=CourseOut)
def create_course(course: CourseCreate, db: Session = Depends(get_db)):
    try:
        course_data = course.dict()
        docente_ids = course_data.pop('docente_ids', [])
        
        creator = db.query(User).filter(
            User.id == course_data['created_by'],
            User.is_active == True
        ).first()
        
        if not creator:
            raise HTTPException(400, "El usuario creador no existe o no está activo")
        
        db_course = Course(**course_data)
        db.add(db_course)
        db.flush()
        
        if docente_ids:
            docentes = db.query(Docente).filter(
                Docente.id.in_(docente_ids),
                Docente.is_active == True
            ).all()
            
            if len(docentes) != len(docente_ids):
                db.rollback()
                found_ids = [d.id for d in docentes]
                missing_ids = [did for did in docente_ids if did not in found_ids]
                raise HTTPException(400, f"Docentes no encontrados o inactivos: {missing_ids}")
            
            for docente in docentes:
                db_course.docentes.append(docente)
        
        db.commit()
        db.refresh(db_course)
        
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
                    especialidad=docente.especialidad,
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
                "competencies": course.competencies,
                "created_by": course.created_by,
                "course_type": course.course_type,
                "modality": course.modality,
                "docentes": [
                    {
                        "id": docente.id,
                        "especialidad": docente.especialidad,
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
                    "especialidad": docente.especialidad,
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
        
        update_data = data.dict(exclude_unset=True, exclude={'docente_ids'})
        for field, value in update_data.items():
            setattr(course, field, value)
        
        if data.docente_ids is not None:
            docentes = db.query(Docente).filter(
                Docente.id.in_(data.docente_ids),
                Docente.is_active == True
            ).all()
            
            if len(docentes) != len(data.docente_ids):
                found_ids = [d.id for d in docentes]
                missing_ids = [did for did in data.docente_ids if did not in found_ids]
                raise HTTPException(400, f"Docentes no encontrados o inactivos: {missing_ids}")
            
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
                    "especialidad": docente.especialidad,
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
    
@router.get("/{course_id}/participants", response_model=List[ParticipantOut])
def get_course_participants(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    participants = db.query(Participant).join(Enrollment).filter(Enrollment.course_id == course_id).all()
    return participants

@router.post("/{course_id}/enroll")
def enroll_participant_in_course(course_id: int, enrollment_request: EnrollmentRequest, db: Session = Depends(get_db)):
    course = db.query(Course).get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
        
    participant = db.query(Participant).get(enrollment_request.participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="Participante no encontrado")

    existing_enrollment = db.query(Enrollment).filter_by(course_id=course_id, participant_id=enrollment_request.participant_id).first()
    if existing_enrollment:
        raise HTTPException(status_code=400, detail="El participante ya está inscrito en este curso")

    new_enrollment = Enrollment(course_id=course_id, participant_id=enrollment_request.participant_id)
    db.add(new_enrollment)
    db.commit()
    
    return {"message": "Participante inscrito correctamente"}

@router.delete("/{course_id}/enroll/{participant_id}")
def unenroll_participant_from_course(course_id: int, participant_id: int, db: Session = Depends(get_db)):
    enrollment = db.query(Enrollment).filter_by(course_id=course_id, participant_id=participant_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
        
    db.delete(enrollment)
    db.commit()
    
    return {"message": "Participante desinscrito correctamente"}