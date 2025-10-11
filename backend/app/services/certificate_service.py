# backend/app/services/certificate_service.py
import logging
import os
from sqlalchemy.orm import Session
from fastapi import HTTPException

# Importamos los modelos y los otros servicios
from app import models
from app.services.pdf_service import generate_certificate_pdf
from app.services.email_service import send_certificate_email

logger = logging.getLogger(__name__)


def emitir_certificado_completo(db: Session, certificado: models.Certificado):
    """
    Orquesta todo el proceso: genera el PDF, lo guarda y envía el correo.
    """
    try:
        # 1. Extraer toda la información necesaria de las relaciones del objeto
        inscripcion = certificado.inscripcion
        if not inscripcion:
            raise ValueError("El certificado no está asociado a ninguna inscripción.")
        
        participante = inscripcion.participante
        producto = inscripcion.producto_educativo

        nombres_docentes = ", ".join([d.nombre_completo for d in producto.docentes]) or "N/A"
        fechas_producto_str = f"del {producto.fecha_inicio.strftime('%d de %B de %Y')} al {producto.fecha_fin.strftime('%d de %B de %Y')}"

        # 2. Generar el contenido del PDF llamando a pdf_service
        pdf_bytes = generate_certificate_pdf(
            participant_name=participante.nombre_completo,
            course_name=producto.nombre,
            hours=producto.horas,
            issue_date=certificado.fecha_emision,
            serial=certificado.folio,
            qr_token=certificado.folio,
            course_dates_str=fechas_producto_str,
            docente_names_str=nombres_docentes
        )

        # 3. Guardar el archivo PDF en el servidor
        os.makedirs("certificates", exist_ok=True)
        pdf_filename = f"certificates/{certificado.folio}.pdf"
        with open(pdf_filename, "wb") as f:
            f.write(pdf_bytes)

        # 4. Enviar el correo electrónico al participante (si tiene email)
        if participante.email_personal:
            try:
                send_certificate_email(
                    recipient_email=participante.email_personal,
                    recipient_name=participante.nombre_completo,
                    course_name=producto.nombre,
                    pdf_content=pdf_bytes,
                    serial=certificado.folio
                )
            except Exception as e:
                # Si falla el correo, solo se registra, no se detiene el proceso
                logger.error(f"FALLO EL ENVÍO DE CORREO para el certificado {certificado.folio}: {e}")
        
        logger.info(f"Certificado {certificado.folio} emitido y procesado correctamente.")

    except Exception as e:
        logger.error(f"Error crítico en el proceso de emisión del certificado {certificado.id}: {e}")
        # Es importante relanzar la excepción para que el router sepa que algo salió mal
        raise HTTPException(status_code=500, detail=f"No se pudo generar el PDF o procesar el certificado: {e}")