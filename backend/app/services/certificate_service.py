import uuid
import secrets
import logging
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException

from app.models.inscripciones import Inscripcion
from app.models.certificado import Certificado
from app.services.pdf_service import generate_certificate_pdf
from app.services.email_service import send_certificate_email

logger = logging.getLogger(__name__)

def issue_single_certificate(db: Session, inscripcion_id: int) -> Certificado:
    inscripcion = db.query(Inscripcion).options(
        joinedload(Inscripcion.participante),
        joinedload(Inscripcion.producto_educativo)
    ).filter(Inscripcion.id == inscripcion_id).first()

    if not inscripcion:
        raise HTTPException(status_code=404, detail=f"Inscripción con ID {inscripcion_id} no encontrada.")
    if inscripcion.certificado:
        raise HTTPException(status_code=409, detail=f"Esta inscripción ya tiene un certificado emitido.")

    producto = inscripcion.producto_educativo
    participante = inscripcion.participante
    
    competencias_list = []
    if producto.tipo_producto == 'CURSO_EDUCATIVO' and producto.competencias:
        try:
            competencias_list = json.loads(producto.competencias)
        except (json.JSONDecodeError, TypeError):
            competencias_list = [c.strip() for c in producto.competencias.split('\n') if c.strip()]
    
    validation_token = str(uuid.uuid4())
    
    # ✅ CORRECCIÓN: Usamos 'url_validacion' que es el nombre correcto en tu modelo.
    nuevo_certificado = Certificado(
        inscripcion_id=inscripcion.id,
        folio=f"LANIA-{datetime.now().strftime('%Y')}-{secrets.token_hex(4).upper()}",
        fecha_emision=datetime.now(timezone.utc),
        url_validacion=f"http://localhost:4200/verificar/{validation_token}"
    )

    try:
        # ✅ CORRECCIÓN: Se pasan los argumentos correctos a la función de generar PDF.
        pdf_bytes = generate_certificate_pdf(
            participant_name=participante.nombre_completo,
            course_name=producto.nombre,
            hours=producto.horas,
            issue_date=nuevo_certificado.fecha_emision.date(),
            template_path="app/static/Formato constancias.pdf",
            serial=nuevo_certificado.folio,
            qr_token=validation_token,
            course_date=producto.fecha_inicio.strftime("%d de %B de %Y"),
            competencies=competencias_list
        )
    except Exception as e:
        logger.error(f"Error al generar PDF para inscripción {inscripcion.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno al generar el archivo PDF: {e}")

    try:
        send_certificate_email(
            recipient_email=participante.email_personal,
            recipient_name=participante.nombre_completo,
            course_name=producto.nombre,
            pdf_content=pdf_bytes,
            serial=nuevo_certificado.folio
        )
    except Exception as e:
        logger.error(f"FALLO EL ENVÍO DE CORREO para certificado {nuevo_certificado.folio}: {e}")

    db.add(nuevo_certificado)
    db.commit()
    db.refresh(nuevo_certificado)
    
    return nuevo_certificado

def issue_and_send_bulk_certificates_for_product(db: Session, producto_id: int):
    inscripciones_sin_certificado = db.query(Inscripcion).filter(
        Inscripcion.producto_educativo_id == producto_id,
        ~Inscripcion.certificado.has()
    ).all()

    if not inscripciones_sin_certificado:
        raise HTTPException(status_code=400, detail="Todos los participantes de este producto ya tienen una constancia emitida.")

    results = {"success": [], "errors": []}
    for inscripcion in inscripciones_sin_certificado:
        try:
            certificado_emitido = issue_single_certificate(db, inscripcion.id)
            results["success"].append({
                "participante": inscripcion.participante.nombre_completo,
                "folio": certificado_emitido.folio
            })
        except Exception as e:
            db.rollback()
            error_detail = getattr(e, 'detail', str(e))
            logger.error(f"Error en emisión masiva para {inscripcion.participante.nombre_completo}: {error_detail}")
            results["errors"].append({
                "participante": inscripcion.participante.nombre_completo,
                "error": error_detail
            })
            
    return results