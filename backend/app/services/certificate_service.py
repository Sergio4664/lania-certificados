import uuid
import secrets
import logging
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException

# Modelos y esquemas
from app.models.inscripciones import Inscripcion
from app.models.certificado import Certificado
from app.models.participante import Participante
from app.models.docente import Docente
from app.models.producto_educativo import ProductoEducativo

# Servicios
from app.services.pdf_service import generate_certificate_pdf
from app.services.email_service import send_certificate_email

logger = logging.getLogger(__name__)

def _generate_and_send_certificate(
    db: Session,
    inscripcion: Inscripcion,
    entity_type: str, # 'participante' o 'docente'
    docente_specialty: str | None = None
) -> Certificado:
    """
    Función interna privada que genera el PDF, lo envía por correo y guarda el certificado.
    """
    producto = inscripcion.producto_educativo
    participante = inscripcion.participante
    
    # Crear el certificado en memoria
    validation_token = str(uuid.uuid4())
    nuevo_certificado = Certificado(
        inscripcion_id=inscripcion.id,
        folio=f"LANIA-{datetime.now().strftime('%Y')}-{secrets.token_hex(4).upper()}",
        fecha_emision=datetime.now(timezone.utc),
        url_validacion=f"http://localhost:4200/verificar/{validation_token}" # Ajusta esta URL a tu dominio final
    )

    # Generar el PDF
    try:
        product_type_str = producto.tipo_producto.value.replace('_', ' ').title()
        pdf_bytes = generate_certificate_pdf(
            participant_name=participante.nombre_completo,
            course_name=producto.nombre,
            hours=producto.horas,
            issue_date=nuevo_certificado.fecha_emision.date(),
            template_path="app/static/Formato constancias.pdf",
            serial=nuevo_certificado.folio,
            qr_token=validation_token,
            course_date=producto.fecha_inicio.strftime("%d de %B de %Y"),
            entity_type=entity_type,
            product_type_str=product_type_str,
            docente_specialty=docente_specialty
        )
    except Exception as e:
        logger.error(f"Error al generar PDF para inscripción {inscripcion.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno al generar el archivo PDF: {e}")

    # Enviar correo
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

    # Guardar en BD
    db.add(nuevo_certificado)
    db.commit()
    db.refresh(nuevo_certificado)
    return nuevo_certificado

def issue_for_participant(db: Session, inscripcion_id: int) -> Certificado:
    """Función pública para emitir certificado a un participante."""
    inscripcion = db.query(Inscripcion).filter(Inscripcion.id == inscripcion_id).first()
    if not inscripcion:
        raise HTTPException(status_code=404, detail=f"Inscripción con ID {inscripcion_id} no encontrada.")
    if inscripcion.certificado:
        raise HTTPException(status_code=409, detail="Esta inscripción ya tiene un certificado emitido.")
        
    return _generate_and_send_certificate(db, inscripcion, entity_type='participante')

def issue_for_docente(db: Session, producto_id: int, docente_id: int) -> Certificado:
    """Función pública para emitir certificado a un docente."""
    docente = db.query(Docente).filter(Docente.id == docente_id).first()
    producto = db.query(ProductoEducativo).filter(ProductoEducativo.id == producto_id).first()
    if not docente or not producto:
        raise HTTPException(status_code=404, detail="Producto o docente no encontrado.")

    # Buscar o crear un "participante sombra" para el docente
    participante = db.query(Participante).filter(Participante.email_personal == docente.email_institucional).first()
    if not participante:
        participante = Participante(
            nombre_completo=docente.nombre_completo,
            email_personal=docente.email_institucional,
            email_institucional=docente.email_institucional,
            telefono=docente.telefono,
            whatsapp=docente.whatsapp
        )
        db.add(participante)
        db.flush()

    # Buscar o crear una "inscripción sombra" para el docente en este curso
    inscripcion = db.query(Inscripcion).filter(
        Inscripcion.producto_educativo_id == producto_id,
        Inscripcion.participante_id == participante.id
    ).first()
    if not inscripcion:
        inscripcion = Inscripcion(
            producto_educativo_id=producto_id,
            participante_id=participante.id
        )
        db.add(inscripcion)
        db.commit() # Commit para asegurar que la inscripción exista antes de crear el certificado
        db.refresh(inscripcion)

    if inscripcion.certificado:
        raise HTTPException(status_code=409, detail="Este docente ya tiene un certificado para este producto.")
        
    return _generate_and_send_certificate(db, inscripcion, entity_type='docente', docente_specialty=docente.especialidad)


def issue_and_send_bulk_certificates_for_product(db: Session, producto_id: int):
    """Orquesta la emisión masiva para participantes Y docentes."""
    producto = db.query(ProductoEducativo).options(joinedload(ProductoEducativo.docentes)).filter(ProductoEducativo.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado.")

    results = {"success": [], "errors": []}
    
    # 1. Emitir para Participantes
    inscripciones_participantes = db.query(Inscripcion).filter(
        Inscripcion.producto_educativo_id == producto_id,
        ~Inscripcion.certificado.has()
    ).all()

    for inscripcion in inscripciones_participantes:
        # Evitar procesar inscripciones de docentes si ya existen
        is_docente_inscription = db.query(Docente).filter(Docente.email_institucional == inscripcion.participante.email_personal).first()
        if is_docente_inscription:
            continue
        try:
            cert = issue_for_participant(db, inscripcion.id)
            results["success"].append({"participante": inscripcion.participante.nombre_completo, "folio": cert.folio})
        except Exception as e:
            db.rollback()
            error_detail = getattr(e, 'detail', str(e))
            results["errors"].append({"participante": inscripcion.participante.nombre_completo, "error": error_detail})

    # 2. Emitir para Docentes
    for docente in producto.docentes:
        try:
            cert = issue_for_docente(db, producto_id, docente.id)
            results["success"].append({"participante": docente.nombre_completo, "folio": cert.folio})
        except HTTPException as e:
             if e.status_code == 409: # Si ya existe, no es un error.
                continue
             results["errors"].append({"participante": docente.nombre_completo, "error": e.detail})
        except Exception as e:
            db.rollback()
            error_detail = getattr(e, 'detail', str(e))
            results["errors"].append({"participante": docente.nombre_completo, "error": error_detail})
            
    return results