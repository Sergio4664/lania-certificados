# backend/app/routers/admin_certificates.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from pydantic import BaseModel
from app.models.certificate import Certificate
from app.models.course import Course
from app.models.participant import Participant
from app.models.enums import CertificateStatus, CertificateKind
from app.models.docente import Docente
from app.services.certificate_service import issue_certificate
import logging
import os
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

class CertificateIssueRequest(BaseModel):
    course_id: int
    participant_id: int
    kind: CertificateKind

router = APIRouter(prefix="/api/admin/certificates", tags=["admin-certificates"])

class IssueResponse(BaseModel):
    id: int
    serial: str
    kind: str
    status: str
    course_name: str
    participant_name: str
    issued_at: Optional[datetime] = None
    qr_token: str
    pdf_path: Optional[str] = None

class BulkIssueRequest(BaseModel):
    participant_ids: List[int]
    with_competencies: bool = False

class DocenteCertificateIssueRequest(BaseModel):
    course_id: int
    docente_id: int
    kind: CertificateKind

# NUEVO: Endpoint para la emisión masiva de certificados
@router.post("/{course_id}/issue-bulk-certificates", summary="Emite certificados masivamente para un curso")
def issue_bulk_certificates(course_id: int, request: BulkIssueRequest, db: Session = Depends(get_db)):
    course = db.query(Course).get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    if request.with_competencies:
        if course.course_type != 'CURSO_EDUCATIVO':
            raise HTTPException(status_code=400, detail="Las constancias de competencias solo están disponibles para 'CURSO_EDUCATIVO'")
        if not course.competencies:
            raise HTTPException(status_code=400, detail="Este curso no tiene competencias definidas para generar este tipo de constancia.")

    issued_count = 0
    skipped_count = 0
    errors = []

    #Endpoint para emitir constancias a docentes
@router.post("/issue-for-docente", response_model=IssueResponse, summary="Emite una constancia para un docente.")
def issue_for_docente(data: DocenteCertificateIssueRequest, db: Session = Depends(get_db)):
    """
    Emite una constancia para un docente.
    Si no existe un participante con el email del docente, se crea uno automáticamente.
    """
    try:
        course = db.query(Course).get(data.course_id)
        docente = db.query(Docente).get(data.docente_id)
        if not course or not docente:
            raise HTTPException(status_code=404, detail="Curso o docente inexistente")

        if "PONENTE" not in data.kind.value:
            raise HTTPException(status_code=400, detail="El tipo de constancia debe ser de ponente.")

        if "COMPETENCIAS" in data.kind.value and not course.competencies:
            raise HTTPException(status_code=400, detail="Este curso no tiene competencias definidas.")

        # Buscar o crear un participante correspondiente al docente
        participant = db.query(Participant).filter(Participant.email == docente.email).first()
        if not participant:
            participant = Participant(
                full_name=docente.full_name,
                email=docente.email,
                phone=docente.telefono
            )
            db.add(participant)
            db.commit()
            db.refresh(participant)

        # Verificar si ya existe una constancia
        existing = db.query(Certificate).filter(
            Certificate.course_id == course.id,
            Certificate.participant_id == participant.id,
            Certificate.kind == data.kind
        ).first()

        if existing:
            raise HTTPException(status_code=400, detail="Ya existe una constancia de este tipo para este docente y curso")
        
        # Crear y procesar el certificado
        cert = Certificate(
            course_id=course.id, 
            participant_id=participant.id, 
            kind=data.kind,
            status=CertificateStatus.EN_PROCESO, 
            serial="TEMP", 
            qr_token="TEMP"
        )
        db.add(cert)
        db.commit()
        db.refresh(cert)
        
        cert = issue_certificate(
            db, cert,
            participant={"full_name": participant.full_name},
            course={
                "name": course.name, "hours": course.hours, "start_date": course.start_date,
                "modality": course.modality, "competencies": course.competencies
            }
        )
        
        return IssueResponse(
            id=cert.id, serial=cert.serial, kind=cert.kind, status=cert.status,
            course_name=course.name, participant_name=participant.full_name,
            issued_at=cert.issued_at, qr_token=cert.qr_token, pdf_path=cert.pdf_path
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error emitiendo constancia para docente: {str(e)}")
        raise HTTPException(500, f"Error interno: {str(e)}")

    # Obtener participantes válidos y que estén inscritos en el curso
    valid_participants = db.query(Participant).join(Enrollment).filter(
        Enrollment.course_id == course_id,
        Participant.id.in_(request.participant_ids)
    ).all()
    
    valid_participant_map = {p.id: p for p in valid_participants}

    for participant_id in request.participant_ids:
        participant = valid_participant_map.get(participant_id)
        if not participant:
            errors.append(f"Participante con ID {participant_id} no está inscrito en el curso.")
            continue

        # Determinar el tipo de constancia a emitir
        kind = None
        if course.course_type == 'CURSO_EDUCATIVO':
            kind = CertificateKind.CURSO_COMPETENCIAS_PARTICIPANTE if request.with_competencies else CertificateKind.CURSO_PARTICIPANTE
        elif course.course_type == 'PILDORA_EDUCATIVA':
            kind = CertificateKind.PILDORA_PARTICIPANTE
        elif course.course_type == 'INYECCION_EDUCATIVA':
            kind = CertificateKind.INYECCION_PARTICIPANTE
        
        if not kind:
            errors.append(f"No se pudo determinar el tipo de constancia para el participante {participant.full_name}")
            continue

        # Verificar si ya existe una constancia de este tipo
        existing = db.query(Certificate).filter(
            Certificate.course_id == course_id,
            Certificate.participant_id == participant_id,
            Certificate.kind == kind
        ).first()

        if existing:
            skipped_count += 1
            continue

        try:
            # Crear y procesar el certificado
            cert = Certificate(
                course_id=course.id, 
                participant_id=participant.id, 
                kind=kind,
                status='EN_PROCESO', 
                serial="TEMP", 
                qr_token="TEMP"
            )
            db.add(cert)
            db.commit()
            db.refresh(cert)

            issue_certificate(
                db, cert,
                participant={"full_name": participant.full_name},
                course={
                    "name": course.name, 
                    "hours": course.hours, 
                    "start_date": course.start_date,
                    "modality": course.modality,
                    "competencies": course.competencies
                }
            )
            issued_count += 1
        except Exception as e:
            logger.error(f"Error emitiendo certificado para participante {participant_id}: {str(e)}")
            errors.append(f"Error para {participant.full_name}: {str(e)}")
            db.rollback()

    return {
        "issued": issued_count,
        "skipped": skipped_count,
        "errors": errors,
        "message": f"Proceso completado. Emitidos: {issued_count}, Omitidos (ya existían): {skipped_count}."
    }

@router.post("/issue", response_model=IssueResponse)
def issue(data: CertificateIssueRequest, db: Session = Depends(get_db)):
    """ Emite un certificado. """
    try:
        course = db.query(Course).get(data.course_id)
        participant = db.query(Participant).get(data.participant_id)
        if not course or not participant:
            raise HTTPException(status_code=404, detail="Curso o participante inexistente")
        
        if "COMPETENCIAS" in data.kind.value and not course.competencies:
             raise HTTPException(status_code=400, detail="Este curso no tiene competencias definidas para generar este tipo de constancia.")

        existing = db.query(Certificate).filter(
            Certificate.course_id == course.id,
            Certificate.participant_id == participant.id,
            Certificate.kind == data.kind
        ).first()

        if existing:
            raise HTTPException(status_code=400, detail="Ya existe una constancia de este tipo para este participante y curso")
        
        cert = Certificate(
            course_id=course.id, 
            participant_id=participant.id, 
            kind=data.kind,
            status=CertificateStatus.EN_PROCESO, 
            serial="TEMP", 
            qr_token="TEMP"
        )
        db.add(cert)
        db.commit()
        db.refresh(cert)
        
        cert = issue_certificate(
            db, cert,
            participant={"full_name": participant.full_name},
            course={
                "name": course.name, 
                "hours": course.hours, 
                "start_date": course.start_date,
                "modality": course.modality,
                "competencies": course.competencies
            }
        )
        
        return IssueResponse(
            id=cert.id, serial=cert.serial, kind=cert.kind, status=cert.status,
            course_name=course.name, participant_name=participant.full_name,
            issued_at=cert.issued_at, qr_token=cert.qr_token, pdf_path=cert.pdf_path
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error emitiendo certificado: {str(e)}")
        raise HTTPException(500, f"Error interno: {str(e)}")

@router.get("/", response_model=List[dict])
def list_certificates(db: Session = Depends(get_db)):
    """ Lista todos los certificados. """
    try:
        certificates = db.query(Certificate).order_by(Certificate.id.desc()).all()
        result = []
        for cert in certificates:
            course = db.query(Course).get(cert.course_id)
            participant = db.query(Participant).get(cert.participant_id)
            result.append({
                "id": cert.id, "serial": cert.serial, "kind": cert.kind, "status": cert.status,
                "course_name": course.name if course else "N/A",
                "participant_name": participant.full_name if participant else "N/A",
                "issued_at": cert.issued_at.isoformat() if cert.issued_at else None
            })
        return result
    except Exception as e:
        logger.error(f"Error listando certificados: {str(e)}")
        raise HTTPException(500, f"Error interno: {str(e)}")

@router.delete("/{certificate_id}")
def delete_certificate(certificate_id: int, db: Session = Depends(get_db)):
    """ Elimina un certificado por su ID. """
    try:
        cert = db.query(Certificate).get(certificate_id)
        if not cert:
            raise HTTPException(status_code=404, detail="Certificado no encontrado")
        
        # Opcional: eliminar el archivo PDF físico si existe
        if cert.pdf_path and os.path.exists(cert.pdf_path):
            os.remove(cert.pdf_path)
            
        db.delete(cert)
        db.commit()
        return {"message": "Certificado eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error eliminando certificado: {str(e)}")
        raise HTTPException(500, f"Error interno del servidor: {str(e)}")