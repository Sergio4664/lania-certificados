from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import logging

from app.database import get_db
from app.models.certificado import Certificado as CertificadoModel
from app.schemas.certificado import Certificado, CertificadoCreate
from app.schemas.docente import DocenteCertificadoCreate # Necesitaremos un nuevo schema
from app.services import certificate_service
from app.routers.dependencies import get_current_admin_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/admin/certificados",
    tags=["Admin - Certificados"],
    dependencies=[Depends(get_current_admin_user)]
)

@router.post("/", response_model=Certificado, status_code=status.HTTP_201_CREATED)
def create_certificado_participante(certificado: CertificadoCreate, db: Session = Depends(get_db)):
    """Crea una constancia para una inscripción de participante."""
    try:
        return certificate_service.issue_for_participant(db, certificado.inscripcion_id)
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error al crear certificado para inscripción {certificado.inscripcion_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor.")

# ✅ NUEVO ENDPOINT PARA DOCENTES
@router.post("/docente/", response_model=Certificado, status_code=status.HTTP_201_CREATED)
def create_certificado_docente(data: DocenteCertificadoCreate, db: Session = Depends(get_db)):
    """Crea una constancia para un docente asignado a un producto."""
    try:
        return certificate_service.issue_for_docente(db, data.producto_id, data.docente_id)
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error al crear certificado para docente {data.docente_id} en producto {data.producto_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor.")


@router.post("/emitir-masivamente/{producto_id}/", response_model=dict)
def emitir_constancias_masivas(producto_id: int, db: Session = Depends(get_db)):
    """Inicia el proceso de emisión masiva para participantes Y docentes."""
    try:
        return certificate_service.issue_and_send_bulk_certificates_for_product(db, producto_id)
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.error(f"Error inesperado en emisión masiva para producto {producto_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Ocurrió un error interno: {e}")

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