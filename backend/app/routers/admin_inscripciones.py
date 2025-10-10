from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import io

from app import models, schemas
from app.database import get_db
from app.routers.dependencies import get_current_admin_user

router = APIRouter(
    prefix="/api/admin/inscripciones",
    tags=["Admin - Inscripciones"],
    dependencies=[Depends(get_current_admin_user)]
)

@router.post("/", response_model=schemas.Inscripcion, status_code=201)
def create_inscripcion(inscripcion: schemas.InscripcionCreate, db: Session = Depends(get_db)):
    # Verificar que el producto y participante existen
    db_producto = db.query(models.ProductoEducativo).filter(models.ProductoEducativo.id == inscripcion.producto_educativo_id).first()
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")
    
    db_participante = db.query(models.Participante).filter(models.Participante.id == inscripcion.participante_id).first()
    if not db_participante:
        raise HTTPException(status_code=404, detail="Participante no encontrado")

    # Verificar que no exista ya la inscripción
    db_inscripcion = db.query(models.Inscripcion).filter_by(
        producto_educativo_id=inscripcion.producto_educativo_id,
        participante_id=inscripcion.participante_id
    ).first()
    if db_inscripcion:
        raise HTTPException(status_code=400, detail="El participante ya está inscrito en este producto")

    new_inscripcion = models.Inscripcion(**inscripcion.dict())
    db.add(new_inscripcion)
    db.commit()
    db.refresh(new_inscripcion)
    return new_inscripcion


@router.get("/producto/{producto_id}", response_model=List[schemas.Inscripcion])
def get_inscripciones_por_producto(producto_id: int, db: Session = Depends(get_db)):
    db_producto = db.query(models.ProductoEducativo).filter(models.ProductoEducativo.id == producto_id).first()
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")
    return db_producto.inscripciones


@router.delete("/{inscripcion_id}", status_code=204)
def delete_inscripcion(inscripcion_id: int, db: Session = Depends(get_db)):
    db_inscripcion = db.query(models.Inscripcion).filter(models.Inscripcion.id == inscripcion_id).first()
    if not db_inscripcion:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")
    db.delete(db_inscripcion)
    db.commit()
    return

@router.post("/producto/{producto_id}/upload-participantes/")
async def upload_participantes_e_inscribir(
    producto_id: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    db_producto = db.query(models.ProductoEducativo).filter(models.ProductoEducativo.id == producto_id).first()
    if not db_producto:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")
    
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(contents.decode('utf-8')), dtype=str)
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(io.BytesIO(contents), dtype=str)
        else:
            raise HTTPException(status_code=400, detail="Formato de archivo no soportado. Use CSV o Excel.")

        df.fillna('', inplace=True)
        df.columns = [col.strip().lower().replace(' ', '_') for col in df.columns]
        
        required_columns = ['nombre_completo', 'email_personal']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(status_code=400, detail=f"El archivo debe contener las columnas: 'nombre_completo' y 'email_personal'")

        reporte = {"nuevos_participantes": 0, "participantes_actualizados": 0, "inscripciones_creadas": 0, "errores": []}
        
        for index, row in df.iterrows():
            email_personal = row.get('email_personal')
            nombre_completo = row.get('nombre_completo')
            if not email_personal or not nombre_completo:
                continue

            participante = db.query(models.Participante).filter(models.Participante.email_personal == email_personal).first()
            
            participante_data = {k: v for k, v in row.items() if v and hasattr(models.Participante, k)}

            if not participante:
                participante = models.Participante(**participante_data)
                db.add(participante)
                reporte["nuevos_participantes"] += 1
            else:
                for key, value in participante_data.items():
                    setattr(participante, key, value)
                reporte["participantes_actualizados"] += 1
            
            db.commit()
            db.refresh(participante)

            # Inscribir
            existing_enrollment = db.query(models.Inscripcion).filter_by(
                producto_educativo_id=producto_id, 
                participante_id=participante.id
            ).first()
            if not existing_enrollment:
                new_enrollment = models.Inscripcion(producto_educativo_id=producto_id, participante_id=participante.id)
                db.add(new_enrollment)
                db.commit()
                reporte["inscripciones_creadas"] += 1

        return reporte
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al procesar el archivo: {str(e)}")