# backend/app/routers/admin_participants.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.participant import Participant
from app.schemas.participant import ParticipantCreate, ParticipantUpdate, ParticipantOut
from typing import List
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/participants", tags=["admin-participants"])

@router.post("/", response_model=ParticipantOut)
def create_participant(participant: ParticipantCreate, db: Session = Depends(get_db)):
    """Crear un nuevo participante"""
    try:
        # Verificar si ya existe el email
        existing = db.query(Participant).filter(Participant.email == participant.email).first()
        if existing:
            raise HTTPException(400, "Ya existe un participante con ese email")
        
        db_participant = Participant(**participant.dict())
        db.add(db_participant)
        db.commit()
        db.refresh(db_participant)
        return db_participant
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creando participante: {str(e)}")
        raise HTTPException(500, f"Error interno: {str(e)}")

@router.get("/", response_model=List[ParticipantOut])
def list_participants(db: Session = Depends(get_db)):
    """Listar todos los participantes"""
    try:
        return db.query(Participant).all()
    except Exception as e:
        logger.error(f"Error listando participantes: {str(e)}")
        raise HTTPException(500, f"Error interno: {str(e)}")

@router.get("/{participant_id}", response_model=ParticipantOut)
def get_participant(participant_id: int, db: Session = Depends(get_db)):
    """Obtener un participante específico"""
    try:
        participant = db.query(Participant).get(participant_id)
        if not participant:
            raise HTTPException(404, "Participante no encontrado")
        return participant
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo participante: {str(e)}")
        raise HTTPException(500, f"Error interno: {str(e)}")

@router.put("/{participant_id}", response_model=ParticipantOut)
def update_participant(participant_id: int, data: ParticipantUpdate, db: Session = Depends(get_db)):
    """Actualizar un participante"""
    try:
        participant = db.query(Participant).get(participant_id)
        if not participant:
            raise HTTPException(404, "Participante no encontrado")
        
        # Verificar email único si se está actualizando
        if data.email and data.email != participant.email:
            existing = db.query(Participant).filter(Participant.email == data.email).first()
            if existing:
                raise HTTPException(400, "Ya existe un participante con ese email")
        
        # Actualizar solo los campos proporcionados
        for field, value in data.dict(exclude_unset=True).items():
            setattr(participant, field, value)
        
        db.commit()
        db.refresh(participant)
        return participant
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error actualizando participante: {str(e)}")
        raise HTTPException(500, f"Error interno: {str(e)}")

@router.delete("/{participant_id}")
def delete_participant(participant_id: int, db: Session = Depends(get_db)):
    """Eliminar un participante"""
    try:
        participant = db.query(Participant).get(participant_id)
        if not participant:
            raise HTTPException(404, "Participante no encontrado")
        
        db.delete(participant)
        db.commit()
        return {"message": "Participante eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error eliminando participante: {str(e)}")
        raise HTTPException(500, f"Error interno: {str(e)}")