# app/routers/admin_participants.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal, get_db
from app.models.participant import Participant
from app.schemas.participant import ParticipantCreate, ParticipantUpdate, ParticipantOut

router = APIRouter(prefix="/api/admin/participants", tags=["admin-participants"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=ParticipantOut)
def create_participant(participant: ParticipantCreate, db: Session = Depends(get_db)):
    """Crear un nuevo participante"""
    # Verificar si ya existe el email
    existing = db.query(Participant).filter(Participant.email == participant.email).first()
    if existing:
        raise HTTPException(400, "Ya existe un participante con ese email")
    
    db_participant = Participant(**participant.dict())
    db.add(db_participant)
    db.commit()
    db.refresh(db_participant)
    return db_participant

@router.get("/", response_model=list[ParticipantOut])
def list_participants(db: Session = Depends(get_db)):
    """Listar todos los participantes"""
    return db.query(Participant).all()

@router.get("/{participant_id}", response_model=ParticipantOut)
def get_participant(participant_id: int, db: Session = Depends(get_db)):
    """Obtener un participante específico"""
    participant = db.query(Participant).get(participant_id)
    if not participant:
        raise HTTPException(404, "Participante no encontrado")
    return participant

@router.put("/{participant_id}", response_model=ParticipantOut)
def update_participant(participant_id: int, data: ParticipantUpdate, db: Session = Depends(get_db)):
    """Actualizar un participante"""
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

@router.delete("/{participant_id}")
def delete_participant(participant_id: int, db: Session = Depends(get_db)):
    """Eliminar un participante"""
    participant = db.query(Participant).get(participant_id)
    if not participant:
        raise HTTPException(404, "Participante no encontrado")
    
    db.delete(participant)
    db.commit()
    return {"message": "Participante eliminado correctamente"}