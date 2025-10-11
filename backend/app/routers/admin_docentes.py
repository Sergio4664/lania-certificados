from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import models
# --- CORRECCIÓN DE IMPORTACIÓN ---
# Se importa 'DocenteOut' que es el nombre correcto del schema de salida.
from app.schemas.docente import DocenteCreate, DocenteUpdate, DocenteOut
from app.database import get_db
from app.routers.dependencies import get_current_admin_user

router = APIRouter(
    prefix="/api/admin/docentes",
    tags=["Admin - Docentes"],
    dependencies=[Depends(get_current_admin_user)]
)

# --- CORRECCIÓN EN RESPONSE_MODEL ---
@router.post("/", response_model=DocenteOut, status_code=201)
def create_docente(docente: DocenteCreate, db: Session = Depends(get_db)):
    db_docente = db.query(models.Docente).filter(models.Docente.email_institucional == docente.email_institucional).first()
    if db_docente:
        raise HTTPException(status_code=400, detail="El email institucional ya se encuentra registrado.")
    
    db_docente = models.Docente(**docente.dict())
    db.add(db_docente)
    db.commit()
    db.refresh(db_docente)
    return db_docente

# --- CORRECCIÓN EN RESPONSE_MODEL ---
@router.get("/", response_model=List[DocenteOut])
def read_docentes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    docentes = db.query(models.Docente).order_by(models.Docente.id).offset(skip).limit(limit).all()
    return docentes

# --- CORRECCIÓN EN RESPONSE_MODEL ---
@router.get("/{docente_id}", response_model=DocenteOut)
def read_docente(docente_id: int, db: Session = Depends(get_db)):
    db_docente = db.query(models.Docente).filter(models.Docente.id == docente_id).first()
    if db_docente is None:
        raise HTTPException(status_code=404, detail="Docente no encontrado")
    return db_docente

# --- CORRECCIÓN EN RESPONSE_MODEL ---
@router.put("/{docente_id}", response_model=DocenteOut)
def update_docente(docente_id: int, docente: DocenteUpdate, db: Session = Depends(get_db)):
    db_docente = db.query(models.Docente).filter(models.Docente.id == docente_id).first()
    if db_docente is None:
        raise HTTPException(status_code=404, detail="Docente no encontrado")

    update_data = docente.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_docente, key, value)
        
    db.commit()
    db.refresh(db_docente)
    return db_docente

@router.delete("/{docente_id}", status_code=204)
def delete_docente(docente_id: int, db: Session = Depends(get_db)):
    db_docente = db.query(models.Docente).filter(models.Docente.id == docente_id).first()
    if db_docente is None:
        raise HTTPException(status_code=404, detail="Docente no encontrado")
    
    db.delete(db_docente)
    db.commit()
    return