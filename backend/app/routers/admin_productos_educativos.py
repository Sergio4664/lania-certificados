# backend/app/routers/admin_productos_educativos.py

import pandas as pd
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from typing import List
from pathlib import Path

from app import models, schemas
from app.schemas.producto_educativo import (
    ProductoEducativo,
    ProductoEducativoCreate,
    ProductoEducativoUpdate,
    ProductoEducativoOut,
    ProductoEducativoWithDetails,
)
from app.database import get_db
from app.routers.dependencies import get_current_admin_user

# ============================================================
# Router principal
# ============================================================

router = APIRouter(
    prefix="/admin/productos-educativos",
    tags=["Admin - Productos Educativos"],
)

# ============================================================
# ENDPOINTS PROTEGIDOS MANUALMENTE
# ============================================================

@router.get(
    "/",
    response_model=List[ProductoEducativoOut],
    dependencies=[Depends(get_current_admin_user)],
)
def read_productos_educativos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    productos = (
        db.query(models.ProductoEducativo)
        .options(joinedload(models.ProductoEducativo.docentes))
        .filter(models.ProductoEducativo.is_active == True)
        .order_by(models.ProductoEducativo.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return productos


@router.get(
    "/with-details",
    response_model=list[schemas.ProductoEducativoWithDetails],
    dependencies=[Depends(get_current_admin_user)],
)
def read_productos_educativos_with_details(db: Session = Depends(get_db)):
    productos = (
        db.query(models.ProductoEducativo)
        .options(
            joinedload(models.ProductoEducativo.docentes),
            joinedload(models.ProductoEducativo.inscripciones).joinedload(
                models.Inscripcion.participante
            ),
        )
        .filter(models.ProductoEducativo.is_active == True)
        .all()
    )

    # Filtrado manual
    for producto in productos:
        producto.inscripciones = [
            inscripcion for inscripcion in producto.inscripciones
            if inscripcion.participante and not inscripcion.participante.is_deleted
        ]

    return productos


@router.get(
    "/{producto_id}",
    response_model=ProductoEducativo,
    dependencies=[Depends(get_current_admin_user)],
)
def read_producto_educativo(producto_id: int, db: Session = Depends(get_db)):
    db_producto = (
        db.query(models.ProductoEducativo)
        .options(
            joinedload(models.ProductoEducativo.docentes),
            joinedload(models.ProductoEducativo.inscripciones).joinedload(
                models.Inscripcion.participante
            ),
        )
        .filter(models.ProductoEducativo.id == producto_id)
        .first()
    )

    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")

    db_producto.inscripciones = [
        inscripcion for inscripcion in db_producto.inscripciones
        if inscripcion.participante and not inscripcion.participante.is_deleted
    ]

    return db_producto


@router.post(
    "/",
    response_model=ProductoEducativoOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_admin_user)],
)
def create_producto_educativo(producto: ProductoEducativoCreate, db: Session = Depends(get_db)):
    docentes = []
    if producto.docentes_ids:
        docentes = (
            db.query(models.Docente)
            .filter(models.Docente.id.in_(producto.docentes_ids))
            .all()
        )
        if len(docentes) != len(producto.docentes_ids):
            raise HTTPException(status_code=404, detail="Uno o más docentes no fueron encontrados")

    nuevo = models.ProductoEducativo(
        nombre=producto.nombre,
        horas=producto.horas,
        fecha_inicio=producto.fecha_inicio,
        fecha_fin=producto.fecha_fin,
        tipo_producto=producto.tipo_producto,
        modalidad=producto.modalidad,
        competencias=producto.competencias,
        docentes=docentes,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.put(
    "/{producto_id}",
    response_model=ProductoEducativoOut,
    dependencies=[Depends(get_current_admin_user)],
)
def update_producto_educativo(producto_id: int, producto_update: ProductoEducativoUpdate, db: Session = Depends(get_db)):
    db_producto = (
        db.query(models.ProductoEducativo)
        .options(joinedload(models.ProductoEducativo.docentes))
        .filter(models.ProductoEducativo.id == producto_id)
        .first()
    )
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")

    update_data = producto_update.model_dump(exclude_none=True)

    # Manejar docentes_ids
    if producto_update.docentes_ids is not None:
        docentes = (
            db.query(models.Docente)
            .filter(models.Docente.id.in_(producto_update.docentes_ids))
            .all()
        )
        if len(docentes) != len(producto_update.docentes_ids):
            raise HTTPException(status_code=404, detail="Uno o más docentes no fueron encontrados")

        db_producto.docentes = docentes
        update_data.pop("docentes_ids", None)

    # Actualizar campos normales
    for key, value in update_data.items():
        setattr(db_producto, key, value)

    db.commit()
    db.refresh(db_producto)
    return db_producto


@router.delete(
    "/{producto_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_admin_user)],
)
def delete_producto_educativo(producto_id: int, db: Session = Depends(get_db)):
    db_producto = db.query(models.ProductoEducativo).filter(models.ProductoEducativo.id == producto_id).first()
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")

    db_producto.is_active = False
    db.commit()
    return


# ============================================================
# SUBIR PARTICIPANTES
# ============================================================

@router.post(
    "/{producto_id}/upload-participantes",
    summary="Inscribir participantes desde archivo CSV/Excel",
    dependencies=[Depends(get_current_admin_user)],
)
def upload_participantes_file(producto_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):

    db_producto = db.query(models.ProductoEducativo).filter(models.ProductoEducativo.id == producto_id).first()
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")

    try:
        contents = file.file.read()

        dtype_map = {
            "nombre_completo": str,
            "email_personal": str,
            "email_institucional": str,
            "telefono": str,
            "whatsapp": str,
        }

        if file.filename.endswith(".xlsx"):
            df = pd.read_excel(io.BytesIO(contents), dtype=dtype_map)

        elif file.filename.endswith(".csv"):
            try:
                df = pd.read_csv(io.StringIO(contents.decode("utf-8")), dtype=dtype_map)
            except UnicodeDecodeError:
                df = pd.read_csv(io.StringIO(contents.decode("latin1")), dtype=dtype_map)

        else:
            raise HTTPException(status_code=400, detail="Formato no soportado. Use CSV o XLSX.")

        required = ["nombre_completo", "email_personal"]
        if not all(col in df.columns for col in required):
            raise HTTPException(status_code=400, detail=f"El archivo requiere columnas: {', '.join(required)}")

        creados = 0
        inscritos = 0

        for _, row in df.iterrows():
            nombre = row["nombre_completo"]
            email = row["email_personal"]

            if pd.isna(nombre) or pd.isna(email):
                continue

            db_part = (
                db.query(models.Participante)
                .filter(models.Participante.email_personal == email)
                .first()
            )

            if not db_part:
                db_part = models.Participante(
                    nombre_completo=nombre.strip(),
                    email_personal=email.strip(),
                    email_institucional=str(row.get("email_institucional") or "").strip(),
                    telefono=str(row.get("telefono") or "").strip(),
                    whatsapp=str(row.get("whatsapp") or "").strip(),
                )
                db.add(db_part)
                db.commit()
                db.refresh(db_part)
                creados += 1

            insc_exist = (
                db.query(models.Inscripcion)
                .filter(
                    models.Inscripcion.participante_id == db_part.id,
                    models.Inscripcion.producto_educativo_id == producto_id
                ).first()
            )

            if not insc_exist:
                nueva = models.Inscripcion(
                    participante_id=db_part.id,
                    producto_educativo_id=producto_id
                )
                db.add(nueva)
                inscritos += 1

        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error procesando archivo: {str(e)}")

    return {
        "message": "Archivo procesado exitosamente.",
        "nuevos_participantes_creados": creados,
        "nuevas_inscripciones_realizadas": inscritos,
    }

# ============================================================
# DESCARGA DE PLANTILLA (SIN AUTENTICACIÓN)
# ============================================================

@router.get(
    "/download-template",
    response_class=FileResponse,
    summary="Descargar plantilla Excel para inscripción masiva (sin autenticicación)",
)
def download_participants_template():
    file_path = Path("app/static/plantilla_participantes.xlsx")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Plantilla no encontrada en el servidor.")

    return FileResponse(
        path=str(file_path),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="plantilla_participantes.xlsx",
    )
