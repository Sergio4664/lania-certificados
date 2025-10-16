from fastapi import APIRouter, Depends, HTTPException
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

@router.post("/", response_model=DocenteOut, status_code=201)
def create_docente(docente: DocenteCreate, db: Session = Depends(get_db)):
    # --- VALIDACIÓN DE UNICIDAD MEJORADA ---

    # 1. Verificar email institucional (obligatorio)
    if db.query(models.Docente).filter(models.Docente.email_institucional == docente.email_institucional).first():
        raise HTTPException(status_code=400, detail="El email institucional ya se encuentra registrado.")

    # 2. Verificar email personal (si se proporciona)
    if docente.email_personal and db.query(models.Docente).filter(models.Docente.email_personal == docente.email_personal).first():
        raise HTTPException(status_code=400, detail="El email personal ya está en uso por otro docente.")

    # 3. Verificar teléfono (si se proporciona)
    if docente.telefono and db.query(models.Docente).filter(models.Docente.telefono == docente.telefono).first():
        raise HTTPException(status_code=400, detail="El número de teléfono ya está en uso por otro docente.")

    # 4. Verificar WhatsApp (si se proporciona)
    if docente.whatsapp and db.query(models.Docente).filter(models.Docente.whatsapp == docente.whatsapp).first():
        raise HTTPException(status_code=400, detail="El número de WhatsApp ya está en uso por otro docente.")

    # CORRECCIÓN: Usar model_dump() para Pydantic v2
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
        raise HTTPException(status_code=404, detail="Docente no encontrado")
    return db_docente

@router.put("/{docente_id}", response_model=DocenteOut)
def update_docente(docente_id: int, docente: DocenteUpdate, db: Session = Depends(get_db)):
    db_docente = db.query(models.Docente).filter(models.Docente.id == docente_id).first()
    if db_docente is None:
        raise HTTPException(status_code=404, detail="Docente no encontrado")

    # CORRECCIÓN: Usar model_dump() para Pydantic v2
    update_data = docente.model_dump(exclude_unset=True)

    # --- VALIDACIÓN DE UNICIDAD EN ACTUALIZACIÓN ---
    for key, value in update_data.items():
        if value is None:  # Permite establecer un campo a null
            setattr(db_docente, key, value)
            continue
            
        # Comprobar si el valor ya existe en OTRO docente
        query = db.query(models.Docente).filter(getattr(models.Docente, key) == value).filter(models.Docente.id != docente_id)
        if query.first():
            raise HTTPException(status_code=400, detail=f"El valor '{value}' para el campo '{key}' ya está en uso.")
        
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