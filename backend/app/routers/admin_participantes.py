# backend/app/routers/admin_participantes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app import models
from app.schemas.participante import Participante, ParticipanteCreate, ParticipanteUpdate
from app.database import get_db
from app.routers.dependencies import get_current_admin_user

router = APIRouter(
    prefix="/admin/participantes",
    tags=["Admin - Participantes"],
    dependencies=[Depends(get_current_admin_user)]
)

@router.post("/", response_model=Participante, status_code=status.HTTP_201_CREATED)
def create_participante(participante: ParticipanteCreate, db: Session = Depends(get_db)):
    # Mantener la validación existente, quizás añadiendo un filtro para no-eliminados
    db_participante = db.query(models.Participante).filter(
        models.Participante.email_personal == participante.email_personal,
        models.Participante.is_deleted == False # ⬅️ Opción: Solo validar contra no-eliminados
    ).first()
    if db_participante:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El email personal ya está registrado")
    
    db_participante = models.Participante(**participante.model_dump())
    # NOTA: La nueva columna 'is_deleted' se inicializa a False por defecto en el modelo.
    db.add(db_participante)
    db.commit()
    db.refresh(db_participante)
    return db_participante

@router.get("/", response_model=List[Participante])
def read_participantes(skip: int = 0, limit: int = 15, db: Session = Depends(get_db)): # ✅ Límite cambiado a 15
    # 🌟 CORRECCIÓN 1: Filtrar para mostrar solo los participantes NO eliminados.
    participantes = db.query(models.Participante).filter(
        models.Participante.is_deleted == False
    ).order_by(models.Participante.id).offset(skip).limit(limit).all()
    return participantes

@router.get("/{participante_id}", response_model=Participante)
def read_participante(participante_id: int, db: Session = Depends(get_db)):
    # 🌟 CORRECCIÓN 2: Filtrar para que no se puedan leer participantes eliminados.
    db_participante = db.query(models.Participante).filter(
        models.Participante.id == participante_id,
        models.Participante.is_deleted == False
    ).first()
    
    if db_participante is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participante no encontrado")
    return db_participante

@router.put("/{participante_id}", response_model=Participante)
def update_participante(participante_id: int, participante: ParticipanteUpdate, db: Session = Depends(get_db)):
    # 🌟 CORRECCIÓN 3: Asegurar que solo se pueden actualizar participantes NO eliminados.
    db_participante = db.query(models.Participante).filter(
        models.Participante.id == participante_id,
        models.Participante.is_deleted == False
    ).first()
    
    if db_participante is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participante no encontrado")

    update_data = participante.model_dump(exclude_unset=True)
    
    # --- VALIDACIÓN DE EMAIL ---
    if "email_personal" in update_data:
        existing = db.query(models.Participante).filter(
            models.Participante.email_personal == update_data["email_personal"],
            models.Participante.id != participante_id,
            models.Participante.is_deleted == False # ⬅️ Opción: Solo validar contra no-eliminados
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El email personal ya está en uso por otro participante.")

    for key, value in update_data.items():
        setattr(db_participante, key, value)
        
    db.commit()
    db.refresh(db_participante)
    return db_participante

@router.delete("/{participante_id}", status_code=status.HTTP_200_OK)
def delete_participante(participante_id: int, db: Session = Depends(get_db)):
    db_participante = db.query(models.Participante).filter(
        models.Participante.id == participante_id,
        models.Participante.is_deleted == False # ⬅️ Solo se puede 'eliminar' si NO está ya eliminado.
    ).first()
    
    if db_participante is None:
        # Puede ser 404 si el ID no existe o si ya está eliminado lógicamente.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participante no encontrado")
    
    # 🌟 CORRECCIÓN 4: Implementar la eliminación lógica (Soft Delete)
    db_participante.is_deleted = True
    db.add(db_participante)
    db.commit()
    
    return {"detail": "Participante marcado como eliminado exitosamente"}