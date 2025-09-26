#import uuid
import secrets
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.certificate import Certificate
from app.models.enums import CertificateStatus
from app.services.pdf_service import generate_certificate_pdf
import os
import logging

# --- NUEVAS IMPORTACIONES ---
from app.models.docente import Docente
from app.models.course import Course
# --- FIN DE NUEVAS IMPORTACIONES ---

logger = logging.getLogger(__name__)

def issue_certificate(db: Session, certificate: Certificate, participant: dict, course: dict) -> Certificate:
    """
    Procesa un certificado: genera serial, QR token, PDF y actualiza estado
    """
    try:
        certificate.serial = f"LANIA-{datetime.now().strftime('%Y')}-{secrets.token_hex(4).upper()}"
        certificate.qr_token = str(uuid.uuid4())
        
        try:
            template_pdf_path = "app/static/Formato constancias.pdf"
        
            competencies_list = course.get("competencies", "").split('\n') if course.get("competencies") else []
            
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
                competencies=competencies_list
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

# --- NUEVA FUNCIÓN AÑADIDA ---
def create_certificate_for_docente(db: Session, docente_id: int):
    """
    Crea un certificado en PDF para un docente específico.
    """
    docente = db.query(Docente).filter(Docente.id == docente_id).first()
    if not docente:
        raise ValueError("Docente no encontrado")

    # Se asume que la constancia se genera para el primer curso asociado al docente.
    course_taught = db.query(Course).filter(Course.docentes.any(id=docente.id)).first()
    if not course_taught:
        raise ValueError("El docente no está asociado a ningún curso")

    docente_name = f"{docente.first_name} {docente.last_name}"
    serial = f"LANIA-DOCENTE-{datetime.now().strftime('%Y')}-{secrets.token_hex(4).upper()}"
    qr_token = str(uuid.uuid4())
    
    # Lista de competencias (puedes ajustarla si es necesario)
    competencies_list = course_taught.competencies.split('\n') if course_taught.competencies else []

    try:
        pdf_bytes = generate_certificate_pdf(
            participant_name=docente_name,
            course_name=course_taught.name,
            hours=course_taught.hours,
            issue_date=datetime.now().date(),
            template_path="app/static/Formato constancias.pdf",
            kind="constancia", # O el tipo que corresponda para docentes
            serial=serial,
            qr_token=qr_token,
            course_modality=course_taught.modality.value,
            course_date=course_taught.start_date.strftime("%d/%m/%Y"),
            competencies=competencies_list
        )

        os.makedirs("certificates", exist_ok=True)
        pdf_filename = f"certificates/{serial}.pdf"
        with open(pdf_filename, "wb") as f:
            f.write(pdf_bytes)
        
        return pdf_filename

    except Exception as e:
        logger.error(f"Error al generar el PDF para el docente: {e}")
        raise
# --- FIN DEL CÓDIGO AÑADIDO ---