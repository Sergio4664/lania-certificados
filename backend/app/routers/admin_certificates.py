# backend/app/routers/admin_certificates.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.certificate import Certificate
from app.models.course import Course
from app.models.participant import Participant
from app.models.enums import CertificateStatus
from app.services.certificate_service import issue_certificate
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/certificates", tags=["admin-certificates"])

@router.post("/issue")
def issue(data: dict, db: Session = Depends(get_db)):
    """
    Emite un certificado. Esperamos:
    {
      "course_id": 1,
      "participant_id": 1, 
      "kind": "APROBACION"
    }
    """
    try:
        course = db.query(Course).get(data["course_id"])
        participant = db.query(Participant).get(data["participant_id"])
        
        if not course or not participant:
            raise HTTPException(status_code=404, detail="Curso o participante inexistente")
        
        # Verificar si ya existe un certificado para esta combinación
        existing = db.query(Certificate).filter(
            Certificate.course_id == course.id,
            Certificate.participant_id == participant.id,
            Certificate.kind == data["kind"]
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe un certificado de este tipo para este participante y curso")
        
        # Crear certificado inicial
        cert = Certificate(
            course_id=course.id, 
            participant_id=participant.id, 
            kind=data["kind"],
            status=CertificateStatus.EN_PROCESO,
            serial="TEMP",  # Temporal, se actualiza en issue_certificate
            qr_token="TEMP"  # Temporal, se actualiza en issue_certificate
        )
        
        db.add(cert)
        db.commit()
        db.refresh(cert)
        
        # Procesar el certificado (generar PDF, serial, etc.)
        cert = issue_certificate(
            db, 
            cert,
            participant={"full_name": participant.full_name},
            course={"name": course.name, "hours": course.hours}
        )
        
        return {
            "id": cert.id, 
            "serial": cert.serial, 
            "status": cert.status, 
            "pdf_path": cert.pdf_path,
            "qr_token": cert.qr_token
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error emitiendo certificado: {str(e)}")
        raise HTTPException(500, f"Error interno: {str(e)}")

@router.get("/")
def list_certificates(db: Session = Depends(get_db)):
    """Lista todos los certificados con información de curso y participante"""
    try:
        certificates = db.query(Certificate).all()
        result = []
        for cert in certificates:
            course = db.query(Course).get(cert.course_id)
            participant = db.query(Participant).get(cert.participant_id)
            result.append({
                "id": cert.id,
                "serial": cert.serial,
                "kind": cert.kind,
                "status": cert.status,
                "course_name": course.name if course else "N/A",
                "participant_name": participant.full_name if participant else "N/A",
                "issued_at": cert.issued_at.isoformat() if cert.issued_at else None
            })
        return result
    except Exception as e:
        logger.error(f"Error listando certificados: {str(e)}")
        raise HTTPException(500, f"Error interno: {str(e)}")