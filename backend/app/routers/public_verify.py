from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app import models
from app.schemas.certificado import CertificadoPublic
from app.database import get_db

router = APIRouter(
    prefix="/public",
    tags=["Public"]
)

@router.get("/verificar/{folio}", response_model=CertificadoPublic)
def verify_certificate_by_folio(folio: str, db: Session = Depends(get_db)):
    certificado = db.query(models.Certificado).options(
        joinedload(models.Certificado.inscripcion)
            .joinedload(models.Inscripcion.participante),
        joinedload(models.Certificado.inscripcion)
            .joinedload(models.Inscripcion.producto_educativo)
            .joinedload(models.ProductoEducativo.docentes)
    ).filter(models.Certificado.folio == folio).first()

    if not certificado:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")

    inscripcion = certificado.inscripcion
    
    # 🌟 CORRECCIÓN CRÍTICA: Validar si la inscripción está presente
    # Esto previene el AttributeError si el campo de clave foránea es NULL.
    if inscripcion is None:
        raise HTTPException(
            status_code=500, 
            detail=f"Error de integridad de datos: El certificado con folio {folio} no tiene una inscripción válida asociada."
        )
        
    participante = inscripcion.participante
    producto = inscripcion.producto_educativo
    
    # Concatenamos los nombres de todos los docentes para mostrarlos
    nombres_docentes = ", ".join([d.nombre_completo for d in producto.docentes]) if producto.docentes else "N/A"

    return CertificadoPublic(
        folio=certificado.folio,
        fecha_emision=certificado.fecha_emision,
        participante_nombre=participante.nombre_completo,
        producto_educativo_nombre=producto.nombre,
        tipo_producto=producto.tipo_producto.value if producto.tipo_producto else "No especificado"
    )