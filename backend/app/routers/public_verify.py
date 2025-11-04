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
    
    # Cargar todas las posibles relaciones en una sola consulta para optimizar
    certificado = db.query(models.Certificado).options(
        # Relaciones para el caso PARTICIPANTE (Inscripcion -> Participante)
        joinedload(models.Certificado.inscripcion)
            .joinedload(models.Inscripcion.participante),
        
        # Relación directa para el caso DOCENTE (Certificado -> Docente)
        joinedload(models.Certificado.docente), 
        
        # Relación con el producto educativo (necesario en ambos casos)
        joinedload(models.Certificado.producto_educativo) 
            .joinedload(models.ProductoEducativo.docentes)
    ).filter(models.Certificado.folio == folio).first()

    if not certificado:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")

    # --- Determinar el portador y el producto educativo ---
    inscripcion = certificado.inscripcion
    docente_directo = certificado.docente
    
    nombre_del_portador = None
    producto = certificado.producto_educativo # El producto es siempre una relación directa del certificado
    
    if inscripcion:
        # Caso 1: Certificado de Participante
        participante = inscripcion.participante
        if participante is None:
            raise HTTPException(status_code=500, detail=f"Error de datos: Inscripción para {folio} existe, pero el participante está ausente.")
        
        nombre_del_portador = participante.nombre_completo
        
    elif docente_directo:
        # Caso 2: Certificado de Docente
        nombre_del_portador = docente_directo.nombre_completo
        
    else:
        # Caso 3: Certificado sin portador válido (ambas claves foráneas nulas)
        raise HTTPException(
            status_code=500, 
            detail=f"Error de integridad de datos: El certificado {folio} no tiene portador (participante ni docente) asociado."
        )

    # Validación final del producto (aunque en el modelo es not nullable, es una buena práctica)
    if producto is None:
        raise HTTPException(
            status_code=500, 
            detail=f"Error de integridad de datos: El certificado {folio} tiene portador, pero no tiene producto educativo asociado."
        )
    
    # Concatenamos los nombres de todos los docentes del producto educativo para mostrarlos
    nombres_docentes = ", ".join([d.nombre_completo for d in producto.docentes]) if producto.docentes else "N/A"

    # Retorno unificado (la variable 'participante_nombre' contendrá el nombre del docente)
    return CertificadoPublic(
        folio=certificado.folio,
        fecha_emision=certificado.fecha_emision,
        # Usamos 'or "Nombre Desconocido"' para manejar casos raros de NULL en la columna de nombre
        participante_nombre=nombre_del_portador or "Nombre Desconocido", 
        producto_educativo_nombre=producto.nombre or "Producto Desconocido",
        tipo_producto=producto.tipo_producto.value if producto.tipo_producto else "No especificado"
    )