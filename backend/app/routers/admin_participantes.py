# backend/app/routers/admin_participants.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from backend.app.models.participante import Participant
from app.schemas.participant import ParticipantCreate, ParticipantUpdate, ParticipantOut
from typing import List
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/participants", tags=["admin-participants"])

@router.post("/", response_model=ParticipantOut)
def create_participant(participant: ParticipantCreate, db: Session = Depends(get_db)):
    """Crear un nuevo participante"""
    try:
                # --- LÓGICA DE VALIDACIÓN MEJORADA ---
        # 1. Verificar email institucional (obligatorio)
        existing = db.query(Participant).filter(Participant.institutional_email == Participant.institutional_email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe un participante con ese email institucional")
        
        # 2. Verificar campos únicos opcionales solo si tienen valor
        if participant.personal_email:
            existing = db.query(Participant).filter(Participant.personal_email == participant.personal_email).first()
            if existing:
                raise HTTPException(status_code=400, detail="Ya existe un participante con ese email personal")

        if participant.telefono:
            existing = db.query(Participant).filter(Participant.telefono == participant.telefono).first()
            if existing:
                raise HTTPException(status_code=400, detail="Ya existe un participante con ese teléfono")
        
        if participant.whatsapp:
            existing = db.query(Participant).filter(Participant.whatsapp == participant.whatsapp).first()
            if existing:
                raise HTTPException(status_code=400, detail="Ya existe un participante con ese número de WhatsApp")
        
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

#Correción Clave: Se usa 'ParticipantUpdate' directamente porque se importó arriba
@router.put("/{participant_id}", response_model=ParticipantOut)
def update_participant(participant_id: int, participant_in: ParticipantUpdate, db: Session = Depends(get_db)):
    """Actualizar un participante"""
    try:
        db_participant = db.query(Participant).get(participant_id)
        if not db_participant:
            raise HTTPException(404, "Participante no encontrado")
        
        #Se usa 'Participant_in' (la entrada) para la actualizacion  
        update_data = participant_in.dict(exclude_unset=True)
        
         # Validar campos únicos solo si están presentes en la actualización
        if 'institutional_email' in update_data and update_data['institutional_email'] != db_participant.institutional_email:
            existing = db.query(Participant).filter(Participant.id != participant_id, Participant.institutional_email == update_data['institutional_email']).first()
            if existing:
                raise HTTPException(status_code=400, detail="El email institucional ya está en uso por otro docente.")

        if 'personal_email' in update_data and update_data.get('personal_email') and update_data['personal_email'] != db_participant.personal_email:
            existing = db.query(Participant).filter(Participant.id != participant_id, Participant.personal_email == update_data['personal_email']).first()
            if existing:
                raise HTTPException(status_code=400, detail="El email personal ya está en uso por otro docente.")

        if 'telefono' in update_data and update_data.get('telefono') and update_data['telefono'] != db_participant.telefono:
            existing = db.query(Participant).filter(Participant.id != participant_id, Participant.telefono == update_data['telefono']).first()
            if existing:
                raise HTTPException(status_code=400, detail="El teléfono ya está en uso por otro docente.")

        if 'whatsapp' in update_data and update_data.get('whatsapp') and update_data['whatsapp'] != db_participant.whatsapp:
            existing = db.query(Participant).filter(Participant.id != participant_id, Participant.whatsapp == update_data['whatsapp']).first()
            if existing:
                raise HTTPException(status_code=400, detail="El número de WhatsApp ya está en uso por otro docente.")

        # Aplicar los cambios
        for field, value in update_data.items():
            setattr(db_participant, field, value)
        
        db.commit()
        db.refresh(db_participant)
        return db_participant
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