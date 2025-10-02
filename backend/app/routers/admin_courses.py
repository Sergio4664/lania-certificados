import logging
import pandas as pd
import io
from typing import List

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel

# --- IMPORTACIONES CORREGIDAS Y ORDENADAS ---
from ..database import get_db
from .. import models
from ..schemas.course import CourseCreate, CourseUpdate, CourseOut
from ..schemas.participant import ParticipantOut, ParticipantCreate

# Configura un logger para ver errores más fácil
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/admin/courses", 
    tags=["admin-courses"]
)

class EnrollmentRequest(BaseModel):
    participant_id: int


@router.post("/{course_id}/upload-participants/", response_model=List[ParticipantOut])
async def upload_participants(
    course_id: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    course = db.query(models.Course).get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            # Especificar que todas las columnas se lean como texto para evitar problemas de formato
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')), dtype=str)
        elif file.filename.endswith(('.xls', '.xlsx')):
            # Especificar que todas las columnas se lean como texto
            df = pd.read_excel(io.BytesIO(contents), dtype=str)
        else:
            raise HTTPException(status_code=400, detail="Formato de archivo no soportado. Use CSV o Excel.")

        # Reemplazar valores vacíos o 'nan' que Pandas pueda generar
        df.fillna('', inplace=True)
            
        # 1. Normalizar nombres de columnas
        df.columns = [col.strip().lower() for col in df.columns]

        # 2. Mapear columnas del español al inglés
        column_mapping = {
            'nombre completo': 'full_name',
            'email personal': 'personal_email',
            'email institucional': 'institutional_email',
            'telefono': 'telefono',
            'whatsapp': 'whatsapp'
        }
        df.rename(columns=column_mapping, inplace=True)

        # 3. Verificar que las columnas requeridas existan
        required_columns = ['full_name', 'personal_email']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(
                status_code=400, 
                detail=f"El archivo debe contener al menos las columnas: 'Nombre Completo' y 'Email Personal'"
            )

        newly_enrolled_participants = []
        for index, row in df.iterrows():
            personal_email = row.get('personal_email')
            full_name = row.get('full_name')

            # Omitir filas si los datos esenciales están vacíos
            if not personal_email or not full_name:
                continue
            
            # Buscar participante existente por su email personal
            participant = db.query(models.Participant).filter(
                models.Participant.personal_email == personal_email
            ).first()

            # Obtener todos los datos de la fila del Excel (ya son texto)
            participant_data = {
                'full_name': full_name,
                'personal_email': personal_email,
                'institutional_email': row.get('institutional_email'),
                'telefono': row.get('telefono'),
                'whatsapp': row.get('whatsapp')
            }
            # Filtrar valores que no sean texto vacío
            update_data = {k: v for k, v in participant_data.items() if v}

            if not participant:
                # Si el participante NO existe, crearlo con todos los datos
                participant = models.Participant(**update_data)
                db.add(participant)
            else:
                # Si el participante SÍ existe, actualizar sus datos
                for key, value in update_data.items():
                    setattr(participant, key, value)
            
            db.commit()
            db.refresh(participant)

            # Inscribir al participante en el curso si no lo está ya
            existing_enrollment = db.query(models.Enrollment).filter_by(
                course_id=course_id, 
                participant_id=participant.id
            ).first()
            
            if not existing_enrollment:
                new_enrollment = models.Enrollment(course_id=course_id, participant_id=participant.id)
                db.add(new_enrollment)
                db.commit()
                newly_enrolled_participants.append(participant)

        return newly_enrolled_participants

    except Exception as e:
        db.rollback()
        logger.error(f"Error al procesar el archivo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno al procesar el archivo: {str(e)}")


@router.post("/", response_model=CourseOut)
def create_course(course: CourseCreate, db: Session = Depends(get_db)):
    try:
        course_data = course.dict()
        docente_ids = course_data.pop('docente_ids', [])
        
        creator = db.query(models.User).filter(
            models.User.id == course_data['created_by'],
            models.User.is_active == True
        ).first()
        
        if not creator:
            raise HTTPException(status_code=400, detail="El usuario creador no existe o no está activo")
        
        db_course = models.Course(**course_data)
        db.add(db_course)
        db.flush()
        
        if docente_ids:
            docentes = db.query(models.Docente).filter(
                models.Docente.id.in_(docente_ids),
                models.Docente.is_active == True
            ).all()
            
            if len(docentes) != len(set(docente_ids)):
                db.rollback()
                found_ids = [d.id for d in docentes]
                missing_ids = [did for did in docente_ids if did not in set(found_ids)]
                raise HTTPException(status_code=400, detail=f"Docentes no encontrados o inactivos: {missing_ids}")
            
            db_course.docentes.extend(docentes)
        
        db.commit()
        db.refresh(db_course)
        
        return db_course
        
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error de integridad al crear curso: {str(e)}")
        if "duplicate key value violates unique constraint" in str(e):
            raise HTTPException(status_code=400, detail="Ya existe un curso con ese código")
        raise HTTPException(status_code=500, detail=f"Error de integridad en la base de datos: {str(e)}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error inesperado al crear curso: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")


@router.get("/", response_model=List[CourseOut])
def list_courses(db: Session = Depends(get_db)):
    try:
        courses = db.query(models.Course).options(joinedload(models.Course.docentes)).all()
        return courses
    except Exception as e:
        logger.error(f"Error al listar cursos: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")


@router.get("/{course_id}", response_model=CourseOut)
def get_course(course_id: int, db: Session = Depends(get_db)):
    try:
        course = db.query(models.Course).options(
            joinedload(models.Course.docentes)
        ).filter(models.Course.id == course_id).first()

        if not course:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        return course
    except Exception as e:
        logger.error(f"Error al obtener curso {course_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")


@router.put("/{course_id}", response_model=CourseOut)
def update_course(course_id: int, data: CourseUpdate, db: Session = Depends(get_db)):
    try:
        course = db.query(models.Course).options(joinedload(models.Course.docentes)).get(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        update_data = data.dict(exclude_unset=True, exclude={'docente_ids'})
        for field, value in update_data.items():
            setattr(course, field, value)
        
        if data.docente_ids is not None:
            docentes = db.query(models.Docente).filter(
                models.Docente.id.in_(data.docente_ids),
                models.Docente.is_active == True
            ).all()
            
            if len(docentes) != len(set(data.docente_ids)):
                found_ids = [d.id for d in docentes]
                missing_ids = [did for did in data.docente_ids if did not in set(found_ids)]
                raise HTTPException(status_code=400, detail=f"Docentes no encontrados o inactivos: {missing_ids}")
            
            course.docentes = docentes
        
        db.commit()
        db.refresh(course)
        
        return course

    except Exception as e:
        db.rollback()
        logger.error(f"Error al actualizar curso {course_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")


@router.delete("/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db)):
    try:
        course = db.query(models.Course).get(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        db.delete(course)
        db.commit()
        return {"message": "Curso eliminado correctamente"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error al eliminar curso {course_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")
    

@router.get("/{course_id}/participants", response_model=List[ParticipantOut])
def get_course_participants(course_id: int, db: Session = Depends(get_db)):
    course = db.query(models.Course).get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    
    participants = db.query(models.Participant).join(models.Enrollment).filter(models.Enrollment.course_id == course_id).all()
    return participants


@router.post("/{course_id}/enroll")
def enroll_participant_in_course(course_id: int, enrollment_request: EnrollmentRequest, db: Session = Depends(get_db)):
    course = db.query(models.Course).get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
        
    participant = db.query(models.Participant).get(enrollment_request.participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="Participante no encontrado")

    existing_enrollment = db.query(models.Enrollment).filter_by(course_id=course_id, participant_id=enrollment_request.participant_id).first()
    if existing_enrollment:
        raise HTTPException(status_code=400, detail="El participante ya está inscrito en este curso")

    new_enrollment = models.Enrollment(course_id=course_id, participant_id=enrollment_request.participant_id)
    db.add(new_enrollment)
    db.commit()
    
    return {"message": "Participante inscrito correctamente"}


@router.delete("/{course_id}/enroll/{participant_id}")
def unenroll_participant_from_course(course_id: int, participant_id: int, db: Session = Depends(get_db)):
    enrollment = db.query(models.Enrollment).filter_by(course_id=course_id, participant_id=participant_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
        
    db.delete(enrollment)
    db.commit()
    
    return {"message": "Participante desinscrito correctamente"}