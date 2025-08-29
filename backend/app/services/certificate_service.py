# app/services/certificate_service.py
import uuid
import secrets
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.certificate import Certificate
from app.models.enums import CertificateStatus
from app.services.pdf_service import generate_certificate_pdf
import os

def issue_certificate(db: Session, certificate: Certificate, participant: dict, course: dict) -> Certificate:
    """
    Procesa un certificado: genera serial, QR token, PDF y actualiza estado
    """
    
    # Generar serial único
    certificate.serial = f"LANIA-{datetime.now().strftime('%Y')}-{secrets.token_hex(4).upper()}"
    
    # Generar token único para QR
    certificate.qr_token = str(uuid.uuid4())
    
    # Generar PDF
    try:
        pdf_bytes = generate_certificate_pdf(
            participant_name=participant["full_name"],
            course_name=course["name"],
            hours=course["hours"],
            issue_date=datetime.now().date()
        )
        certificate.pdf_content = pdf_bytes
        
        # Crear directorio si no existe
        os.makedirs("certificates", exist_ok=True)
        
        # Guardar archivo físico (opcional)
        pdf_filename = f"certificates/{certificate.serial}.pdf"
        with open(pdf_filename, "wb") as f:
            f.write(pdf_bytes)
        certificate.pdf_path = pdf_filename
        
        # Actualizar timestamps y estado
        certificate.issued_at = datetime.now(timezone.utc)
        certificate.updated_at = datetime.now(timezone.utc)
        certificate.status = CertificateStatus.LISTO_PARA_DESCARGAR
        
    except Exception as e:
        print(f"Error generando PDF: {e}")
        certificate.status = CertificateStatus.EN_PROCESO
    
    # Guardar cambios
    db.commit()
    db.refresh(certificate)
    
    return certificate