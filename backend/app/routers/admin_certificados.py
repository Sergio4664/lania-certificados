# Ruta: backend/app/routers/admin_certificados.py
import datetime
import os
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List

# Importa Path de pathlib para manejar rutas de archivo de forma robusta
from pathlib import Path

from app.database import get_db
from app import models
from app.schemas.certificado import Certificado, CertificadoCreate
from app.services.certificate_service import generate_certificate
from app.services.email_service import send_certificate_email # Tu función de envío
from app.routers.dependencies import get_current_admin_user

router = APIRouter(
    prefix="/admin/certificados",
    tags=["Admin - Certificados"],
    dependencies=[Depends(get_current_admin_user)]
)

# --- (Las rutas GET, POST /participante, POST /docente, POST /{id}/enviar, DELETE /{id} permanecen igual) ---
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

    existing_cert = db.query(models.Certificado).filter(
        models.Certificado.inscripcion_id == db_inscripcion.id,
        models.Certificado.producto_educativo_id == db_inscripcion.producto_educativo_id
    ).first()
    if existing_cert:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un certificado (ID: {existing_cert.id}, Folio: {existing_cert.folio}) para esta inscripción."
        )

    producto = db_inscripcion.producto_educativo
    instructor_name = producto.docentes[0].nombre_completo if producto.docentes else "Equipo de Instructores LANIA"

    try:
        folio, file_path_obj = generate_certificate( # Asumiendo que devuelve Path object
            participant_name=db_inscripcion.participante.nombre_completo,
            course_name=producto.nombre,
            course_type=producto.modalidad.value if producto.modalidad else 'No especificada',
            course_hours=producto.horas,
            instructor_name=instructor_name,
            is_docente=False
        )
        file_path = str(file_path_obj) # Convertir a string para DB
    except Exception as e:
         print(f"Error generando certificado PDF: {e}")
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al generar el archivo PDF del certificado: {e}")

    nuevo_certificado = models.Certificado(
        inscripcion_id=db_inscripcion.id,
        producto_educativo_id=producto.id,
        archivo_path=file_path,
        folio=folio,
        fecha_emision=datetime.datetime.now(datetime.timezone.utc)
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

    existing_cert = db.query(models.Certificado).filter(
        models.Certificado.docente_id == db_docente.id,
        models.Certificado.producto_educativo_id == db_producto.id
    ).first()
    if existing_cert:
         raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un certificado (ID: {existing_cert.id}, Folio: {existing_cert.folio}) para este docente en este producto."
        )

    try:
        folio, file_path_obj = generate_certificate( # Asumiendo que devuelve Path object
            participant_name=db_docente.nombre_completo,
            course_name=db_producto.nombre,
            course_type=db_producto.modalidad.value if db_producto.modalidad else 'No especificada',
            course_hours=db_producto.horas,
            is_docente=True,
        )
        file_path = str(file_path_obj) # Convertir a string para DB
    except Exception as e:
         print(f"Error generando constancia PDF para docente: {e}")
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al generar el archivo PDF de la constancia: {e}")

    nuevo_certificado = models.Certificado(
        docente_id=db_docente.id,
        producto_educativo_id=db_producto.id,
        archivo_path=file_path,
        folio=folio,
        fecha_emision=datetime.datetime.now(datetime.timezone.utc)
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
        recipient_email = db_certificado.inscripcion.participante.email_personal or db_certificado.inscripcion.participante.email_institucional
        recipient_name = db_certificado.inscripcion.participante.nombre_completo
    elif db_certificado.docente:
        recipient_email = db_certificado.docente.email_personal or db_certificado.docente.email_institucional
        recipient_name = db_certificado.docente.nombre_completo

    if not recipient_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El destinatario del certificado no tiene email.")

    if not pdf_path_str or not os.path.exists(pdf_path_str):
         print(f"Archivo PDF no encontrado para certificado ID {certificado_id}: {pdf_path_str}")
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El archivo PDF del certificado no fue encontrado.")

    # --- CORRECCIÓN: Leer contenido del PDF ---
    try:
        pdf_path = Path(pdf_path_str)
        pdf_content_bytes = pdf_path.read_bytes()
    except Exception as read_err:
        print(f"Error leyendo el archivo PDF {pdf_path_str}: {read_err}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo leer el archivo PDF del certificado.")
    # --- FIN CORRECCIÓN ---

    try:
        # --- CORRECCIÓN: Pasar parámetros correctos ---
        send_certificate_email(
            recipient_email=recipient_email,
            recipient_name=recipient_name, # <-- Nombre correcto
            course_name=producto_nombre,
            pdf_content=pdf_content_bytes, # <-- Contenido correcto
            serial=serial                # <-- Serial añadido
        )
        # --- FIN CORRECCIÓN ---
    except Exception as e:
        print(f"Error enviando email para certificado ID {certificado_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ocurrió un error al enviar el correo: {e}")

    return {"message": "Certificado enviado exitosamente"}

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

# --- RUTA DE EMISIÓN Y ENVÍO MASIVO (INCLUYE DOCENTES Y CORRECCIONES EMAIL) ---
@router.post("/emitir-enviar-masivo/producto/{producto_id}", status_code=status.HTTP_200_OK)
async def issue_and_send_certificates_massively(
    producto_id: int,
    db: Session = Depends(get_db)
):
    """
    Emite (si no existen) y envía masivamente certificados a participantes
    Y constancias a docentes de un producto educativo específico.
    """
    db_producto = db.query(models.ProductoEducativo).options(
        selectinload(models.ProductoEducativo.inscripciones).selectinload(models.Inscripcion.participante),
        selectinload(models.ProductoEducativo.inscripciones).selectinload(models.Inscripcion.certificados),
        selectinload(models.ProductoEducativo.docentes).selectinload(models.Docente.certificados)
    ).filter(models.ProductoEducativo.id == producto_id).first()

    if not db_producto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto educativo no encontrado")

    # ... (contadores igual que antes) ...
    issued_participant_count = 0
    sent_participant_count = 0
    skipped_participant_count = 0
    issued_docente_count = 0
    sent_docente_count = 0
    skipped_docente_count = 0
    errors = []

    # --- Lógica para Participantes ---
    print(f"\n--- Iniciando proceso masivo para PARTICIPANTES del producto ID: {producto_id} ---")
    for inscripcion in db_producto.inscripciones:
        certificado_existente = next((cert for cert in inscripcion.certificados if cert.producto_educativo_id == producto_id), None)
        certificado_a_enviar = None
        participante = inscripcion.participante
        participante_id = participante.id
        participante_email = participante.email_personal

        if not participante_email:
            msg = f"PARTICIPANTE {participante_id} ({participante.nombre_completo}) no tiene email personal. Saltando."
            print(msg); errors.append(msg); continue

        if certificado_existente:
            print(f"PARTICIPANTE {participante_id}: Certificado ya existe (Folio: {certificado_existente.folio}). Saltando emisión.")
            certificado_a_enviar = certificado_existente
            skipped_participant_count += 1
        else:
            print(f"PARTICIPANTE {participante_id}: Emitiendo certificado...")
            try:
                instructor_name = db_producto.docentes[0].nombre_completo if db_producto.docentes else "Equipo LANIA"
                folio, file_path_obj = generate_certificate( # Asume Path object
                    participant_name=participante.nombre_completo, course_name=db_producto.nombre,
                    course_type=db_producto.modalidad.value if db_producto.modalidad else 'N/E',
                    course_hours=db_producto.horas, instructor_name=instructor_name, is_docente=False
                )
                file_path = str(file_path_obj) # Guardar como string
                nuevo_certificado = models.Certificado(
                    inscripcion_id=inscripcion.id, producto_educativo_id=producto_id,
                    archivo_path=file_path, folio=folio,
                    fecha_emision=datetime.datetime.now(datetime.timezone.utc)
                )
                db.add(nuevo_certificado)
                db.flush()
                certificado_a_enviar = nuevo_certificado
                issued_participant_count += 1
                print(f"PARTICIPANTE {participante_id}: Certificado emitido (Folio: {folio}).")
            except Exception as e:
                msg = f"PARTICIPANTE {participante_id}: Error emitiendo certificado: {str(e)}"
                print(msg); errors.append(msg); db.rollback(); continue

        # --- CORRECCIÓN ENVÍO EMAIL PARTICIPANTE ---
        if certificado_a_enviar and certificado_a_enviar.archivo_path:
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
                    recipient_name=participante.nombre_completo, # <-- Nombre correcto
                    course_name=db_producto.nombre,
                    pdf_content=pdf_content_bytes,             # <-- Contenido correcto
                    serial=pdf_serial                          # <-- Serial añadido
                )
                sent_participant_count += 1
                print(f"PARTICIPANTE {participante_id}: Correo enviado.")
            except FileNotFoundError as fnf_err:
                 msg = f"PARTICIPANTE {participante_id}: No se envió correo, {str(fnf_err)}."
                 print(msg); errors.append(msg)
            except Exception as e:
                msg = f"PARTICIPANTE {participante_id}: Error enviando correo: {str(e)}"
                print(msg); errors.append(msg)
        # --- FIN CORRECCIÓN ---

    # --- Lógica para Docentes ---
    print(f"\n--- Iniciando proceso masivo para DOCENTES del producto ID: {producto_id} ---")
    for docente in db_producto.docentes:
        constancia_existente = next((cert for cert in docente.certificados if cert.producto_educativo_id == producto_id), None)
        constancia_a_enviar = None
        docente_id = docente.id
        docente_email = docente.email_personal or docente.email_institucional

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
                folio, file_path_obj = generate_certificate( # Asume Path object
                    participant_name=docente.nombre_completo, course_name=db_producto.nombre,
                    course_type=db_producto.modalidad.value if db_producto.modalidad else 'N/E',
                    course_hours=db_producto.horas, is_docente=True
                )
                file_path = str(file_path_obj) # Guardar como string
                nueva_constancia = models.Certificado(
                    docente_id=docente.id, producto_educativo_id=producto_id,
                    archivo_path=file_path, folio=folio,
                    fecha_emision=datetime.datetime.now(datetime.timezone.utc)
                )
                db.add(nueva_constancia)
                db.flush()
                constancia_a_enviar = nueva_constancia
                issued_docente_count += 1
                print(f"DOCENTE {docente_id}: Constancia emitida (Folio: {folio}).")
            except Exception as e:
                msg = f"DOCENTE {docente_id}: Error emitiendo constancia: {str(e)}"
                print(msg); errors.append(msg); db.rollback(); continue

        # --- CORRECCIÓN ENVÍO EMAIL DOCENTE ---
        if constancia_a_enviar and constancia_a_enviar.archivo_path:
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
                    recipient_name=docente.nombre_completo, # <-- Nombre correcto
                    course_name=db_producto.nombre,
                    pdf_content=pdf_content_bytes,         # <-- Contenido correcto
                    serial=pdf_serial                      # <-- Serial añadido
                )
                sent_docente_count += 1
                print(f"DOCENTE {docente_id}: Correo enviado.")
            except FileNotFoundError as fnf_err:
                 msg = f"DOCENTE {docente_id}: No se envió correo, {str(fnf_err)}."
                 print(msg); errors.append(msg)
            except Exception as e:
                msg = f"DOCENTE {docente_id}: Error enviando correo: {str(e)}"
                print(msg); errors.append(msg)
        # --- FIN CORRECCIÓN ---


    # --- Commit final y respuesta ---
    try:
        db.commit()
        print("\nCommit final exitoso.")
    except Exception as e:
        db.rollback()
        print(f"\nError en el commit final: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error Crítico: No se pudieron guardar los cambios en la BD: {str(e)}")

    summary_parts = [
        f"Proceso masivo completado para producto {producto_id}.",
        f"Participantes: {issued_participant_count} emitidos, {skipped_participant_count} omitidos, {sent_participant_count} enviados.",
        f"Docentes: {issued_docente_count} emitidos, {skipped_docente_count} omitidos, {sent_docente_count} enviados."
    ]
    response_message = " ".join(summary_parts)
    if errors:
        response_message += f" Se encontraron {len(errors)} errores."
        print("\nErrores durante proceso masivo:", errors)

    return {"message": response_message, "errors": errors}

# Recuerda incluir este router en app/main.py