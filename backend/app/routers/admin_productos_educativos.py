# backend/app/routers/admin_productos_educativos.py
import pandas as pd
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from app import schemas

from app import models
# --- 💡 CORRECCIÓN 1: Importar el esquema 'WithDetails' ---
from app.schemas.producto_educativo import (
    ProductoEducativo,
    ProductoEducativoCreate,
    ProductoEducativoUpdate,
    ProductoEducativoOut,
    ProductoEducativoWithDetails # 👈 ESTA IMPORTACIÓN YA ESTABA BIEN
)
from app.database import get_db
from app.routers.dependencies import get_current_admin_user

router = APIRouter(
    prefix="/admin/productos-educativos",
    tags=["Admin - Productos Educativos"],
    dependencies=[Depends(get_current_admin_user)]
)


@router.get("/", response_model=List[ProductoEducativoOut])
def read_productos_educativos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    productos = db.query(models.ProductoEducativo).options(
        joinedload(models.ProductoEducativo.docentes)
    ).order_by(models.ProductoEducativo.id.desc()).offset(skip).limit(limit).all()
    return productos


# --- 💡 CORRECCIÓN 2: Añadir el nuevo endpoint AQUÍ ---
# 💡 *** ¡ESTA ES LA LÍNEA CORREGIDA! ***
@router.get("/with-details", response_model=list[schemas.ProductoEducativoWithDetails])
def read_productos_educativos_with_details(
    db: Session = Depends(get_db)
):
    productos = db.query(models.ProductoEducativo).options(
        joinedload(models.ProductoEducativo.docentes),
        joinedload(models.ProductoEducativo.inscripciones)
    ).all()
    
    # Este print es útil para que veas en tu terminal del backend que SÍ se están cargando
    print("PRODUCTOS /WITH-DETAILS ENCONTRADOS:", productos) 
    
    return productos

@router.get("/{producto_id}", response_model=ProductoEducativo)
def read_producto_educativo(producto_id: int, db: Session = Depends(get_db)):
    db_producto = db.query(models.ProductoEducativo).options(
        joinedload(models.ProductoEducativo.docentes),
        joinedload(models.ProductoEducativo.inscripciones)
    ).filter(models.ProductoEducativo.id == producto_id).first()
    if db_producto is None:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")
    return db_producto


@router.post("/", response_model=ProductoEducativoOut, status_code=status.HTTP_201_CREATED)
def create_producto_educativo(producto: ProductoEducativoCreate, db: Session = Depends(get_db)):
    docentes = []
    if producto.docentes_ids:
        docentes = db.query(models.Docente).filter(models.Docente.id.in_(producto.docentes_ids)).all()
        if len(docentes) != len(producto.docentes_ids):
            raise HTTPException(status_code=404, detail="Uno o más docentes no fueron encontrados")

    db_producto = models.ProductoEducativo(
        nombre=producto.nombre,
        horas=producto.horas,
        fecha_inicio=producto.fecha_inicio,
        fecha_fin=producto.fecha_fin,
        tipo_producto=producto.tipo_producto,
        modalidad=producto.modalidad,
        competencias=producto.competencias,
        docentes=docentes
    )
    db.add(db_producto)
    db.commit()
    db.refresh(db_producto)
    return db_producto


@router.put("/{producto_id}", response_model=ProductoEducativoOut)
def update_producto_educativo(producto_id: int, producto_update: ProductoEducativoUpdate, db: Session = Depends(get_db)):
    db_producto = db.query(models.ProductoEducativo).filter(models.ProductoEducativo.id == producto_id).first()
    if db_producto is None:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")

    update_data = producto_update.model_dump(exclude_unset=True)
    
    if "docentes_ids" in update_data:
        docentes_ids = update_data.pop("docentes_ids")
        if docentes_ids is not None:
            docentes = db.query(models.Docente).filter(models.Docente.id.in_(docentes_ids)).all()
            if len(docentes) != len(docentes_ids):
                raise HTTPException(status_code=404, detail="Uno o más docentes no fueron encontrados")
            db_producto.docentes = docentes
        else:
            db_producto.docentes = []

    for key, value in update_data.items():
        setattr(db_producto, key, value)
        
    db.commit()
    db.refresh(db_producto)
    return db_producto


@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_producto_educativo(producto_id: int, db: Session = Depends(get_db)):
    db_producto = db.query(models.ProductoEducativo).filter(models.ProductoEducativo.id == producto_id).first()
    if db_producto is None:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")
    db.delete(db_producto)
    db.commit()
    return


@router.post("/{producto_id}/upload-participantes", summary="Inscribir participantes desde un archivo Excel o CSV")
def upload_participantes_file(
    producto_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    db_producto = db.query(models.ProductoEducativo).filter(models.ProductoEducativo.id == producto_id).first()
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")

    try:
        contents = file.file.read()
        
        if file.filename.endswith('.xlsx'):
            df = pd.read_excel(io.BytesIO(contents))
        elif file.filename.endswith('.csv'):
            try:
                df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
            except UnicodeDecodeError:
                df = pd.read_csv(io.StringIO(contents.decode('latin1')))
        else:
            raise HTTPException(status_code=400, detail="Formato de archivo no soportado. Use .xlsx o .csv")

        required_columns = ['nombre_completo', 'email_personal']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(
                status_code=400, 
                detail=f"El archivo debe contener al menos las columnas: {', '.join(required_columns)}"
            )

        creados = 0
        inscritos = 0
        
        for index, row in df.iterrows():
            nombre = row['nombre_completo']
            email = row['email_personal']

            if pd.isna(nombre) or pd.isna(email):
                continue

            email_inst = row.get('email_institucional')
            telefono = row.get('telefono')
            whatsapp = row.get('whatsapp')

            email_inst_str = None if pd.isna(email_inst) else str(email_inst)
            telefono_str = None if pd.isna(telefono) else str(telefono)
            whatsapp_str = None if pd.isna(whatsapp) else str(whatsapp)

            db_participante = db.query(models.Participante).filter(models.Participante.email_personal == str(email)).first()
            
            if not db_participante:
                db_participante = models.Participante(
                    nombre_completo=str(nombre), 
                    email_personal=str(email),
                    email_institucional=email_inst_str,
                    telefono=telefono_str,
                    whatsapp=whatsapp_str
                )
                db.add(db_participante)
                db.commit() 
                db.refresh(db_participante)
                creados += 1
            else:
                db_participante.nombre_completo = str(nombre)
                
                if email_inst_str is not None:
                    db_participante.email_institucional = email_inst_str
                if telefono_str is not None:
                    db_participante.telefono = telefono_str
                if whatsapp_str is not None:
                    db_participante.whatsapp = whatsapp_str
                
                db.commit() 
                db.refresh(db_participante)
            
            inscripcion_existente = db.query(models.Inscripcion).filter(
                models.Inscripcion.producto_educativo_id == producto_id,
                models.Inscripcion.participante_id == db_participante.id
            ).first()

            if not inscripcion_existente:
                nueva_inscripcion = models.Inscripcion(
                    producto_educativo_id=producto_id,
                    participante_id=db_participante.id
                )
                db.add(nueva_inscripcion)
                inscritos += 1
        
        db.commit()

    except Exception as e:
        db.rollback()
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error al procesar el archivo: {str(e)}")

    return {
        "message": "Archivo procesado exitosamente.",
        "nuevos_participantes_creados": creados,
        "nuevas_inscripciones_realizadas": inscritos
    }