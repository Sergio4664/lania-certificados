from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.database import get_db
from app.routers.dependencies import get_current_admin_user

router = APIRouter(
    prefix="/api/admin/productos-educativos",
    tags=["Admin - Productos Educativos"],
    dependencies=[Depends(get_current_admin_user)]
)

@router.post("/", response_model=schemas.ProductoEducativo, status_code=201)
def create_producto_educativo(producto: schemas.ProductoEducativoCreate, db: Session = Depends(get_db)):
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
        docentes=docentes
    )
    db.add(db_producto)
    db.commit()
    db.refresh(db_producto)
    return db_producto

@router.get("/", response_model=List[schemas.ProductoEducativo])
def read_productos_educativos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    productos = db.query(models.ProductoEducativo).order_by(models.ProductoEducativo.id).offset(skip).limit(limit).all()
    return productos

@router.get("/{producto_id}", response_model=schemas.ProductoEducativo)
def read_producto_educativo(producto_id: int, db: Session = Depends(get_db)):
    db_producto = db.query(models.ProductoEducativo).filter(models.ProductoEducativo.id == producto_id).first()
    if db_producto is None:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")
    return db_producto

@router.put("/{producto_id}", response_model=schemas.ProductoEducativo)
def update_producto_educativo(producto_id: int, producto: schemas.ProductoEducativoUpdate, db: Session = Depends(get_db)):
    db_producto = db.query(models.ProductoEducativo).filter(models.ProductoEducativo.id == producto_id).first()
    if db_producto is None:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")

    update_data = producto.dict(exclude_unset=True)
    
    if "docentes_ids" in update_data:
        docentes_ids = update_data["docentes_ids"]
        if docentes_ids:
            docentes = db.query(models.Docente).filter(models.Docente.id.in_(docentes_ids)).all()
            if len(docentes) != len(docentes_ids):
                raise HTTPException(status_code=404, detail="Uno o más docentes no fueron encontrados")
            db_producto.docentes = docentes
        else: # Si se envía una lista vacía, se eliminan las asociaciones
            db_producto.docentes = []
        del update_data["docentes_ids"]

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