# backend/app/services/certificate_service.py
import uuid
import secrets
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.certificado import Certificado
from app.models.enums import CertificateStatus
from app.services.pdf_service import generate_certificate_pdf
from app.services.email_service import send_certificate_email
import os
import logging

# ✅ CORRECCIÓN: Importar y usar la función para obtener la configuración
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings() # Cargar la configuración aquí

def issue_certificate(db: Session, certificate: Certificado, participant: dict, course: dict) -> Certificado:
    """
    Procesa un certificado: genera serial, QR token, PDF, lo envía por correo y actualiza estado.
    """
    try:
        certificate.serial = f"LANIA-{datetime.now().strftime('%Y')}-{secrets.token_hex(4).upper()}"
        certificate.qr_token = str(uuid.uuid4())

        try:
            template_pdf_path = "app/static/Formato constancias.pdf"
            competencies_list = course.get("competencies", "").split('\n') if course.get("competencies") else []
            docente_specialty = participant.get("specialty")
            course_type_str = course.get("course_type_str", "Curso") 

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
                course_type_str=course_type_str,
                course_date=course["start_date"].strftime("%d/%m/%Y"),
                competencies=competencies_list,
                docente_specialty=docente_specialty
            )
            
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
                        course_type_str=course_type_str,
                        pdf_content=pdf_bytes,
                        serial=certificate.serial
                    )
                    logger.info(f"Correo del certificado {certificate.serial} enviado a {participant['email']}.")
                except Exception as e:
                    logger.error(f"FALLO EL ENVÍO DE CORREO para {certificate.serial}: {e}")

            certificate.issued_at = datetime.now(timezone.utc)
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
        raise e