# backend/app/routers/admin_inscripciones.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload  # 💡 1. IMPORTA JOINEDLOAD
from typing import List

from app.database import get_db
from app import models  # 💡 2. IMPORTA TUS MODELOS (usa 'models.' en lugar de 'InscripcionModel')
from app.schemas.inscripcion import Inscripcion, InscripcionCreate
from app.routers.dependencies import get_current_admin_user

router = APIRouter(
    prefix="/admin/inscripciones",
    tags=["Admin - Inscripciones"],
    dependencies=[Depends(get_current_admin_user)]
)

@router.get("/", response_model=List[Inscripcion])
def get_all_inscripciones(db: Session = Depends(get_db)):
    """
    Obtiene todas las inscripciones con la información del participante
    y del producto educativo anidada.
    """
    # 💡 3. AÑADIMOS JOINEDLOAD AQUÍ TAMBIÉN (BUENA PRÁCTICA)
    return db.query(models.Inscripcion).options(
        joinedload(models.Inscripcion.participante),
        joinedload(models.Inscripcion.producto_educativo)
    ).all()

@router.get("/producto/{producto_id}", response_model=List[Inscripcion])
def get_inscripciones_by_producto(producto_id: int, db: Session = Depends(get_db)):
    """
    Obtiene todas las inscripciones para un producto educativo específico.
    """
    # --- 💡 4. INICIO DE LA CORRECCIÓN ---
    # Añadimos .options(joinedload(...)) para forzar al backend
    # a que cargue la información del participante en la misma consulta.
    inscripciones = db.query(models.Inscripcion).options(
        joinedload(models.Inscripcion.participante)
    ).filter(models.Inscripcion.producto_educativo_id == producto_id).all()
    # --- 💡 FIN DE LA CORRECCIÓN ---
    
    if not inscripciones:
        return []
    return inscripciones

@router.post("/", response_model=Inscripcion)
def create_inscripcion(inscripcion: InscripcionCreate, db: Session = Depends(get_db)):
    """
    Crea una nueva inscripción.
    """
    db_inscripcion = db.query(models.Inscripcion).filter(
        models.Inscripcion.producto_educativo_id == inscripcion.producto_educativo_id,
        models.Inscripcion.participante_id == inscripcion.participante_id
    ).first()
    if db_inscripcion:
        raise HTTPException(status_code=400, detail="El participante ya está inscrito en este producto.")

    new_inscripcion = models.Inscripcion(**inscripcion.model_dump())
    db.add(new_inscripcion)
    db.commit()
    db.refresh(new_inscripcion)
    return new_inscripcion

@router.delete("/{inscripcion_id}", status_code=204)
def delete_inscripcion(inscripcion_id: int, db: Session = Depends(get_db)):
    """
    Elimina una inscripción.
    """
    db_inscripcion = db.query(models.Inscripcion).filter(models.Inscripcion.id == inscripcion_id).first()
    if not db_inscripcion:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada.")
    
    db.delete(db_inscripcion)
    db.commit()
    return