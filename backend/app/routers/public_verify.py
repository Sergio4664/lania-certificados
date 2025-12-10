# Ruta: backend/app/routers/public_verify.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from fastapi.responses import FileResponse
from pathlib import Path 

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
        joinedload(models.Certificado.docente), 
        joinedload(models.Certificado.producto_educativo) 
            .joinedload(models.ProductoEducativo.docentes)
    ).filter(models.Certificado.folio == folio).first()
    if not certificado:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")

    inscripcion = certificado.inscripcion
    docente_directo = certificado.docente
    
    nombre_del_portador = None
    producto = certificado.producto_educativo 
    
    if inscripcion:
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


# ----------------------------------------------------------------------
# ENDPOINT PARA OBTENER EL PDF (CORREGIDO)
# ----------------------------------------------------------------------
@router.get("/certificado/{folio}/pdf", 
            response_class=FileResponse, 
            summary="Obtener PDF de Certificado por Folio para Visualización")
def get_certificado_pdf(folio: str, db: Session = Depends(get_db)):
    """
    Busca un certificado por su folio y devuelve el archivo PDF asociado.
    """
    
    # 1. Buscar el certificado por folio
    certificado = db.query(models.Certificado).filter(models.Certificado.folio == folio).first()
    
    if not certificado:
        raise HTTPException(status_code=404, detail="Certificado no encontrado o folio incorrecto")
    
    # 2. OBTENER LA RUTA DEL PDF: Usando 'archivo_path' (la columna correcta del modelo)
    pdf_path_str = certificado.archivo_path
    
    if not pdf_path_str:
        # Esto indica un problema en la generación o almacenamiento de la ruta en la DB
        raise HTTPException(
            status_code=500, 
            detail="Ruta del archivo PDF no especificada para este certificado. Columna 'archivo_path' vacía."
        )

    # 3. Validar y servir el archivo
    file_path = Path(pdf_path_str)
    
    if not file_path.is_file():
        # Esto indica que el archivo físico fue movido o eliminado
        raise HTTPException(status_code=404, detail=f"Archivo PDF no encontrado en el servidor en la ruta: {pdf_path_str}")

    # 4. Devolver el FileResponse
    return FileResponse(
        path=file_path, 
        filename=f"Constancia-{folio}.pdf", 
        media_type='application/pdf'
    )