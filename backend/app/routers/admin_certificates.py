# backend/app/routers/admin_certificates.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from pydantic import BaseModel
from app.models.certificate import Certificate
from app.models.course import Course
from app.models.participant import Participant
from app.models.enums import CertificateStatus, CertificateKind
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