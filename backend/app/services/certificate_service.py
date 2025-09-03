# backend/app/services/certificate_service.py
import uuid
import secrets
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.certificate import Certificate
from app.models.enums import CertificateStatus
from app.services.html_pdf_service import generate_certificate_html_pdf
import os
import logging

logger = logging.getLogger(__name__)

def issue_certificate(db: Session, certificate: Certificate, participant: dict, course: dict) -> Certificate:
    """
    Procesa un certificado: genera serial, QR token, PDF y actualiza estado
    """
    try:
        # Generar serial único
        certificate.serial = f"LANIA-{datetime.now().strftime('%Y')}-{secrets.token_hex(4).upper()}"
        
        # Generar token único para QR
        certificate.qr_token = str(uuid.uuid4())
        
        # Generar PDF usando templates HTML
        try:
            pdf_bytes = generate_certificate_html_pdf(
                kind=certificate.kind,
                participant_name=participant["full_name"],
                course_name=course["name"],
                course_hours=course["hours"],
                course_date=course.get("start_date", datetime.now().strftime("%d/%m/%Y")),
                serial=certificate.serial,
                qr_token=certificate.qr_token,
                issue_date=datetime.now().date()
            )
            certificate.pdf_content = pdf_bytes
            
            # Crear directorio si no existe
            os.makedirs("certificates", exist_ok=True)
            
            # Guardar archivo físico
            pdf_filename = f"certificates/{certificate.serial}.pdf"
            with open(pdf_filename, "wb") as f:
                f.write(pdf_bytes)
            certificate.pdf_path = pdf_filename
            
            # Actualizar timestamps y estado
            certificate.issued_at = datetime.now(timezone.utc)
            certificate.updated_at = datetime.now(timezone.utc)
            certificate.status = CertificateStatus.LISTO_PARA_DESCARGAR
            
        except Exception as e:
            logger.error(f"Error generando PDF: {e}")
            certificate.status = CertificateStatus.EN_PROCESO
        
        # Guardar cambios
        db.commit()
        db.refresh(certificate)
        
        return certificate
    except Exception as e:
        logger.error(f"Error procesando certificado: {e}")
        db.rollback()
        raise