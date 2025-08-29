# backend/app/routers/admin_teachers.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal, get_db
from app.models.docente import Docente
from pydantic import BaseModel, EmailStr
from typing import List
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/docentes", tags=["admin-docentes"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class DocenteCreate(BaseModel):
    full_name: str
    email: EmailStr
    telefono: str | None = None
    especialidad: str | None = None

class DocenteUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    telefono: str | None = None
    especialidad: str | None = None
    is_active: bool | None = None

class DocenteOut(BaseModel):
    id: int
    full_name: str
    email: str
    telefono: str | None
    especialidad: str | None
    is_active: bool
    full_name: str

    class Config:
        from_attributes = True

@router.post("/", response_model=DocenteOut)
def create_docente(docente: DocenteCreate, db: Session = Depends(get_db)):
    """Crear un nuevo docente"""
    # Verificar si ya existe el email
    existing = db.query(Docente).filter(Docente.email == docente.email).first()
    if existing:
        raise HTTPException(400, "Ya existe un docente con ese email")
    
    # Crear nuevo docente
    db_docente = Docente(**docente.dict())
    db.add(db_docente)
    db.commit()
    db.refresh(db_docente)
    return db_docente

@router.get("/", response_model=List[DocenteOut])
def list_docentes(db: Session = Depends(get_db)):
    """Listar todos los docentes"""
    return db.query(Docente).all()

@router.get("/{docente_id}", response_model=DocenteOut)
def get_docente(docente_id: int, db: Session = Depends(get_db)):
    """Obtener un docente específico"""
    docente = db.query(Docente).get(docente_id)
    if not docente:
        raise HTTPException(404, "Docente no encontrado")
    return docente

@router.put("/{docente_id}", response_model=DocenteOut)
def update_docente(docente_id: int, data: DocenteUpdate, db: Session = Depends(get_db)):
    """Actualizar un docente"""
    docente = db.query(Docente).get(docente_id)
    if not docente:
        raise HTTPException(404, "Docente no encontrado")
    
    # Verificar email único si se está actualizando
    if data.email and data.email != docente.email:
        existing = db.query(Docente).filter(Docente.email == data.email).first()
        if existing:
            raise HTTPException(400, "Ya existe un docente con ese email")
    
    # Actualizar solo los campos proporcionados
    for field, value in data.dict(exclude_unset=True).items():
        setattr(docente, field, value)
    
    db.commit()
    db.refresh(docente)
    return docente

@router.delete("/{docente_id}")
def disable_docente(docente_id: int, db: Session = Depends(get_db)):
    """Desactivar un docente"""
    docente = db.query(Docente).get(docente_id)
    if not docente:
        raise HTTPException(404, "Docente no encontrado")
    
    docente.is_active = False
    db.commit()
    return {"message": "Docente desactivado correctamente"}