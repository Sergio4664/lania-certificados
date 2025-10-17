from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.inscripciones import Inscripcion as InscripcionModel
# FIX: Importa el esquema correcto que ya tiene todo anidado
from app.schemas.inscripcion import Inscripcion, InscripcionCreate
from app.routers.dependencies import get_current_admin_user

router = APIRouter(
    prefix="/api/admin/inscripciones",
    tags=["Admin - Inscripciones"],
    dependencies=[Depends(get_current_admin_user)]
)

@router.get("/", response_model=List[Inscripcion])
def get_all_inscripciones(db: Session = Depends(get_db)):
    """
    Obtiene todas las inscripciones con la información del participante
    y del producto educativo anidada.
    """
    return db.query(InscripcionModel).all()

@router.get("/producto/{producto_id}", response_model=List[Inscripcion])
def get_inscripciones_by_producto(producto_id: int, db: Session = Depends(get_db)):
    """
    Obtiene todas las inscripciones para un producto educativo específico.
    """
    inscripciones = db.query(InscripcionModel).filter(InscripcionModel.producto_educativo_id == producto_id).all()
    if not inscripciones:
        return []
    return inscripciones

@router.post("/", response_model=Inscripcion)
def create_inscripcion(inscripcion: InscripcionCreate, db: Session = Depends(get_db)):
    """
    Crea una nueva inscripción.
    """
    # (Opcional) Verificar si ya existe
    db_inscripcion = db.query(InscripcionModel).filter(
        InscripcionModel.producto_educativo_id == inscripcion.producto_educativo_id,
        InscripcionModel.participante_id == inscripcion.participante_id
    ).first()
    if db_inscripcion:
        raise HTTPException(status_code=400, detail="El participante ya está inscrito en este producto.")

    new_inscripcion = InscripcionModel(**inscripcion.model_dump())
    db.add(new_inscripcion)
    db.commit()
    db.refresh(new_inscripcion)
    return new_inscripcion

@router.delete("/{inscripcion_id}", status_code=204)
def delete_inscripcion(inscripcion_id: int, db: Session = Depends(get_db)):
    """
    Elimina una inscripción.
    """
    db_inscripcion = db.query(InscripcionModel).filter(InscripcionModel.id == inscripcion_id).first()
    if not db_inscripcion:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada.")
    
    db.delete(db_inscripcion)
    db.commit()
    return