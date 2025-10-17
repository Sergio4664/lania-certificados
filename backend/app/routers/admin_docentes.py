from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app import models
from app.schemas.docente import DocenteCreate, DocenteUpdate, DocenteOut
from app.database import get_db
from app.routers.dependencies import get_current_admin_user

router = APIRouter(
    prefix="/api/admin/docentes",
    tags=["Admin - Docentes"],
    dependencies=[Depends(get_current_admin_user)]
)

@router.post("/", response_model=DocenteOut, status_code=status.HTTP_201_CREATED)
def create_docente(docente: DocenteCreate, db: Session = Depends(get_db)):
    # Validaciones de unicidad
    if db.query(models.Docente).filter(models.Docente.email_institucional == docente.email_institucional).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El email institucional ya se encuentra registrado.")
    if docente.email_personal and db.query(models.Docente).filter(models.Docente.email_personal == docente.email_personal).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El email personal ya está en uso.")
    if docente.telefono and db.query(models.Docente).filter(models.Docente.telefono == docente.telefono).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El teléfono ya está en uso.")
    if docente.whatsapp and db.query(models.Docente).filter(models.Docente.whatsapp == docente.whatsapp).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El WhatsApp ya está en uso.")

    db_docente = models.Docente(**docente.model_dump())
    db.add(db_docente)
    db.commit()
    db.refresh(db_docente)
    return db_docente

@router.get("/", response_model=List[DocenteOut])
def read_docentes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    docentes = db.query(models.Docente).order_by(models.Docente.id).offset(skip).limit(limit).all()
    return docentes

@router.get("/{docente_id}", response_model=DocenteOut)
def read_docente(docente_id: int, db: Session = Depends(get_db)):
    db_docente = db.query(models.Docente).filter(models.Docente.id == docente_id).first()
    if db_docente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente no encontrado")
    return db_docente

@router.put("/{docente_id}", response_model=DocenteOut)
def update_docente(docente_id: int, docente: DocenteUpdate, db: Session = Depends(get_db)):
    db_docente = db.query(models.Docente).filter(models.Docente.id == docente_id).first()
    if db_docente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente no encontrado")

    update_data = docente.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key in ["email_institucional", "email_personal", "telefono", "whatsapp"] and value is not None:
            existing = db.query(models.Docente).filter(getattr(models.Docente, key) == value).filter(models.Docente.id != docente_id).first()
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"El campo '{key}' con valor '{value}' ya está en uso.")
        setattr(db_docente, key, value)
        
    db.commit()
    db.refresh(db_docente)
    return db_docente

@router.delete("/{docente_id}", status_code=status.HTTP_200_OK)
def delete_docente(docente_id: int, db: Session = Depends(get_db)):
    db_docente = db.query(models.Docente).filter(models.Docente.id == docente_id).first()
    if db_docente is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente no encontrado")
    
    db.delete(db_docente)
    db.commit()
    return {"detail": "Docente eliminado exitosamente"}