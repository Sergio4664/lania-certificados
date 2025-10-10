import uuid
import secrets
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.app.models.certificado import Certificate
from app.models.enums import CertificateStatus
from app.services.pdf_service import generate_certificate_pdf
from app.services.email_service import send_certificate_email
import os
import logging

from app.models.docente import Docente
from backend.app.models.producto_educativo import Course

logger = logging.getLogger(__name__)

def issue_certificate(db: Session, certificate: Certificate, participant: dict, course: dict) -> Certificate:
    try:
        certificate.serial = f"LANIA-{datetime.now().strftime('%Y')}-{secrets.token_hex(4).upper()}"
        certificate.qr_token = str(uuid.uuid4())
        
        try:
            template_pdf_path = "app/static/Formato constancias.pdf"
            competencies_list = course.get("competencies", "").split('\n') if course.get("competencies") else []
            docente_specialty = participant.get("specialty")
            
            # --- CAMBIO AQUÍ ---
            # Obtenemos el tipo de curso legible que pasamos desde el router
            course_type_str = course.get("course_type_str", "Curso") 
            
            pdf_bytes = generate_certificate_pdf(
                participant_name=participant["full_name"],
                course_name=course["name"],
                course_type_str=course_type_str, # Se pasa al generador de PDF
                hours=course["hours"],
                issue_date=datetime.now().date(),
                template_path=template_pdf_path,
                kind=certificate.kind.value,
                serial=certificate.serial,
                qr_token=certificate.qr_token,
                course_modality=course["modality"].value,
                course_date=course["start_date"].strftime("%d/%m/%Y"),
                competencies=competencies_list,
                docente_specialty=docente_specialty
            )
            certificate.pdf_content = pdf_bytes
            
            os.makedirs("certificates", exist_ok=True)
            
            pdf_filename = f"certificates/{certificate.serial}.pdf"
            with open(pdf_filename, "wb") as f:
                f.write(pdf_bytes)
            certificate.pdf_path = pdf_filename
            
            if participant.get("email"):
                try:
                    send_certificate_email(
                        recipient_email=participant["email"],
                        recipient_name=participant["full_name"],
                        course_name=course["name"],
                        course_type_str=course_type_str, # Se pasa al servicio de correo
                        pdf_content=pdf_bytes,
                        serial=certificate.serial
                    )
                except Exception as e:
                    logger.error(f"FALLO EL ENVÍO DE CORREO para el certificado {certificate.serial}: {e}")

            certificate.issued_at = datetime.now(timezone.utc)
            certificate.updated_at = datetime.now(timezone.utc)
            certificate.status = CertificateStatus.LISTO_PARA_DESCARGAR
            
        except Exception as e:
            logger.error(f"Error generando PDF o enviando correo: {e}")
            certificate.status = CertificateStatus.EN_PROCESO
    
        db.commit()
        db.refresh(certificate)
        
        return certificate
    except Exception as e:
        logger.error(f"Error crítico procesando certificado {certificate.id}: {e}")
        db.rollback()
        raise