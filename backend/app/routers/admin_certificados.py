# Ruta: backend/app/routers/admin_certificados.py
import datetime
import os
import json 
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.responses import FileResponse, JSONResponse # ✅ JSONResponse AÑADIDO
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List, Optional, Dict # ✅ Dict AÑADIDO (aunque ya existía en typing)

from pathlib import Path

from app.database import get_db
from app import models

# 🚨 NUEVOS IMPORTS PARA RQ Y CONFIGURACIÓN
from redis import Redis
from rq import Queue
from app.core.config import get_settings
from app.tasks import emitir_y_enviar_certificados_masivamente_job # 🚨 FUNCIÓN DE TAREA ASÍNCRONA

# --- ✅ 1. CORREÇÃO DE IMPORTAÇÃO ---
from app.schemas.certificado import (
    Certificado, 
    CertificadoCreate 
)
CertificadoOut = Certificado
# --- FIN DE CORRECCIÓN ---


from app.services.certificate_service import generate_certificate
from app.services.email_service import send_certificate_email
from app.routers.dependencies import get_current_admin_user

settings = get_settings() # ✅ OBTENER CONFIGURACIÓN GLOBAL

# 🚨 INICIALIZACIÓN DE LA COLA (Se hace una sola vez al cargar el módulo)
redis_conn = Redis.from_url(settings.REDIS_URL)
q = Queue(connection=redis_conn)

router = APIRouter(
    prefix="/admin/certificados",
    tags=["Admin - Certificados"],
    dependencies=[Depends(get_current_admin_user)]
)

@router.get(
    "/",
    response_model=List[CertificadoOut] 
)
def read_all_certificados(db: Session = Depends(get_db)):
    """
    Recupera todos los certificados de la base de datos CON DATOS ANIDADOS,
    ordenados por ID descendente.
    """
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


# 🔄 FUNCIÓN MODIFICADA: Implementa skip y limit para paginación fija de 15
@router.get(
    "/participantes",
    response_model=List[CertificadoOut], 
    summary="Obtener certificados de participantes (paginado)"
)
def read_certificados_participantes(
    db: Session = Depends(get_db),
    skip: int = 0, 
    limit: int = 15 
):
    """
    Recupera solo los certificados de participantes (con inscripcion_id),
    ordenados por ID descendente, con paginación (skip/limit).
    """
    query = (
        db.query(models.Certificado)
        .filter(models.Certificado.inscripcion_id.isnot(None)) # Filtra solo participantes
        .options(
            selectinload(models.Certificado.inscripcion)
            .selectinload(models.Inscripcion.participante),
            
            selectinload(models.Certificado.inscripcion)
            .selectinload(models.Inscripcion.producto_educativo)
        )
        .order_by(models.Certificado.id.desc())
        .offset(skip) # Aplicar offset
        .limit(limit) # Aplicar límite
    )
    
    certificados = query.all()
    return certificados


# 🔄 FUNCIÓN MODIFICADA: Implementa skip y limit para paginación fija de 15
@router.get(
    "/docentes",
    response_model=List[CertificadoOut], 
    summary="Obtener certificados de docentes (paginado)"
)
def read_certificados_docentes(
    db: Session = Depends(get_db),
    skip: int = 0, 
    limit: int = 15 
):
    """
    Recupera solo los certificados de docentes (con docente_id),
    ordenados por ID descendente, con paginación (skip/limit).
    """
    query = (
        db.query(models.Certificado)
        .filter(models.Certificado.docente_id.isnot(None)) # Filtra solo docentes
        .options(
            selectinload(models.Certificado.docente),
            selectinload(models.Certificado.producto_educativo) 
        )
        .order_by(models.Certificado.id.desc())
        .offset(skip) # Aplicar offset
        .limit(limit) # Aplicar límite
    )
    
    certificados = query.all()
    return certificados


@router.get("/{certificado_id}", response_model=CertificadoOut) 
def read_single_certificado(certificado_id: int, db: Session = Depends(get_db)):
    """
    Recupera un único certificado por su ID, cargando sus relaciones principales.
    """
    certificado = db.query(models.Certificado).options(
        selectinload(models.Certificado.inscripcion)
            .selectinload(models.Inscripcion.participante),
        selectinload(models.Certificado.inscripcion)
            .selectinload(models.Inscripcion.producto_educativo),
        selectinload(models.Certificado.docente),
        selectinload(models.Certificado.producto_educativo)
    ).filter(models.Certificado.id == certificado_id).first()

    if not certificado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificado no encontrado")

    return certificado


# --- ✅ 2. FUNCIÓN CORREGIDA (LÓGICA DE DUPLICADOS Y ESQUEMA) ---
@router.post("/participante", response_model=CertificadoOut, status_code=status.HTTP_201_CREATED)
def issue_certificate_to_participant(
    # Volvemos a usar el schema 'CertificadoCreate' que sí existe
    certificado_create: CertificadoCreate, 
    db: Session = Depends(get_db)
):
    """
    Emite un nuevo certificado para un participante a partir de una inscripción.
    Distinguen entre Constancia (normal) y Reconocimiento (con competencias).
    """
    
    if not certificado_create.inscripcion_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Se requiere 'inscripcion_id'.")

    db_inscripcion = db.query(models.Inscripcion).options(
        joinedload(models.Inscripcion.participante),
        joinedload(models.Inscripcion.producto_educativo)
            .selectinload(models.ProductoEducativo.docentes)
    ).filter(models.Inscripcion.id == certificado_create.inscripcion_id).first()

    if not db_inscripcion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inscripción no encontrada")

    # --- Lógica de comprobación de existencia CORREGIDA (LÍNEA CLAVE) ---
    con_competencias_check = certificado_create.con_competencias or False
    
    # Buscamos un certificado que coincida EXACTAMENTE en la inscripción Y el tipo
    existing_cert = db.query(models.Certificado).filter(
        models.Certificado.inscripcion_id == db_inscripcion.id,
        models.Certificado.con_competencias == con_competencias_check # <-- ESTO PERMITE AMBOS
    ).first()
    
    if existing_cert:
        tipo_constancia = "con competencias" if con_competencias_check else "normal"
        # ESTE É O ERRO 409 QUE ESTÁ RECEBENDO
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un certificado {tipo_constancia} (Folio: {existing_cert.folio}) para esta inscripción."
        )

    producto = db_inscripcion.producto_educativo
    instructor_name = producto.docentes[0].nombre_completo if producto.docentes else "Equipo de Instructores LANIA"

    # --- Preparar la lista de competencias ---
    competencias_list = []
    if con_competencias_check and producto.competencias:
        try:
            competencias_list = json.loads(producto.competencias)
            if not isinstance(competencias_list, list):
                        competencias_list = []
        except json.JSONDecodeError:
            print(f"Error: El campo 'competencias' del producto {producto.id} no es un JSON válido.")
            competencias_list = []
            
    if con_competencias_check and (not competencias_list or not isinstance(competencias_list, list)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se marcó 'con_competencias' pero el producto educativo no tiene competencias válidas registradas."
        )

    # --- Llamar al servicio con todos los argumentos ---
    try:
        folio, file_path_obj = generate_certificate(
            participant_name=db_inscripcion.participante.nombre_completo,
            course_name=producto.nombre,
            tipo_producto=producto.tipo_producto, 
            modalidad=producto.modalidad.value if producto.modalidad else 'No especificada', 
            course_hours=producto.horas,
            instructor_name=instructor_name,
            is_docente=False,
            course_date_str="",
            con_competencias=con_competencias_check,
            competencias_list=competencias_list
        )
        file_path = str(file_path_obj)
    except Exception as e:
        print(f"Error generando certificado PDF: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al generar el archivo PDF del certificado: {e}")

    # --- Guardar en DB ---
    nuevo_certificado = models.Certificado(
        inscripcion_id=db_inscripcion.id,
        producto_educativo_id=producto.id, # Guardamos la referencia al producto
        archivo_path=file_path,
        folio=folio,
        fecha_emision=datetime.datetime.now(datetime.timezone.utc),
        con_competencias=con_competencias_check
    )

    try:
        db.add(nuevo_certificado)
        db.commit()
        db.refresh(nuevo_certificado)
    except Exception as e:
        db.rollback()
        print(f"Error guardando certificado en DB: {e}")
        if file_path and os.path.exists(file_path):
            try: os.remove(file_path); print(f"Archivo PDF huérfano eliminado: {file_path}")
            except OSError as rm_err: print(f"Error eliminando archivo PDF huérfano {file_path}: {rm_err}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al guardar el certificado en la base de datos: {e}")

    return nuevo_certificado


@router.post("/docente", response_model=CertificadoOut, status_code=status.HTTP_201_CREATED)
def issue_certificate_to_docente(
    # Volvemos a usar el schema 'CertificadoCreate'
    certificado_create: CertificadoCreate, 
    db: Session = Depends(get_db)
):
    """
    Emite una nueva constancia de ponente para un docente.
    """
    if not certificado_create.docente_id or not certificado_create.producto_educativo_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Se requiere 'docente_id' y 'producto_educativo_id'.")

    db_docente = db.query(models.Docente).filter(models.Docente.id == certificado_create.docente_id).first()
    if not db_docente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente no encontrado")

    db_producto = db.query(models.ProductoEducativo).filter(models.ProductoEducativo.id == certificado_create.producto_educativo_id).first()
    if not db_producto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto educativo no encontrado")

    # Comprobar existencia (sin cambios)
    existing_cert = db.query(models.Certificado).filter(
        models.Certificado.docente_id == db_docente.id,
        models.Certificado.producto_educativo_id == db_producto.id
    ).first()
    if existing_cert:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un certificado (ID: {existing_cert.id}, Folio: {existing_cert.folio}) para este docente en este producto."
        )

    # --- Llamar al servicio con todos los argumentos ---
    course_date_str = f"{db_producto.fecha_inicio.strftime('%d/%m/%Y')} al {db_producto.fecha_fin.strftime('%d/%m/%Y')}" if db_producto.fecha_inicio and db_producto.fecha_fin else "Fecha no especificada"

    try:
        folio, file_path_obj = generate_certificate(
            participant_name=db_docente.nombre_completo,
            course_name=db_producto.nombre,
            tipo_producto=db_producto.tipo_producto, 
            modalidad=db_producto.modalidad.value if db_producto.modalidad else 'No especificada',
            course_hours=db_producto.horas,
            instructor_name=db_docente.especialidad, # Usamos especialidad para el campo "instructor"
            is_docente=True,
            course_date_str=course_date_str,
            con_competencias=False,
            competencias_list=None
        )
        file_path = str(file_path_obj)
    except Exception as e:
        print(f"Error generando constancia PDF para docente: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al generar el archivo PDF de la constancia: {e}")

    # --- Guardar en DB (sin cambios) ---
    nuevo_certificado = models.Certificado(
        docente_id=db_docente.id,
        producto_educativo_id=db_producto.id,
        archivo_path=file_path,
        folio=folio,
        fecha_emision=datetime.datetime.now(datetime.timezone.utc),
        con_competencias=False # Los docentes no tienen constancia de competencias
    )

    try:
        db.add(nuevo_certificado)
        db.commit()
        db.refresh(nuevo_certificado)
    except Exception as e:
        db.rollback()
        print(f"Error guardando constancia de docente en DB: {e}")
        if file_path and os.path.exists(file_path):
            try: os.remove(file_path); print(f"Archivo PDF huérfano eliminado: {file_path}")
            except OSError as rm_err: print(f"Error eliminando archivo PDF huérfano {file_path}: {rm_err}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al guardar la constancia en la base de datos: {e}")

    return nuevo_certificado


@router.post("/{certificado_id}/enviar", status_code=status.HTTP_200_OK)
async def send_certificate_email_by_id(
    certificado_id: int, 
    # Recibimos el tipo de email desde el frontend
    body: dict = Body(default={"email_type": "personal"}), 
    db: Session = Depends(get_db)
):
    """
    Localiza un certificado y lo reenvía por correo a su destinatario.
    """
    db_certificado = db.query(models.Certificado).options(
        selectinload(models.Certificado.inscripcion).selectinload(models.Inscripcion.participante),
        selectinload(models.Certificado.producto_educativo),
        selectinload(models.Certificado.docente)
    ).filter(models.Certificado.id == certificado_id).first()

    if not db_certificado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificado no encontrado")

    producto_nombre = "Nombre no disponible"
    # El certificado de docente tiene producto_educativo, el de participante lo tiene en la inscripcion
    if db_certificado.producto_educativo:
        producto_nombre = db_certificado.producto_educativo.nombre
    elif db_certificado.inscripcion and db_certificado.inscripcion.producto_educativo:
        producto_nombre = db_certificado.inscripcion.producto_educativo.nombre


    recipient_email = None
    recipient_name = "Destinatario"
    pdf_path_str = db_certificado.archivo_path
    serial = db_certificado.folio
    email_type = body.get("email_type", "personal") # Default a 'personal'

    if db_certificado.inscripcion and db_certificado.inscripcion.participante:
        # Participantes siempre usan email_personal
        recipient_email = db_certificado.inscripcion.participante.email_personal
        recipient_name = db_certificado.inscripcion.participante.nombre_completo
    
    elif db_certificado.docente:
        recipient_name = db_certificado.docente.nombre_completo
        # Docentes pueden elegir entre institucional o personal
        if email_type == "institucional":
            recipient_email = db_certificado.docente.email_institucional
        else:
            recipient_email = db_certificado.docente.email_personal
        
        # Fallback si el email elegido no existe, pero el otro sí
        if not recipient_email:
             recipient_email = db_certificado.docente.email_institucional or db_certificado.docente.email_personal

    if not recipient_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El destinatario del certificado no tiene un email válido.")

    if not pdf_path_str or not os.path.exists(pdf_path_str):
        print(f"Archivo PDF no encontrado para certificado ID {certificado_id}: {pdf_path_str}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El archivo PDF del certificado no fue encontrado en el servidor")

    try:
        pdf_path = Path(pdf_path_str)
        pdf_content_bytes = pdf_path.read_bytes()
    except Exception as read_err:
        print(f"Error leyendo el archivo PDF {pdf_path_str}: {read_err}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo leer el archivo PDF del certificado.")

    try:
        send_certificate_email(
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            course_name=producto_nombre,
            pdf_content=pdf_content_bytes,
            serial=serial
        )
    except Exception as e:
        print(f"Error enviando email para certificado ID {certificado_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ocurrió un error al enviar el correo: {e}")

    return {"message": f"Certificado enviado a {recipient_email}"}


@router.delete("/{certificado_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_certificado(certificado_id: int, db: Session = Depends(get_db)):
    """
    Elimina un certificado de la base de datos Y TAMBIÉN su archivo PDF asociado.
    """
    db_certificado = db.query(models.Certificado).filter(models.Certificado.id == certificado_id).first()
    if not db_certificado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificado no encontrado")

    file_path_to_delete = db_certificado.archivo_path

    try:
        db.delete(db_certificado)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error eliminando certificado ID {certificado_id} de DB: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al eliminar el registro del certificado.")

    if file_path_to_delete:
        try:
            if os.path.exists(file_path_to_delete):
                os.remove(file_path_to_delete)
                print(f"Archivo eliminado: {file_path_to_delete}")
            else:
                print(f"Archivo no encontrado al intentar eliminar: {file_path_to_delete}")
        except OSError as e:
            print(f"Error al eliminar el archivo físico {file_path_to_delete}: {e}")

    return None


@router.get(
    "/download/{folio}",
    response_class=FileResponse,
    summary="Descargar o visualizar un archivo de certificado por folio"
)
def download_certificado_by_folio(
    folio: str,
    db: Session = Depends(get_db),
    current_user: models.Administrador = Depends(get_current_admin_user)
):
    """
    Busca un certificado por su folio y devuelve el archivo PDF.
    El navegador lo mostrará en línea (inline) si es posible.
    """
    db_certificado = db.query(models.Certificado).filter(models.Certificado.folio == folio).first()

    if not db_certificado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificado no encontrado")

    file_path = db_certificado.archivo_path

    if not file_path or not os.path.exists(file_path):
        print(f"Error: Archivo no encontrado en la ruta: {file_path}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Archivo PDF no encontrado en el servidor")

    return FileResponse(file_path, media_type='application/pdf', filename=f"{folio}.pdf")


# 🚨 FUNCIÓN MODIFICADA: Ahora solo encola la tarea en Redis
@router.post(
    "/emitir-enviar-masivo/producto/{producto_id}", 
    response_model=Dict[str, str], # 🚨 Cambia el modelo de respuesta a un simple Dict
    status_code=status.HTTP_202_ACCEPTED # 🚨 CAMBIO DE ESTADO
)
async def issue_and_send_certificates_massively(
    producto_id: int,
    options: dict = Body(default={"con_competencias": False}),
    db: Session = Depends(get_db) # Se mantiene la dependencia por si se requiere validación preliminar
):
    """
    🚨 ASÍNCRONO: Encola la tarea pesada de emisión y envío masivo en RQ.
    Responde inmediatamente con 202 ACCEPTED.
    """
    # 1. Extracción de argumentos
    emitir_con_competencias = options.get("con_competencias", False)
    
    # 2. (OPCIONAL) Validación Rápida: Solo para asegurar que el producto existe antes de encolar
    db_producto = db.query(models.ProductoEducativo).filter(models.ProductoEducativo.id == producto_id).first()
    if not db_producto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto educativo no encontrado")

    # 3. ENCOLAR EL TRABAJO
    job = q.enqueue(
        emitir_y_enviar_certificados_masivamente_job,
        producto_id,
        emitir_con_competencias, # Pasa el argumento booleano al worker
        job_timeout='2h' # Tiempo máximo para la tarea
    )

    tipo_emision_str = "RECONOCIMIENTOS (competencias)" if emitir_con_competencias else "CONSTANCIAS (normales)"
    
    # 4. Respuesta Inmediata (202 ACCEPTED)
    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED,
        content={
            "message": f"El proceso de emisión masiva de {tipo_emision_str} para el producto {producto_id} ha sido iniciado en segundo plano.",
            "job_id": job.id,
            "status": "enqueued"
        }
    )