import uuid
import secrets
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException
import logging

from app.models.certificado import Certificado
from app.models.inscripciones import Inscripcion
from app.schemas.certificado import CertificadoCreate
from app.services.pdf_service import generate_certificate_pdf # Asumimos que pdf_service.py está adaptado
from app.services.email_service import send_certificate_email

logger = logging.getLogger(__name__)

def issue_single_certificate(db: Session, inscripcion: Inscripcion) -> Certificado:
    """
    Crea, genera el PDF, envía por correo y guarda un único certificado para una inscripción.
    """
    # 1. Verificar si ya existe un certificado para esta inscripción
    existing_cert = db.query(Certificado).filter(Certificado.inscripcion_id == inscripcion.id).first()
    if existing_cert:
        raise HTTPException(status_code=409, detail=f"La constancia para '{inscripcion.participante.nombre_completo}' ya fue emitida (Folio: {existing_cert.folio}).")

    # 2. Crear la entidad del certificado en la base de datos
    nuevo_certificado = Certificado(
        inscripcion_id=inscripcion.id,
        folio=f"LANIA-{datetime.now().strftime('%Y')}-{secrets.token_hex(4).upper()}",
        fecha_emision=datetime.now(timezone.utc),
        qr_token=str(uuid.uuid4())
    )
    db.add(nuevo_certificado)
    db.flush()  # Para obtener el ID del nuevo certificado

    # 3. Preparar datos para el PDF y el correo
    producto = inscripcion.producto_educativo
    participante = inscripcion.participante
    
    # Lógica de competencias (simplificada)
    competencias_list = []
    if producto.tipo_producto == 'CURSO_EDUCATIVO' and producto.competencias:
        try:
            # Asumimos que las competencias son una lista de strings en formato JSON
            import json
            competencias_list = json.loads(producto.competencias)
        except (json.JSONDecodeError, TypeError):
            # Si no es un JSON válido, lo tratamos como texto plano separado por saltos de línea
            competencias_list = [c.strip() for c in producto.competencias.split('\n') if c.strip()]

    # 4. Generar el contenido del PDF
    pdf_bytes = generate_certificate_pdf(
        participant_name=participante.nombre_completo,
        course_name=producto.nombre,
        hours=producto.horas,
        issue_date=nuevo_certificado.fecha_emision.date(),
        serial=nuevo_certificado.folio,
        qr_token=nuevo_certificado.qr_token,
        course_modality=producto.modalidad.value,
        course_date=producto.fecha_inicio.strftime("%d de %B de %Y"),
        competencies=competencias_list
    )
    
    # 5. Enviar el correo electrónico con el PDF adjunto
    send_certificate_email(
        recipient_email=participante.email_personal,
        recipient_name=participante.nombre_completo,
        course_name=producto.nombre,
        pdf_content=pdf_bytes,
        serial=nuevo_certificado.folio
    )

    db.commit()
    db.refresh(nuevo_certificado)
    
    return nuevo_certificado

def issue_and_send_bulk_certificates_for_product(db: Session, producto_id: int):
    """
    Orquesta la emisión y envío masivo de certificados para todos los participantes
    de un producto educativo que aún no tienen una constancia.
    """
    # Cargar inscripciones junto con sus participantes y productos para evitar N+1 queries
    inscripciones_sin_certificado = db.query(Inscripcion).options(
        joinedload(Inscripcion.participante),
        joinedload(Inscripcion.producto_educativo)
    ).outerjoin(Certificado).filter(
        Inscripcion.producto_educativo_id == producto_id,
        Certificado.id == None
    ).all()

    if not inscripciones_sin_certificado:
        raise HTTPException(status_code=404, detail="No hay participantes nuevos a los que emitir constancias para este producto.")

    results = {"success": [], "errors": []}

    for inscripcion in inscripciones_sin_certificado:
        try:
            certificado_emitido = issue_single_certificate(db, inscripcion)
            results["success"].append({
                "participante": inscripcion.participante.nombre_completo,
                "folio": certificado_emitido.folio
            })
        except Exception as e:
            db.rollback() # Revertir la transacción para esta inscripción fallida
            results["errors"].append({
                "participante": inscripcion.participante.nombre_completo,
                "error": str(e)
            })

    return results