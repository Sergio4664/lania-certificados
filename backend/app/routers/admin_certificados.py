#Ruta: backend/app/routers/admin_certificados.py
import datetime
import os
import json
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List, Optional, Dict
from pathlib import Path

from app.database import get_db
from app import models

from app.core.config import get_settings
from app.tasks import emitir_y_enviar_certificados_masivamente_job

from app.schemas.certificado import (
    Certificado,
    CertificadoCreate
)
CertificadoOut = Certificado

from app.services.certificate_service import generate_certificate
from app.services.email_service import send_certificate_email
from app.routers.dependencies import get_current_admin_user

settings = get_settings()

router = APIRouter(
    prefix="/admin/certificados",
    tags=["Admin - Certificados"],
    dependencies=[Depends(get_current_admin_user)]
)

# ============================================================
# GET: Todos los certificados
# ============================================================
@router.get("/", response_model=List[CertificadoOut])
def read_all_certificados(db: Session = Depends(get_db)):
    certificados = (
        db.query(models.Certificado)
        .options(
            selectinload(models.Certificado.inscripcion)
                .selectinload(models.Inscripcion.participante),
            selectinload(models.Certificado.inscripcion)
                .selectinload(models.Inscripcion.producto_educativo),
            selectinload(models.Certificado.docente),
            selectinload(models.Certificado.producto_educativo)
        )
        .order_by(models.Certificado.id.desc())
        .all()
    )
    return certificados


# ============================================================
# GET: Certificados de participantes (paginado)
# ============================================================
@router.get("/participantes", response_model=List[CertificadoOut])
def read_certificados_participantes(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 15
):
    query = (
        db.query(models.Certificado)
        .filter(models.Certificado.inscripcion_id.isnot(None))
        .options(
            selectinload(models.Certificado.inscripcion)
                .selectinload(models.Inscripcion.participante),
            selectinload(models.Certificado.inscripcion)
                .selectinload(models.Inscripcion.producto_educativo)
        )
        .order_by(models.Certificado.id.desc())
        .offset(skip)
        .limit(limit)
    )

    return query.all()


# ============================================================
# GET: Certificados de docentes (paginado)
# ============================================================
@router.get("/docentes", response_model=List[CertificadoOut])
def read_certificados_docentes(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 15
):
    query = (
        db.query(models.Certificado)
        .filter(models.Certificado.docente_id.isnot(None))
        .options(
            selectinload(models.Certificado.docente),
            selectinload(models.Certificado.producto_educativo)
        )
        .order_by(models.Certificado.id.desc())
        .offset(skip)
        .limit(limit)
    )

    return query.all()


# ============================================================
# GET: Certificado único por ID
# ============================================================
@router.get("/{certificado_id}", response_model=CertificadoOut)
def read_single_certificado(certificado_id: int, db: Session = Depends(get_db)):
    certificado = (
        db.query(models.Certificado)
        .options(
            selectinload(models.Certificado.inscripcion)
                .selectinload(models.Inscripcion.participante),
            selectinload(models.Certificado.inscripcion)
                .selectinload(models.Inscripcion.producto_educativo),
            selectinload(models.Certificado.docente),
            selectinload(models.Certificado.producto_educativo)
        )
        .filter(models.Certificado.id == certificado_id)
        .first()
    )

    if not certificado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificado no encontrado"
        )

    return certificado


# ============================================================
# POST: Emitir certificado de participante
# ============================================================
@router.post("/participante", response_model=CertificadoOut, status_code=status.HTTP_201_CREATED)
async def issue_certificate_to_participant(  # <--- CORRECCIÓN 1: Se agregó 'async'
    certificado_create: CertificadoCreate,
    db: Session = Depends(get_db)
):
    if not certificado_create.inscripcion_id:
        raise HTTPException(status_code=400, detail="Se requiere 'inscripcion_id'.")

    # Obtener inscripción
    db_inscripcion = (
        db.query(models.Inscripcion)
        .options(
            joinedload(models.Inscripcion.participante),
            joinedload(models.Inscripcion.producto_educativo)
                .selectinload(models.ProductoEducativo.docentes)
        )
        .filter(models.Inscripcion.id == certificado_create.inscripcion_id)
        .first()
    )

    if not db_inscripcion:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")

    con_competencias_check = certificado_create.con_competencias or False

    # Revisar duplicados
    existing = (
        db.query(models.Certificado)
        .filter(
            models.Certificado.inscripcion_id == certificado_create.inscripcion_id,
            models.Certificado.con_competencias == con_competencias_check
        )
        .first()
    )

    if existing:
        tipo = "con competencias" if con_competencias_check else "normal"
        raise HTTPException(
            status_code=409,
            detail=f"Ya existe un certificado {tipo} (Folio: {existing.folio})."
        )

    producto = db_inscripcion.producto_educativo
    instructor_name = (
        producto.docentes[0].nombre_completo
        if producto.docentes else "Equipo de Instructores LANIA"
    )

    # Procesar lista de competencias
    competencias_list = []
    if con_competencias_check and producto.competencias:
        try:
            raw_list = json.loads(producto.competencias)
            if isinstance(raw_list, list):
                competencias_list = [str(item) for item in raw_list]
        except json.JSONDecodeError:
            competencias_list = []

    if con_competencias_check and not competencias_list:
        raise HTTPException(
            status_code=400,
            detail="Se marcó 'con_competencias' pero no hay competencias válidas."
        )

    # Generar certificado
    try:
        folio, path = generate_certificate(
            participant_name=db_inscripcion.participante.nombre_completo,
            course_name=producto.nombre,
            tipo_producto=producto.tipo_producto,
            modalidad=producto.modalidad.value if producto.modalidad else "No especificada",
            course_hours=producto.horas,
            instructor_name=instructor_name,
            is_docente=False,
            course_date_str="",
            con_competencias=con_competencias_check,
            competencias_list=competencias_list
        )
    except Exception as e:
        raise HTTPException(500, f"Error al generar PDF: {e}")

    nuevo_cert = models.Certificado(
        inscripcion_id=db_inscripcion.id,
        producto_educativo_id=producto.id,
        archivo_path=path,
        folio=folio,
        fecha_emision=datetime.datetime.now(datetime.timezone.utc),
        con_competencias=con_competencias_check
    )

    db.add(nuevo_cert)
    db.commit()
    db.refresh(nuevo_cert)

    return nuevo_cert


# ============================================================
# POST: Emitir certificado docente
# ============================================================
@router.post("/docente", response_model=CertificadoOut, status_code=status.HTTP_201_CREATED)
def issue_certificate_to_docente(
    certificado_create: CertificadoCreate,
    db: Session = Depends(get_db)
):
    if not certificado_create.docente_id or not certificado_create.producto_educativo_id:
        raise HTTPException(400, "Se requiere 'docente_id' y 'producto_educativo_id'.")

    db_docente = db.query(models.Docente).filter(models.Docente.id == certificado_create.docente_id).first()
    if not db_docente:
        raise HTTPException(404, "Docente no encontrado")

    db_producto = db.query(models.ProductoEducativo).filter(models.ProductoEducativo.id == certificado_create.producto_educativo_id).first()
    if not db_producto:
        raise HTTPException(404, "Producto educativo no encontrado")

    existing = (
        db.query(models.Certificado)
        .filter(
            models.Certificado.docente_id == certificado_create.docente_id,
            models.Certificado.producto_educativo_id == certificado_create.producto_educativo_id
        )
        .first()
    )

    if existing:
        raise HTTPException(
            409,
            f"Ya existe un certificado para este docente en este producto (Folio: {existing.folio})."
        )

    course_date_str = (
        f"{db_producto.fecha_inicio.strftime('%d/%m/%Y')} al {db_producto.fecha_fin.strftime('%d/%m/%Y')}"
        if db_producto.fecha_inicio and db_producto.fecha_fin else "Fecha no especificada"
    )

    folio, path = generate_certificate(
        participant_name=db_docente.nombre_completo,
        course_name=db_producto.nombre,
        tipo_producto=db_producto.tipo_producto,
        modalidad=db_producto.modalidad.value if db_producto.modalidad else "No especificada",
        course_hours=db_producto.horas,
        instructor_name=db_docente.especialidad,
        is_docente=True,
        course_date_str=course_date_str,
        con_competencias=False,
        competencias_list=None
    )

    nuevo = models.Certificado(
        docente_id=db_docente.id,
        producto_educativo_id=db_producto.id,
        archivo_path=path,
        folio=folio,
        fecha_emision=datetime.datetime.now(datetime.timezone.utc),
        con_competencias=False
    )

    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return nuevo


# ============================================================
# POST: Enviar certificado por email
# ============================================================
@router.post("/{certificado_id}/enviar", status_code=status.HTTP_200_OK)
async def send_certificate_email_by_id(
    certificado_id: int,
    body: dict = Body(default={"email_type": "personal"}),
    db: Session = Depends(get_db)
):
    certificado = (
        db.query(models.Certificado)
        .options(
            selectinload(models.Certificado.inscripcion)
                .selectinload(models.Inscripcion.participante),
            selectinload(models.Certificado.producto_educativo),
            selectinload(models.Certificado.docente)
        )
        .filter(models.Certificado.id == certificado_id)
        .first()
    )

    if not certificado:
        raise HTTPException(404, "Certificado no encontrado")

    producto_nombre = (
        certificado.producto_educativo.nombre
        if certificado.producto_educativo else
        certificado.inscripcion.producto_educativo.nombre
        if certificado.inscripcion and certificado.inscripcion.producto_educativo else
        "Producto desconocido"
    )

    recipient_name = (
        certificado.inscripcion.participante.nombre_completo
        if certificado.inscripcion else
        certificado.docente.nombre_completo
    )

    email_type = body.get("email_type", "personal")

    if certificado.inscripcion:
        email = certificado.inscripcion.participante.email_personal
    else:
        email = (
            certificado.docente.email_institucional
            if email_type == "institucional" else certificado.docente.email_personal
        )

    if not email:
        raise HTTPException(400, "El destinatario no tiene email válido")

    if not certificado.archivo_path or not os.path.exists(certificado.archivo_path):
        raise HTTPException(404, "PDF no encontrado en el servidor")

    pdf_bytes = Path(certificado.archivo_path).read_bytes()

    send_certificate_email(
        recipient_email=email,
        recipient_name=recipient_name,
        course_name=producto_nombre,
        pdf_content=pdf_bytes,
        serial=certificado.folio
    )

    return {"message": f"Certificado enviado a {email}"}


# ============================================================
# DELETE: Eliminar certificado + archivo físico
# ============================================================
@router.delete("/{certificado_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_certificado(certificado_id: int, db: Session = Depends(get_db)):
    certificado = (
        db.query(models.Certificado)
        .filter(models.Certificado.id == certificado_id)
        .first()
    )

    if not certificado:
        # <--- CORRECCIÓN 2: Se corrigió el SyntaxError
        raise HTTPException(404, "Certificado no encontrado")

    archivo = certificado.archivo_path

    db.delete(certificado)
    db.commit()

    if archivo and os.path.exists(archivo):
        try:
            os.remove(archivo)
        except Exception as e:
            print(f"Error eliminando archivo físico: {e}")

    return None


# ============================================================
# GET: Descargar PDF por folio
# ============================================================
@router.get("/download/{folio}", response_class=FileResponse)
def download_certificado_by_folio(
    folio: str,
    db: Session = Depends(get_db),
    current_user: models.Administrador = Depends(get_current_admin_user)
):
    certificado = (
        db.query(models.Certificado)
        .filter(models.Certificado.folio == folio)
        .first()
    )

    if not certificado or not certificado.archivo_path:
        raise HTTPException(404, "Certificado no encontrado")

    if not os.path.exists(certificado.archivo_path):
        raise HTTPException(404, "Archivo PDF no encontrado")

    return FileResponse(
        certificado.archivo_path,
        media_type="application/pdf",
        filename=f"{folio}.pdf"
    )


# ============================================================
# POST: Emisión masiva (Celery)
# ============================================================
@router.post("/emitir-masivo/{producto_id}", status_code=status.HTTP_202_ACCEPTED)
def emitir_certificados_masivamente(
    producto_id: int,
    options: Dict = Body(default={"con_competencias": False}),
    db: Session = Depends(get_db)
):
    emitir_con_competencias = options.get("con_competencias", False)

    producto = (
        db.query(models.ProductoEducativo)
        .filter(models.ProductoEducativo.id == producto_id)
        .first()
    )

    if not producto:
        raise HTTPException(404, "Producto educativo no encontrado")

    job = emitir_y_enviar_certificados_masivamente_job.delay(
        producto_id,
        emitir_con_competencias
    )

    tipo = (
        "RECONOCIMIENTOS (competencias)"
        if emitir_con_competencias else "CONSTANCIAS (normales)"
    )

    return JSONResponse(
        status_code=202,
        content={
            "message": f"Tarea masiva de {tipo} encolada correctamente.",
            "job_id": job.id,
            "status_check_url": f"/admin/jobs/{job.id}"
        }
    )