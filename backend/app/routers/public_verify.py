from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db

router = APIRouter(
    prefix="/public",
    tags=["Public"]
)

@router.get("/verificar/{folio}", response_model=schemas.CertificadoPublic)
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
    participante = inscripcion.participante
    producto = inscripcion.producto_educativo
    
    # Concatenamos los nombres de todos los docentes
    nombres_docentes = ", ".join([d.nombre_completo for d in producto.docentes]) if producto.docentes else "N/A"

    return schemas.CertificadoPublic(
        folio=certificado.folio,
        fecha_emision=certificado.fecha_emision,
        nombre_participante=participante.nombre_completo,
        nombre_producto=producto.nombre,
        horas=producto.horas,
        nombre_docente=nombres_docentes
    )