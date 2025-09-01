# backend/app/routers/admin_docentes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.docente import Docente
from app.schemas.docente import DocenteCreate, DocenteUpdate, DocenteOut
from app.core.security import get_password_hash
from typing import List
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/docentes", tags=["admin-docentes"])

@router.post("/", response_model=DocenteOut)
def create_docente(docente: DocenteCreate, db: Session = Depends(get_db)):
    """Crear un nuevo docente"""
    try:
        # Verificar si ya existe el email
        existing = db.query(Docente).filter(Docente.email == docente.email).first()
        if existing:
            raise HTTPException(400, "Ya existe un docente con ese email")
        
        # Crear nuevo docente
        docente_data = docente.dict()
        if docente_data.get('password'):
            docente_data['password'] = get_password_hash(docente_data['password'])
        
        db_docente = Docente(**docente_data)
        db.add(db_docente)
        db.commit()
        db.refresh(db_docente)
        return db_docente
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creando docente: {str(e)}")
        raise HTTPException(500, f"Error interno: {str(e)}")

@router.get("/", response_model=List[DocenteOut])
def list_docentes(db: Session = Depends(get_db)):
    """Listar todos los docentes"""
    try:
        return db.query(Docente).all()
    except Exception as e:
        logger.error(f"Error listando docentes: {str(e)}")
        raise HTTPException(500, f"Error interno: {str(e)}")

@router.get("/{docente_id}", response_model=DocenteOut)
def get_docente(docente_id: int, db: Session = Depends(get_db)):
    """Obtener un docente específico"""
    try:
        docente = db.query(Docente).get(docente_id)
        if not docente:
            raise HTTPException(404, "Docente no encontrado")
        return docente
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo docente: {str(e)}")
        raise HTTPException(500, f"Error interno: {str(e)}")

@router.put("/{docente_id}", response_model=DocenteOut)
def update_docente(docente_id: int, data: DocenteUpdate, db: Session = Depends(get_db)):
    """Actualizar un docente"""
    try:
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
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error actualizando docente: {str(e)}")
        raise HTTPException(500, f"Error interno: {str(e)}")

@router.delete("/{docente_id}")
def disable_docente(docente_id: int, db: Session = Depends(get_db)):
    """Desactivar un docente"""
    try:
        docente = db.query(Docente).get(docente_id)
        if not docente:
            raise HTTPException(404, "Docente no encontrado")
        
        docente.is_active = False
        db.commit()
        return {"message": "Docente desactivado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error desactivando docente: {str(e)}")
        raise HTTPException(500, f"Error interno: {str(e)}")