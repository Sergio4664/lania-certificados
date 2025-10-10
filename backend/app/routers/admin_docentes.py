from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_admin_user

router = APIRouter(
    prefix="/api/admin/docentes",
    tags=["Admin - Docentes"],
    dependencies=[Depends(get_current_admin_user)]
)

@router.post("/", response_model=schemas.Docente, status_code=201)
def create_docente(docente: schemas.DocenteCreate, db: Session = Depends(get_db)):
    """
    Crea un nuevo docente en la base de datos.
    """
    # Verifica si el email institucional ya existe, que es el campo único principal.
    db_docente = db.query(models.Docente).filter(models.Docente.email_institucional == docente.email_institucional).first()
    if db_docente:
        raise HTTPException(status_code=400, detail="El email institucional ya se encuentra registrado.")
    
    # Crea la instancia del modelo directamente desde el schema (sin contraseña)
    db_docente = models.Docente(**docente.dict())
    db.add(db_docente)
    db.commit()
    db.refresh(db_docente)
    return db_docente

@router.get("/", response_model=List[schemas.Docente])
def read_docentes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Obtiene una lista de todos los docentes.
    """
    docentes = db.query(models.Docente).order_by(models.Docente.id).offset(skip).limit(limit).all()
    return docentes

@router.get("/{docente_id}", response_model=schemas.Docente)
def read_docente(docente_id: int, db: Session = Depends(get_db)):
    """
    Obtiene la información de un docente específico por su ID.
    """
    db_docente = db.query(models.Docente).filter(models.Docente.id == docente_id).first()
    if db_docente is None:
        raise HTTPException(status_code=404, detail="Docente no encontrado")
    return db_docente

@router.put("/{docente_id}", response_model=schemas.Docente)
def update_docente(docente_id: int, docente: schemas.DocenteUpdate, db: Session = Depends(get_db)):
    """
    Actualiza la información de un docente.
    """
    db_docente = db.query(models.Docente).filter(models.Docente.id == docente_id).first()
    if db_docente is None:
        raise HTTPException(status_code=404, detail="Docente no encontrado")

    # Obtiene los datos a actualizar del schema
    update_data = docente.dict(exclude_unset=True)
    
    # Itera sobre los datos y actualiza el modelo
    for key, value in update_data.items():
        setattr(db_docente, key, value)
        
    db.commit()
    db.refresh(db_docente)
    return db_docente

@router.delete("/{docente_id}", status_code=204)
def delete_docente(docente_id: int, db: Session = Depends(get_db)):
    """
    Elimina un docente de la base de datos.
    """
    db_docente = db.query(models.Docente).filter(models.Docente.id == docente_id).first()
    if db_docente is None:
        raise HTTPException(status_code=404, detail="Docente no encontrado")
    
    db.delete(db_docente)
    db.commit()
    # No se devuelve contenido en una respuesta 204
    return