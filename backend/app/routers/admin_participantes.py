from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.database import get_db
from app.routers.dependencies import get_current_admin_user

router = APIRouter(
    prefix="/api/admin/participantes",
    tags=["Admin - Participantes"],
    dependencies=[Depends(get_current_admin_user)]
)

@router.post("/", response_model=schemas.Participante, status_code=201)
def create_participante(participante: schemas.ParticipanteCreate, db: Session = Depends(get_db)):
    db_participante = db.query(models.Participante).filter(models.Participante.email_personal == participante.email_personal).first()
    if db_participante:
        raise HTTPException(status_code=400, detail="Email personal ya registrado")
    
    db_participante = models.Participante(**participante.dict())
    db.add(db_participante)
    db.commit()
    db.refresh(db_participante)
    return db_participante

@router.get("/", response_model=List[schemas.Participante])
def read_participantes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    participantes = db.query(models.Participante).order_by(models.Participante.id).offset(skip).limit(limit).all()
    return participantes

@router.get("/{participante_id}", response_model=schemas.Participante)
def read_participante(participante_id: int, db: Session = Depends(get_db)):
    db_participante = db.query(models.Participante).filter(models.Participante.id == participante_id).first()
    if db_participante is None:
        raise HTTPException(status_code=404, detail="Participante no encontrado")
    return db_participante

@router.put("/{participante_id}", response_model=schemas.Participante)
def update_participante(participante_id: int, participante: schemas.ParticipanteUpdate, db: Session = Depends(get_db)):
    db_participante = db.query(models.Participante).filter(models.Participante.id == participante_id).first()
    if db_participante is None:
        raise HTTPException(status_code=404, detail="Participante no encontrado")

    update_data = participante.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_participante, key, value)
        
    db.commit()
    db.refresh(db_participante)
    return db_participante

@router.delete("/{participante_id}", status_code=204)
def delete_participante(participante_id: int, db: Session = Depends(get_db)):
    db_participante = db.query(models.Participante).filter(models.Participante.id == participante_id).first()
    if db_participante is None:
        raise HTTPException(status_code=404, detail="Participante no encontrado")
    db.delete(db_participante)
    db.commit()
    return