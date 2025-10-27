from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app import models
# --- CORRECCIÓN DE IMPORTACIÓN ---
# Se importa la clase específica 'CertificadoPublic' desde su archivo.
from app.schemas.certificado import CertificadoPublic
from app.database import get_db

router = APIRouter(
    prefix="/public",
    tags=["Public"]
)

# Ahora se usa 'CertificadoPublic' directamente, sin el prefijo 'schemas.'
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
    participante = inscripcion.participante
    producto = inscripcion.producto_educativo
    
    # Concatenamos los nombres de todos los docentes para mostrarlos
    nombres_docentes = ", ".join([d.nombre_completo for d in producto.docentes]) if producto.docentes else "N/A"

    return CertificadoPublic(
        folio=certificado.folio,
        fecha_emision=certificado.fecha_emision,
        participante_nombre=participante.nombre_completo,    # <-- CLAVE CORREGIDA
        producto_educativo_nombre=producto.nombre,           # <-- CLAVE CORREGIDA
        tipo_producto=producto.tipo_producto.value if producto.tipo_producto else "No especificado" # <-- CAMPO AÑADIDO (ajusta 'producto.tipo_producto.value' según tu modelo)
    )