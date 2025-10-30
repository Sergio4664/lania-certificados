# Ruta: backend/app/routers/admin_certificados.py
import datetime
import os
import json # --- ✅ 1. IMPORTAR JSON ---
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.responses import FileResponse # --- 💡 1. IMPORTAR FileResponse ---
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List

from pathlib import Path

from app.database import get_db
from app import models
from app.schemas.certificado import Certificado, CertificadoCreate
from app.services.certificate_service import generate_certificate
from app.services.email_service import send_certificate_email
from app.routers.dependencies import get_current_admin_user

router = APIRouter(
    prefix="/admin/certificados",
    tags=["Admin - Certificados"],
    dependencies=[Depends(get_current_admin_user)]
)

# --- (Este es el endpoint que YA TENÍAS) ---
@router.get(
    "/",
    response_model=List[Certificado]
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


# --- 💡 ¡NUEVO ENDPOINT! RUTA PARA PARTICIPANTES ---
@router.get(
    "/participantes",
    response_model=List[Certificado],
    summary="Obtener certificados de participantes"
)
def read_certificados_participantes(db: Session = Depends(get_db)):
    """
    Recupera solo los certificados de participantes (con inscripcion_id),
    cargando todas las relaciones anidadas necesarias para el dashboard.
    """
    certificados = (
        db.query(models.Certificado)
        .filter(models.Certificado.inscripcion_id.isnot(None)) # Filtra solo participantes
        .options(
            # Carga Inscripcion -> Participante
            selectinload(models.Certificado.inscripcion)
            .selectinload(models.Inscripcion.participante),
            
            # Carga Inscripcion -> ProductoEducativo
            selectinload(models.Certificado.inscripcion)
            .selectinload(models.Inscripcion.producto_educativo)
        )
        .order_by(models.Certificado.id.desc())
        .all()
    )
    return certificados


# --- 💡 ¡NUEVO ENDPOINT! RUTA PARA DOCENTES ---
@router.get(
    "/docentes",
    response_model=List[Certificado],
    summary="Obtener certificados de docentes"
)
def read_certificados_docentes(db: Session = Depends(get_db)):
    """
    Recupera solo los certificados de docentes (con docente_id),
    cargando todas las relaciones anidadas necesarias para el dashboard.
    """
    certificados = (
        db.query(models.Certificado)
        .filter(models.Certificado.docente_id.isnot(None)) # Filtra solo docentes
        .options(
            # Carga la relación directa con Docente
            selectinload(models.Certificado.docente),
            
            # Carga la relación directa con ProductoEducativo
            # Tu modelo SQL 'certificado' tiene 'producto_educativo_id' y la relación.
            selectinload(models.Certificado.producto_educativo) 
        )
        .order_by(models.Certificado.id.desc())
        .all()
    )
    return certificados


# --- (El resto de tus endpoints permanecen sin cambios) ---

@router.get("/{certificado_id}", response_model=Certificado)
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


@router.post("/participante", response_model=Certificado, status_code=status.HTTP_201_CREATED)
def issue_certificate_to_participant(
    certificado_create: CertificadoCreate, db: Session = Depends(get_db)
):
    """
    Emite un nuevo certificado para un participante a partir de una inscripción.
    Distingue entre Constancia (normal) y Reconocimiento (con competencias).
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

    # --- Comprobar existencia (sin cambios, tu lógica es correcta) ---
    con_competencias_check = certificado_create.con_competencias or False
    existing_cert = db.query(models.Certificado).filter(
        models.Certificado.inscripcion_id == db_inscripcion.id,
        models.Certificado.producto_educativo_id == db_inscripcion.producto_educativo_id,
        models.Certificado.con_competencias == con_competencias_check
    ).first()
    if existing_cert:
        tipo_constancia = "con competencias" if con_competencias_check else "normal"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un certificado {tipo_constancia} (ID: {existing_cert.id}, Folio: {existing_cert.folio}) para esta inscripción."
        )

    producto = db_inscripcion.producto_educativo
    instructor_name = producto.docentes[0].nombre_completo if producto.docentes else "Equipo de Instructores LANIA"

    # --- ✅ 2. PREPARAR LA LISTA DE COMPETENCIAS ---
    competencias_list = []
    # Solo intentamos cargar la lista si se marcó 'con_competencias'
    if con_competencias_check and producto.competencias:
        try:
            # producto.competencias es un string de JSON
            competencias_list = json.loads(producto.competencias)
            if not isinstance(competencias_list, list):
                    competencias_list = []
        except json.JSONDecodeError:
            print(f"Error: El campo 'competencias' del producto {producto.id} no es un JSON válido.")
            competencias_list = [] # Dejar la lista vacía si el JSON es inválido
            
    # Validar que si se marcaron competencias, existan en el producto
    if con_competencias_check and not competencias_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se marcó 'con_competencias' pero el producto educativo no tiene competencias registradas o el formato es incorrecto."
        )

    # --- ✅ 3. LLAMAR AL SERVICIO CON TODOS LOS ARGUMENTOS ---
    try:
        folio, file_path_obj = generate_certificate(
            participant_name=db_inscripcion.participante.nombre_completo,
            course_name=producto.nombre,
            tipo_producto=producto.tipo_producto, 
            modalidad=producto.modalidad.value if producto.modalidad else 'No especificada', 
            course_hours=producto.horas,
            instructor_name=instructor_name,
            is_docente=False,
            course_date_str="", # No es necesario para participantes
            
            # --- Argumentos nuevos ---
            con_competencias=con_competencias_check,
            competencias_list=competencias_list
        )
        file_path = str(file_path_obj)
    except Exception as e:
        print(f"Error generando certificado PDF: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al generar el archivo PDF del certificado: {e}")

    # --- Guardar en DB (sin cambios, tu lógica es correcta) ---
    nuevo_certificado = models.Certificado(
        inscripcion_id=db_inscripcion.id,
        producto_educativo_id=producto.id,
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


@router.post("/docente", response_model=Certificado, status_code=status.HTTP_201_CREATED)
def issue_certificate_to_docente(
    certificado_create: CertificadoCreate, db: Session = Depends(get_db)
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

    # --- ✅ 4. LLAMAR AL SERVICIO CON TODOS LOS ARGUMENTOS ---
    course_date_str = f"{db_producto.fecha_inicio.strftime('%d/%m/%Y')} al {db_producto.fecha_fin.strftime('%d/%m/%Y')}" if db_producto.fecha_inicio and db_producto.fecha_fin else "Fecha no especificada"

    try:
        folio, file_path_obj = generate_certificate(
            participant_name=db_docente.nombre_completo,
            course_name=db_producto.nombre,
            tipo_producto=db_producto.tipo_producto, 
            modalidad=db_producto.modalidad.value if db_producto.modalidad else 'No especificada',
            course_hours=db_producto.horas,
            instructor_name=db_docente.especialidad,
            is_docente=True,
            course_date_str=course_date_str,
            
            # --- Argumentos nuevos (siempre False/None para docentes) ---
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


# --- (La ruta POST /{id}/enviar permanece igual) ---
@router.post("/{certificado_id}/enviar", status_code=status.HTTP_200_OK)
async def send_certificate_email_by_id(certificado_id: int, db: Session = Depends(get_db)):
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
    if db_certificado.producto_educativo:
        producto_nombre = db_certificado.producto_educativo.nombre

    recipient_email = None
    recipient_name = "Destinatario"
    pdf_path_str = db_certificado.archivo_path
    serial = db_certificado.folio

    if db_certificado.inscripcion and db_certificado.inscripcion.participante:
        recipient_email = db_certificado.inscripcion.participante.email_personal
        recipient_name = db_certificado.inscripcion.participante.nombre_completo
    elif db_certificado.docente:
        recipient_email = db_certificado.docente.email_institucional or db_certificado.docente.email_personal
        recipient_name = db_certificado.docente.nombre_completo

    if not recipient_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El destinatario del certificado no tiene email.")

    if not pdf_path_str or not os.path.exists(pdf_path_str):
        print(f"Archivo PDF no encontrado para certificado ID {certificado_id}: {pdf_path_str}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El archivo PDF del certificado no fue encontrado.")

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

    return {"message": "Certificado enviado exitosamente"}


# --- (La ruta DELETE /{id} permanece igual) ---
@router.delete("/{certificado_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_certificado(certificado_id: int, db: Session = Depends(get_db)):
    """
    Elimina un certificado de la base de datos Y TAMBIÉN su archivo PDF asociado.
    """
    db_certificado = db.query(models.Certificado).filter(models.Certificado.id == certificado_id).first()
    if not db_certificado:
        # --- Pequeña corrección de 440 a 404 ---
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


# --- 💡 2. ¡NUEVO ENDPOINT PARA VISUALIZAR/DESCARGAR PDF! ---
@router.get(
    "/download/{folio}",
    response_class=FileResponse,
    summary="Descargar o visualizar un archivo de certificado por folio"
)
def download_certificado_by_folio(
    folio: str,
    db: Session = Depends(get_db),
    # --- 💡 3. AÑADIR ESTA LÍNEA PARA ARREGLAR EL ERROR 401 ---
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

    # Devolver el archivo. El navegador decidirá si mostrarlo o descargarlo.
    return FileResponse(file_path, media_type='application/pdf', filename=f"{folio}.pdf")


# --- (La ruta POST /emitir-enviar-masivo... permanece igual) ---
@router.post("/emitir-enviar-masivo/producto/{producto_id}", status_code=status.HTTP_200_OK)
async def issue_and_send_certificates_massively(
    producto_id: int,
    # --- Añadimos un Body opcional para decidir qué emitir ---
    options: dict = Body(default={"con_competencias": False}),
    db: Session = Depends(get_db)
):
    """
    Emite (si no existen) y envía masivamente certificados a participantes
    Y constancias a docentes de un producto educativo específico.
    
    Por defecto, emite constancias NORMALES (con_competencias=False).
    Para emitir RECONOCIMIENTOS, enviar en el body: {"con_competencias": true}
    """
    # Determinar qué tipo de certificado se está emitiendo
    emitir_con_competencias = options.get("con_competencias", False)
    tipo_emision_str = "RECONOCIMIENTOS (con competencias)" if emitir_con_competencias else "CONSTANCIAS (normales)"

    # Cargar producto con relaciones necesarias
    db_producto = db.query(models.ProductoEducativo).options(
        selectinload(models.ProductoEducativo.inscripciones).selectinload(models.Inscripcion.participante),
        selectinload(models.ProductoEducativo.inscripciones).selectinload(models.Inscripcion.certificados),
        selectinload(models.ProductoEducativo.docentes).selectinload(models.Docente.certificados)
    ).filter(models.ProductoEducativo.id == producto_id).first()

    if not db_producto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto educativo no encontrado")

    # --- Preparar lista de competencias (si es necesario) ---
    competencias_list_masivo = []
    if emitir_con_competencias:
        # Solo aplica a Cursos
        if db_producto.tipo_producto != models.TipoProductoEnum.CURSO_EDUCATIVO:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La emisión masiva de Reconocimientos solo aplica a productos tipo 'CURSO_EDUCATIVO'."
                )
        
        if db_producto.competencias:
            try:
                competencias_list_masivo = json.loads(db_producto.competencias)
                if not isinstance(competencias_list_masivo, list) or not competencias_list_masivo:
                        raise ValueError("El JSON no es una lista válida o está vacía")
            except Exception as e:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Se intentó emitir con competencias, pero el producto no tiene competencias válidas registradas: {e}"
                    )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se intentó emitir con competencias, pero el producto no tiene competencias registradas."
            )

    # Contadores
    issued_participant_count = 0
    sent_participant_count = 0
    skipped_participant_count = 0
    issued_docente_count = 0
    sent_docente_count = 0
    skipped_docente_count = 0
    errors = []

    # --- Lógica para Participantes ---
    print(f"\n--- Iniciando proceso masivo de {tipo_emision_str} para PARTICIPANTES del producto ID: {producto_id} ---")
    for inscripcion in db_producto.inscripciones:
        # Busca certificado específico (normal O con competencias)
        certificado_existente = next((cert for cert in inscripcion.certificados
                                        if cert.producto_educativo_id == producto_id and cert.con_competencias == emitir_con_competencias), None)
        
        certificado_a_enviar = None
        participante = inscripcion.participante
        participante_id = participante.id
        participante_email = participante.email_personal

        if not participante_email:
            msg = f"PARTICIPANTE {participante_id} ({participante.nombre_completo}) no tiene email personal. Saltando."
            print(msg); errors.append(msg); continue

        if certificado_existente:
            print(f"PARTICIPANTE {participante_id}: Certificado ({tipo_emision_str}) ya existe (Folio: {certificado_existente.folio}). Saltando emisión.")
            certificado_a_enviar = certificado_existente
            skipped_participant_count += 1
        else:
            print(f"PARTICIPANTE {participante_id}: Emitiendo {tipo_emision_str}...")
            try:
                instructor_name = db_producto.docentes[0].nombre_completo if db_producto.docentes else "Equipo LANIA"
                
                # --- ✅ LLAMADA ACTUALIZADA ---
                folio, file_path_obj = generate_certificate(
                    participant_name=participante.nombre_completo,
                    course_name=db_producto.nombre,
                    tipo_producto=db_producto.tipo_producto,
                    modalidad=db_producto.modalidad.value if db_producto.modalidad else 'No especificada',
                    course_hours=db_producto.horas,
                    instructor_name=instructor_name,
                    is_docente=False,
                    course_date_str="",
                    
                    # --- Argumentos nuevos ---
                    con_competencias=emitir_con_competencias,
                    competencias_list=competencias_list_masivo
                )
                # --- FIN LLAMADA ---
                
                file_path = str(file_path_obj)
                nuevo_certificado = models.Certificado(
                    inscripcion_id=inscripcion.id, producto_educativo_id=producto_id,
                    archivo_path=file_path, folio=folio,
                    fecha_emision=datetime.datetime.now(datetime.timezone.utc),
                    con_competencias=emitir_con_competencias # Guardar el tipo emitido
                )
                db.add(nuevo_certificado)
                db.flush()
                certificado_a_enviar = nuevo_certificado
                issued_participant_count += 1
                print(f"PARTICIPANTE {participante_id}: {tipo_emision_str} emitido (Folio: {folio}).")
            except Exception as e:
                msg = f"PARTICIPANTE {participante_id}: Error emitiendo certificado: {str(e)}"
                print(msg); errors.append(msg); db.rollback(); continue

        # Envío de Email (sin cambios)
        if certificado_a_enviar and certificado_a_enviar.archivo_path:
            # (El resto de la lógica de envío es la misma...)
            pdf_path_str = certificado_a_enviar.archivo_path
            pdf_serial = certificado_a_enviar.folio
            pdf_content_bytes = None
            try:
                if os.path.exists(pdf_path_str):
                    pdf_path = Path(pdf_path_str)
                    pdf_content_bytes = pdf_path.read_bytes()
                else:
                    raise FileNotFoundError(f"Archivo no encontrado en la ruta: {pdf_path_str}")

                print(f"PARTICIPANTE {participante_id}: Enviando a {participante_email}...")
                send_certificate_email(
                    recipient_email=participante_email,
                    recipient_name=participante.nombre_completo,
                    course_name=db_producto.nombre,
                    pdf_content=pdf_content_bytes,
                    serial=pdf_serial
                )
                sent_participant_count += 1
                print(f"PARTICIPANTE {participante_id}: Correo enviado.")
            except FileNotFoundError as fnf_err:
                msg = f"PARTICIPANTE {participante_id}: No se envió correo, {str(fnf_err)}."
                print(msg); errors.append(msg)
            except Exception as e:
                msg = f"PARTICIPANTE {participante_id}: Error enviando correo: {str(e)}"
                print(msg); errors.append(msg)


    # --- Lógica para Docentes (Solo se ejecuta si se emiten constancias normales) ---
    if not emitir_con_competencias:
        print(f"\n--- Iniciando proceso masivo para DOCENTES del producto ID: {producto_id} ---")
        for docente in db_producto.docentes:
            constancia_existente = next((cert for cert in docente.certificados
                                            if cert.producto_educativo_id == producto_id), None)
            constancia_a_enviar = None
            docente_id = docente.id
            docente_email = docente.email_institucional or docente.email_personal

            if not docente_email:
                msg = f"DOCENTE {docente_id} ({docente.nombre_completo}) no tiene email registrado. Saltando."
                print(msg); errors.append(msg); continue

            if constancia_existente:
                print(f"DOCENTE {docente_id}: Constancia ya existe (Folio: {constancia_existente.folio}). Saltando emisión.")
                constancia_a_enviar = constancia_existente
                skipped_docente_count += 1
            else:
                print(f"DOCENTE {docente_id}: Emitiendo constancia...")
                try:
                    # --- ✅ LLAMADA ACTUALIZADA ---
                    course_date_str = f"{db_producto.fecha_inicio.strftime('%d/%m/%Y')} al {db_producto.fecha_fin.strftime('%d/%m/%Y')}" if db_producto.fecha_inicio and db_producto.fecha_fin else "Fecha no especificada"
                    folio, file_path_obj = generate_certificate(
                        participant_name=docente.nombre_completo,
                        course_name=db_producto.nombre,
                        tipo_producto=db_producto.tipo_producto,
                        modalidad=db_producto.modalidad.value if db_producto.modalidad else 'No especificada',
                        course_hours=db_producto.horas,
                        instructor_name=docente.especialidad,
                        is_docente=True,
                        course_date_str=course_date_str,
                        
                        # --- Argumentos nuevos ---
                        con_competencias=False,
                        competencias_list=None
                    )
                    # --- FIN LLAMADA ---
                    
                    file_path = str(file_path_obj)
                    nueva_constancia = models.Certificado(
                        docente_id=docente.id, producto_educativo_id=producto_id,
                        archivo_path=file_path, folio=folio,
                        fecha_emision=datetime.datetime.now(datetime.timezone.utc),
                        con_competencias=False
                    )
                    db.add(nueva_constancia)
                    db.flush()
                    constancia_a_enviar = nueva_constancia
                    issued_docente_count += 1
                    print(f"DOCENTE {docente_id}: Constancia emitida (Folio: {folio}).")
                except Exception as e:
                    msg = f"DOCENTE {docente_id}: Error emitiendo constancia: {str(e)}"
                    print(msg); errors.append(msg); db.rollback(); continue

            # Envío de Email para Docente (sin cambios)
            if constancia_a_enviar and constancia_a_enviar.archivo_path:
                # (El resto de la lógica de envío es la misma...)
                pdf_path_str = constancia_a_enviar.archivo_path
                pdf_serial = constancia_a_enviar.folio
                pdf_content_bytes = None
                try:
                    if os.path.exists(pdf_path_str):
                        pdf_path = Path(pdf_path_str)
                        pdf_content_bytes = pdf_path.read_bytes()
                    else:
                        raise FileNotFoundError(f"Archivo no encontrado en la ruta: {pdf_path_str}")

                    print(f"DOCENTE {docente_id}: Enviando a {docente_email}...")
                    send_certificate_email(
                        recipient_email=docente_email,
                        recipient_name=docente.nombre_completo,
                        course_name=db_producto.nombre,
                        pdf_content=pdf_content_bytes,
                        serial=pdf_serial
                    )
                    sent_docente_count += 1
                    print(f"DOCENTE {docente_id}: Correo enviado.")
                except FileNotFoundError as fnf_err:
                    msg = f"DOCENTE {docente_id}: No se envió correo, {str(fnf_err)}."
                    print(msg); errors.append(msg)
                except Exception as e:
                    msg = f"DOCENTE {docente_id}: Error enviando correo: {str(e)}"
                    print(msg); errors.append(msg)
    elif emitir_con_competencias:
        print("\n--- Omitiendo proceso masivo para DOCENTES (emisión de competencias seleccionada) ---")


    # --- Commit final y respuesta ---
    try:
        db.commit()
        print("\nCommit final exitoso.")
    except Exception as e:
        db.rollback()
        print(f"\nError en el commit final: {e}")
        errors.append(f"Error Crítico: No se pudieron guardar los cambios en la BD: {str(e)}")

    summary_parts = [
        f"Proceso masivo ({tipo_emision_str}) completado para producto {producto_id}.",
        f"Participantes: {issued_participant_count} emitidos, {skipped_participant_count} omitidos, {sent_participant_count} enviados."
    ]
    if not emitir_con_competencias:
            summary_parts.append(f"Docentes: {issued_docente_count} emitidos, {skipped_docente_count} omitidos, {sent_docente_count} enviados.")

    response_message = " ".join(summary_parts)
    if errors:
        response_message += f" Se encontraron {len(errors)} errores."
        print("\nErrores durante proceso masivo:", errors)

    return {"message": response_message, "errors": errors}