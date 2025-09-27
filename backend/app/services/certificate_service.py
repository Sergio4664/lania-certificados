import uuid
import secrets
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.certificate import Certificate
from app.models.enums import CertificateStatus
from app.services.pdf_service import generate_certificate_pdf
import os
import logging

# Se importan los modelos necesarios que antes estaban en una función separada
from app.models.docente import Docente
from app.models.course import Course

logger = logging.getLogger(__name__)

def issue_certificate(db: Session, certificate: Certificate, participant: dict, course: dict) -> Certificate:
    """
    Procesa un certificado: genera serial, QR token, PDF y actualiza estado.
    Ahora también maneja la especialidad del docente si se provee.
    """
    try:
        certificate.serial = f"LANIA-{datetime.now().strftime('%Y')}-{secrets.token_hex(4).upper()}"
        certificate.qr_token = str(uuid.uuid4())
        
        try:
            template_pdf_path = "app/static/Formato constancias.pdf"
            competencies_list = course.get("competencies", "").split('\n') if course.get("competencies") else []

            # --- CAMBIO: Se obtiene la especialidad del diccionario 'participant' ---
            # .get() es seguro, devolverá None si la clave "specialty" no existe.
            docente_specialty = participant.get("specialty")
            
            pdf_bytes = generate_certificate_pdf(
                participant_name=participant["full_name"],
                course_name=course["name"],
                hours=course["hours"],
                issue_date=datetime.now().date(),
                template_path=template_pdf_path,
                kind=certificate.kind.value,
                serial=certificate.serial,
                qr_token=certificate.qr_token,
                course_modality=course["modality"].value,
                course_date=course["start_date"].strftime("%d/%m/%Y"),
                competencies=competencies_list,
                docente_specialty=docente_specialty # <--- Se pasa el nuevo dato a la función del PDF
            )
            certificate.pdf_content = pdf_bytes
            
            os.makedirs("certificates", exist_ok=True)
            
            pdf_filename = f"certificates/{certificate.serial}.pdf"
            with open(pdf_filename, "wb") as f:
                f.write(pdf_bytes)
            certificate.pdf_path = pdf_filename
            
            certificate.issued_at = datetime.now(timezone.utc)
            certificate.updated_at = datetime.now(timezone.utc)
            certificate.status = CertificateStatus.LISTO_PARA_DESCARGAR
            
        except Exception as e:
            logger.error(f"Error generando PDF: {e}")
            certificate.status = CertificateStatus.EN_PROCESO
    
        db.commit()
        db.refresh(certificate)
        
        return certificate
    except Exception as e:
        logger.error(f"Error procesando certificado: {e}")
        db.rollback()
        raise