from fastapi import APIRouter, Depends, HTTPException, status # <-- Importar status
from sqlalchemy.orm import Session
from typing import List
import logging # <-- 1. Importar el módulo de logging

from app import models
from app.schemas.certificado import Certificado, CertificadoCreate
from app.database import get_db
from app.services import certificate_service
from app.routers.dependencies import get_current_admin_user

logger = logging.getLogger(__name__) # <-- 2. Crear la instancia del logger

router = APIRouter(
    prefix="/api/admin/certificados",
    tags=["Admin - Certificados"],
    dependencies=[Depends(get_current_admin_user)]
)

@router.post(
    "/emitir-masivamente/{producto_id}",
    summary="Emite y envía todas las constancias pendientes de un producto educativo",
    response_model=dict
)
def emitir_constancias_masivas(producto_id: int, db: Session = Depends(get_db)):
    """
    Este endpoint inicia el proceso de emisión masiva para un producto educativo.
    - ... (resto de la descripción)
    """
    try:
        resultado = certificate_service.issue_and_send_bulk_certificates_for_product(db, producto_id)
        return resultado
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        # Ahora 'logger' ya no estará en amarillo y funcionará correctamente
        logger.error(f"Error inesperado en la emisión masiva para el producto {producto_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ocurrió un error interno: {e}"
        )

# Se usan las clases importadas directamente
@router.post("/", response_model=Certificado, status_code=201)
def create_certificado(certificado: CertificadoCreate, db: Session = Depends(get_db)):
    db_inscripcion = db.query(models.Inscripcion).filter(models.Inscripcion.id == certificado.inscripcion_id).first()
    if not db_inscripcion:
        raise HTTPException(status_code=404, detail="La inscripción asociada no existe.")
    
    if db_inscripcion.certificado:
        raise HTTPException(status_code=400, detail="Esta inscripción ya tiene un certificado asociado.")

    db_folio = db.query(models.Certificado).filter(models.Certificado.folio == certificado.folio).first()
    if db_folio:
        raise HTTPException(status_code=400, detail="El folio del certificado ya está en uso.")

    # Aquí iría la llamada al servicio que genera el PDF y la URL
    # pdf_url = generate_certificate_pdf(db_inscripcion)
    # Por ahora, lo dejamos como un valor placeholder:
    url_validacion_placeholder = f"https://tusitio.com/verificar/{certificado.folio}"

    db_certificado = models.Certificado(
        **certificado.dict(),
        url_validacion=url_validacion_placeholder
    )
    db.add(db_certificado)
    db.commit()
    db.refresh(db_certificado)
    return db_certificado

@router.get("/", response_model=List[Certificado])
def read_certificados(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    certificados = db.query(models.Certificado).order_by(models.Certificado.id.desc()).offset(skip).limit(limit).all()
    return certificados

@router.get("/{certificado_id}", response_model=Certificado)
def read_certificado(certificado_id: int, db: Session = Depends(get_db)):
    db_certificado = db.query(models.Certificado).filter(models.Certificado.id == certificado_id).first()
    if db_certificado is None:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")
    return db_certificado

@router.delete("/{certificado_id}", status_code=204)
def delete_certificado(certificado_id: int, db: Session = Depends(get_db)):
    db_certificado = db.query(models.Certificado).filter(models.Certificado.id == certificado_id).first()
    if db_certificado is None:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")
    
    # Aquí también iría la lógica para borrar el archivo PDF del servidor
    
    db.delete(db_certificado)
    db.commit()
    return