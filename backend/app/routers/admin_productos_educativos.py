# backend/app/routers/admin_productos_educativos.py
import pandas as pd
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from typing import List

from app import models
from app.schemas.producto_educativo import ProductoEducativo, ProductoEducativoCreate, ProductoEducativoUpdate
from app.database import get_db
from app.routers.dependencies import get_current_admin_user

router = APIRouter(
    prefix="/api/admin/productos-educativos",
    tags=["Admin - Productos Educativos"],
    dependencies=[Depends(get_current_admin_user)]
)

@router.post("/", response_model=ProductoEducativo, status_code=201)
def create_producto_educativo(producto: ProductoEducativoCreate, db: Session = Depends(get_db)):
    docentes = []
    # --- ✅ CORRECCIÓN AQUÍ ---
    if producto.docente_ids:
        # --- ✅ CORRECCIÓN AQUÍ ---
        docentes = db.query(models.Docente).filter(models.Docente.id.in_(producto.docente_ids)).all()
        # --- ✅ CORRECCIÓN AQUÍ ---
        if len(docentes) != len(producto.docente_ids):
            raise HTTPException(status_code=404, detail="Uno o más docentes no fueron encontrados")

    db_producto = models.ProductoEducativo(
        nombre=producto.nombre,
        horas=producto.horas,
        fecha_inicio=producto.fecha_inicio,
        fecha_fin=producto.fecha_fin,
        docentes=docentes,
        tipo_producto=producto.tipo_producto,
        modalidad=producto.modalidad,
        competencias=producto.competencias
    )
    db.add(db_producto)
    db.commit()
    
    # Recargamos el objeto con sus relaciones para devolverlo completo
    created_producto = db.query(models.ProductoEducativo).options(joinedload(models.ProductoEducativo.docentes)).filter(models.ProductoEducativo.id == db_producto.id).first()
    
    return created_producto

@router.get("/", response_model=List[ProductoEducativo])
def read_productos_educativos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    productos = db.query(models.ProductoEducativo).options(joinedload(models.ProductoEducativo.docentes)).order_by(models.ProductoEducativo.id.desc()).offset(skip).limit(limit).all()
    return productos

@router.get("/{producto_id}", response_model=ProductoEducativo)
def read_producto_educativo(producto_id: int, db: Session = Depends(get_db)):
    db_producto = db.query(models.ProductoEducativo).options(joinedload(models.ProductoEducativo.docentes)).filter(models.ProductoEducativo.id == producto_id).first()
    if db_producto is None:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")
    return db_producto

@router.put("/{producto_id}", response_model=ProductoEducativo)
def update_producto_educativo(producto_id: int, producto_update: ProductoEducativoUpdate, db: Session = Depends(get_db)):
    db_producto = db.query(models.ProductoEducativo).filter(models.ProductoEducativo.id == producto_id).first()
    if db_producto is None:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")

    update_data = producto_update.dict(exclude_unset=True)
    
    # --- ✅ LÓGICA CORREGIDA ---
    if "docente_ids" in update_data:
        docente_ids = update_data.pop("docente_ids") # Usamos pop para extraer y eliminar la clave
        if docente_ids:
            docentes = db.query(models.Docente).filter(models.Docente.id.in_(docente_ids)).all()
            if len(docentes) != len(docente_ids):
                raise HTTPException(status_code=404, detail="Uno o más docentes no fueron encontrados")
            db_producto.docentes = docentes
        else:
            db_producto.docentes = []

    for key, value in update_data.items():
        setattr(db_producto, key, value)
        
    db.commit()
    db.refresh(db_producto)
    return db_producto

@router.delete("/{producto_id}", status_code=204)
def delete_producto_educativo(producto_id: int, db: Session = Depends(get_db)):
    db_producto = db.query(models.ProductoEducativo).filter(models.ProductoEducativo.id == producto_id).first()
    if db_producto is None:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")
    db.delete(db_producto)
    db.commit()
    return

# (El resto del archivo no requiere cambios)
@router.post("/{producto_id}/upload-participantes", summary="Inscribir participantes desde un archivo Excel o CSV")
def upload_participantes_file(
    producto_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # ... (código sin cambios)
    db_producto = db.query(models.ProductoEducativo).filter(models.ProductoEducativo.id == producto_id).first()
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")

    try:
        contents = file.file.read()
        
        if file.filename.endswith('.xlsx'):
            df = pd.read_excel(io.BytesIO(contents))
        elif file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        else:
            raise HTTPException(status_code=400, detail="Formato de archivo no soportado. Use .xlsx o .csv")

        required_columns = ['nombre_completo', 'email_personal']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(
                status_code=400, 
                detail=f"El archivo debe contener las columnas: {', '.join(required_columns)}"
            )

        creados = 0
        inscritos = 0
        
        for index, row in df.iterrows():
            nombre = row['nombre_completo']
            email = row['email_personal']

            if pd.isna(nombre) or pd.isna(email):
                continue

            db_participante = db.query(models.Participante).filter(models.Participante.email_personal == email).first()
            if not db_participante:
                db_participante = models.Participante(nombre_completo=str(nombre), email_personal=str(email))
                db.add(db_participante)
                db.commit()
                db.refresh(db_participante)
                creados += 1
            
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
        raise HTTPException(status_code=500, detail=f"Error al procesar el archivo: {str(e)}")

    return {
        "message": "Archivo procesado exitosamente.",
        "nuevos_participantes_creados": creados,
        "nuevas_inscripciones_realizadas": inscritos
    }