from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import logging

from app.database import get_db
from app.models.certificado import Certificado as CertificadoModel
from app.schemas.certificado import Certificado, CertificadoCreate
from app.services import certificate_service
from app.routers.dependencies import get_current_admin_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/admin/certificados",
    tags=["Admin - Certificados"],
    dependencies=[Depends(get_current_admin_user)]
)

@router.post("/", response_model=Certificado, status_code=status.HTTP_201_CREATED)
def create_certificado(certificado: CertificadoCreate, db: Session = Depends(get_db)):
    """
    Crea, emite y envía por correo una única constancia para una inscripción.
    """
    try:
        return certificate_service.issue_single_certificate(db, certificado.inscripcion_id)
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error inesperado al crear certificado para inscripción {certificado.inscripcion_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor al crear el certificado.")

@router.post("/emitir-masivamente/{producto_id}/", response_model=dict)
def emitir_constancias_masivas(producto_id: int, db: Session = Depends(get_db)):
    """
    Inicia el proceso de emisión masiva para un producto educativo.
    """
    try:
        return certificate_service.issue_and_send_bulk_certificates_for_product(db, producto_id)
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error inesperado en la emisión masiva para el producto {producto_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Ocurrió un error interno durante la emisión masiva: {e}")

@router.get("/", response_model=List[Certificado])
def read_certificados(db: Session = Depends(get_db)):
    return db.query(CertificadoModel).order_by(CertificadoModel.id.desc()).all()

@router.delete("/{certificado_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_certificado(certificado_id: int, db: Session = Depends(get_db)):
    db_certificado = db.query(CertificadoModel).filter(CertificadoModel.id == certificado_id).first()
    if db_certificado is None:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")
    
    db.delete(db_certificado)
    db.commit()
    return