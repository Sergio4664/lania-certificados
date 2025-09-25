# backend/app/routers/admin_docentes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
# CORRECCIÓN CLAVE: Se importan las clases directamente, no el paquete 'schemas'
from app.schemas.docente import DocenteCreate, DocenteUpdate, DocenteOut
from app.models.docente import Docente
from typing import List
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/docentes", tags=["admin-docentes"])

@router.post("/", response_model=DocenteOut)
def create_docente(docente: DocenteCreate, db: Session = Depends(get_db)):
    """Crear un nuevo docente"""
    try:
        # --- LÓGICA DE VALIDACIÓN MEJORADA ---
        # 1. Verificar email institucional (obligatorio)
        existing = db.query(Docente).filter(Docente.institutional_email == docente.institutional_email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe un docente con ese email institucional")
        
        # 2. Verificar campos únicos opcionales solo si tienen valor
        if docente.personal_email:
            existing = db.query(Docente).filter(Docente.personal_email == docente.personal_email).first()
            if existing:
                raise HTTPException(status_code=400, detail="Ya existe un docente con ese email personal")

        if docente.telefono:
            existing = db.query(Docente).filter(Docente.telefono == docente.telefono).first()
            if existing:
                raise HTTPException(status_code=400, detail="Ya existe un docente con ese teléfono")
        
        if docente.whatsapp:
            existing = db.query(Docente).filter(Docente.whatsapp == docente.whatsapp).first()
            if existing:
                raise HTTPException(status_code=400, detail="Ya existe un docente con ese número de WhatsApp")
        
        # Crear nuevo docente
        db_docente = Docente(**docente.dict())
        db.add(db_docente)
        db.commit()
        db.refresh(db_docente)
        return db_docente
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creando docente: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@router.get("/", response_model=List[DocenteOut])
def list_docentes(db: Session = Depends(get_db)):
    """Listar todos los docentes"""
    try:
        return db.query(Docente).all()
    except Exception as e:
        logger.error(f"Error listando docentes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@router.get("/{docente_id}", response_model=DocenteOut)
def get_docente(docente_id: int, db: Session = Depends(get_db)):
    """Obtener un docente específico"""
    try:
        docente = db.query(Docente).get(docente_id)
        if not docente:
            raise HTTPException(status_code=404, detail="Docente no encontrado")
        return docente
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo docente: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

# CORRECCIÓN CLAVE: Se usa 'DocenteUpdate' directamente porque se importó arriba
@router.put("/{docente_id}", response_model=DocenteOut)
def update_docente(docente_id: int, docente_in: DocenteUpdate, db: Session = Depends(get_db)):
    """Actualizar un docente"""
    try:
        db_docente = db.query(Docente).get(docente_id)
        if not db_docente:
            raise HTTPException(status_code=404, detail="Docente no encontrado")

        # Se usa 'docente_in' (la entrada) para la actualización
        update_data = docente_in.dict(exclude_unset=True)

        # Validar campos únicos solo si están presentes en la actualización
        if 'institutional_email' in update_data and update_data['institutional_email'] != db_docente.institutional_email:
            existing = db.query(Docente).filter(Docente.id != docente_id, Docente.institutional_email == update_data['institutional_email']).first()
            if existing:
                raise HTTPException(status_code=400, detail="El email institucional ya está en uso por otro docente.")

        if 'personal_email' in update_data and update_data.get('personal_email') and update_data['personal_email'] != db_docente.personal_email:
            existing = db.query(Docente).filter(Docente.id != docente_id, Docente.personal_email == update_data['personal_email']).first()
            if existing:
                raise HTTPException(status_code=400, detail="El email personal ya está en uso por otro docente.")

        if 'telefono' in update_data and update_data.get('telefono') and update_data['telefono'] != db_docente.telefono:
            existing = db.query(Docente).filter(Docente.id != docente_id, Docente.telefono == update_data['telefono']).first()
            if existing:
                raise HTTPException(status_code=400, detail="El teléfono ya está en uso por otro docente.")

        if 'whatsapp' in update_data and update_data.get('whatsapp') and update_data['whatsapp'] != db_docente.whatsapp:
            existing = db.query(Docente).filter(Docente.id != docente_id, Docente.whatsapp == update_data['whatsapp']).first()
            if existing:
                raise HTTPException(status_code=400, detail="El número de WhatsApp ya está en uso por otro docente.")

        # Aplicar los cambios
        for field, value in update_data.items():
            setattr(db_docente, field, value)
        
        db.commit()
        db.refresh(db_docente)
        return db_docente
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error actualizando docente: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@router.delete("/{docente_id}")
def delete_docente(docente_id: int, db: Session = Depends(get_db)):
    """Eliminar un docente"""
    try:
        docente = db.query(Docente).get(docente_id)
        if not docente:
            raise HTTPException(status_code=404, detail="Docente no encontrado")
        
        db.delete(docente)
        db.commit()
        return {"message": "Docente eliminado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error eliminando docente: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")