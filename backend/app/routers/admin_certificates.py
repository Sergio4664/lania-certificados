from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from pydantic import BaseModel
from app.models.certificate import Certificate
from app.models.course import Course
from app.models.participant import Participant
from app.models.enums import CertificateStatus, CertificateKind
from app.models.docente import Docente
from app.models.enrollment import Enrollment
from app.services.certificate_service import issue_certificate
import logging
import os
from typing import Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

# --- Clases Pydantic para las solicitudes y respuestas ---

class CertificateIssueRequest(BaseModel):
    course_id: int
    # El ID puede ser de un participante o un docente, dependiendo del endpoint
    entity_id: int
    kind: CertificateKind

class BulkIssueRequest(BaseModel):
    participant_ids: List[int]
    with_competencies: bool = False

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

router = APIRouter(prefix="/api/admin/certificates", tags=["admin-certificates"])


# --- Función Centralizada para Crear y Emitir Certificados ---

def _create_and_issue_certificate(
    db: Session,
    course: Course,
    participant: Participant,
    kind: CertificateKind,
    # Se añade un parámetro opcional para recibir el objeto docente
    docente: Optional[Docente] = None
) -> Certificate:
    """
    Función interna que encapsula la lógica para crear y emitir un certificado.
    Verifica duplicados y llama al servicio de emisión para generar el PDF.
    """
    # 1. Validar que el curso tenga competencias si la constancia las requiere
    if "COMPETENCIAS" in kind.value and not course.competencies:
        raise HTTPException(
            status_code=400,
            detail="Este curso no tiene competencias definidas para este tipo de constancia."
        )

    # 2. Verificar si ya existe una constancia idéntica para evitar duplicados
    existing_cert = db.query(Certificate).filter_by(
        course_id=course.id,
        participant_id=participant.id,
        kind=kind
    ).first()
    if existing_cert:
        raise HTTPException(
            status_code=409,  # 409 Conflict es más apropiado para duplicados
            detail=f"Ya existe una constancia de tipo '{kind.value}' para '{participant.full_name}' en este curso."
        )

    # 3. Crear la nueva instancia del certificado en la base de datos
    cert = Certificate(
        course_id=course.id,
        participant_id=participant.id,
        kind=kind,
        status=CertificateStatus.EN_PROCESO,
        serial="TEMP", # Serial temporal
        qr_token="TEMP" # Token temporal
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)

    # 4. Llamar al servicio que genera el PDF y los datos finales
    try:
        # Se crea un diccionario para los datos del participante/docente
        participant_data = {"full_name": participant.full_name}
        # Si se pasó un objeto 'docente' y tiene especialidad, se añade al diccionario.
        if docente and docente.especialidad:
            participant_data["specialty"] = docente.especialidad
            
        issued_cert = issue_certificate(
            db, cert,
            participant=participant_data, # Se pasa el nuevo diccionario con los datos
            course={
                "name": course.name,
                "hours": course.hours,
                "start_date": course.start_date,
                "modality": course.modality,
                "competencies": course.competencies
            }
        )
        return issued_cert
    except Exception as e:
        db.rollback()
        logger.error(f"Error al llamar a issue_certificate para participant_id {participant.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno al generar el archivo PDF del certificado: {e}")


# --- Endpoints Refactorizados ---

@router.post("/issue-for-participant", response_model=IssueResponse, summary="Emite una constancia para un participante")
def issue_for_participant(data: CertificateIssueRequest, db: Session = Depends(get_db)):
    """
    Emite una constancia para un participante que está inscrito en un curso.
    """
    course = db.query(Course).get(data.course_id)
    participant = db.query(Participant).get(data.entity_id)
    if not course or not participant:
        raise HTTPException(status_code=404, detail="El curso o el participante no fueron encontrados.")

    enrollment = db.query(Enrollment).filter_by(course_id=course.id, participant_id=participant.id).first()
    if not enrollment:
        raise HTTPException(status_code=400, detail="El participante no está inscrito en este curso.")

    # Al ser un participante, no se pasa el objeto 'docente'.
    cert = _create_and_issue_certificate(db, course, participant, data.kind)
    
    return IssueResponse(
        id=cert.id, serial=cert.serial, kind=cert.kind.value, status=cert.status.value,
        course_name=course.name, participant_name=participant.full_name,
        issued_at=cert.issued_at, qr_token=cert.qr_token, pdf_path=cert.pdf_path
    )


@router.post("/issue-for-docente", response_model=IssueResponse, summary="Emite una constancia para un docente")
def issue_for_docente(data: CertificateIssueRequest, db: Session = Depends(get_db)):
    """
    Emite una constancia de tipo 'ponente' para un docente.
    """
    course = db.query(Course).get(data.course_id)
    docente = db.query(Docente).get(data.entity_id)
    if not course or not docente:
        raise HTTPException(status_code=404, detail="El curso o el docente no fueron encontrados.")

    if "PONENTE" not in data.kind.value:
        raise HTTPException(status_code=400, detail="El tipo de constancia para un docente debe ser de tipo 'ponente'.")

    participant = db.query(Participant).filter(Participant.personal_email == docente.institutional_email).first()
    if not participant:
        participant = Participant(
            full_name=docente.full_name,
            personal_email=docente.institutional_email,
            telefono=docente.telefono
        )
        db.add(participant)
        db.commit()
        db.refresh(participant)

    # Se pasa el objeto 'docente' a la función centralizada para que pueda usar la especialidad
    cert = _create_and_issue_certificate(db, course, participant, data.kind, docente=docente)
    
    return IssueResponse(
        id=cert.id, serial=cert.serial, kind=cert.kind.value, status=cert.status.value,
        course_name=course.name, participant_name=participant.full_name,
        issued_at=cert.issued_at, qr_token=cert.qr_token, pdf_path=cert.pdf_path
    )


@router.post("/{course_id}/issue-bulk", summary="Emite certificados masivamente para un curso")
def issue_bulk_certificates(course_id: int, request: BulkIssueRequest, db: Session = Depends(get_db)):
    # ... (Tu lógica de emisión masiva aquí) ...
    pass


@router.get("/", response_model=List[dict], summary="Lista todos los certificados emitidos")
def list_certificates(db: Session = Depends(get_db)):
    """ Lista todos los certificados con información del curso y participante asociado. """
    try:
        certificates = db.query(Certificate).order_by(Certificate.id.desc()).all()
        result = []
        for cert in certificates:
            result.append({
                "id": cert.id, "serial": cert.serial, "kind": cert.kind.value, "status": cert.status.value,
                "course_name": cert.course.name if cert.course else "N/A",
                "participant_name": cert.participant.full_name if cert.participant else "N/A",
                "issued_at": cert.issued_at.isoformat() if cert.issued_at else None
            })
        return result
    except Exception as e:
        logger.error(f"Error listando certificados: {str(e)}")
        raise HTTPException(500, f"Error interno del servidor: {str(e)}")


@router.delete("/{certificate_id}", summary="Elimina un certificado por su ID")
def delete_certificate(certificate_id: int, db: Session = Depends(get_db)):
    """
    Elimina un certificado de la base de datos y su archivo PDF asociado si existe.
    """
    cert = db.query(Certificate).get(certificate_id)
    if not cert:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")
    
    try:
        if cert.pdf_path and os.path.exists(cert.pdf_path):
            os.remove(cert.pdf_path)
            
        db.delete(cert)
        db.commit()
        return {"message": "Certificado eliminado correctamente"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error eliminando certificado {certificate_id}: {str(e)}")
        raise HTTPException(500, f"Error interno del servidor al eliminar: {str(e)}")