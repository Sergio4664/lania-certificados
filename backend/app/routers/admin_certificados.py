# Ruta: backend/app/routers/admin_certificados.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app import models
from app.schemas.certificado import Certificado, CertificadoCreate, CertificadoOut
from app.services.certificate_service import generate_certificate
from app.services.email_service import send_certificate_email
from app.routers.dependencies import get_current_admin_user

router = APIRouter(
    prefix="/admin/certificados",
    tags=["Admin - Certificados"],
    dependencies=[Depends(get_current_admin_user)]
)

@router.get("/", response_model=List[CertificadoOut])
def read_all_certificados(db: Session = Depends(get_db)):
    """
    Obtiene todos los certificados.
    Usa un response_model simple (CertificadoOut) para evitar ciclos de anidamiento en la lista.
    """
    certificados = db.query(models.Certificado).order_by(models.Certificado.id.desc()).all()
    return certificados

@router.get("/{certificado_id}", response_model=Certificado)
def read_single_certificado(certificado_id: int, db: Session = Depends(get_db)):
    """
    Obtiene un certificado específico con todas sus relaciones cargadas.
    Es seguro usar el response_model completo aquí porque es un solo objeto.
    """
    certificado = db.query(models.Certificado).options(
        joinedload(models.Certificado.inscripcion)
        .joinedload(models.Inscripcion.participante),
        joinedload(models.Certificado.inscripcion)
        .joinedload(models.Inscripcion.producto_educativo),
        joinedload(models.Certificado.docente)
    ).filter(models.Certificado.id == certificado_id).first()
    
    if not certificado:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")
        
    return certificado

@router.post("/participante", response_model=Certificado)
def issue_certificate_to_participant(
    certificado_create: CertificadoCreate, db: Session = Depends(get_db)
):
    db_producto_educativo = (
        db.query(models.ProductoEducativo)
        .filter(models.ProductoEducativo.id == certificado_create.producto_educativo_id)
        .first()
    )
    if not db_producto_educativo:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")

    # Corrección: El modelo de creación no tiene 'participante_id', se debe buscar en 'inscripcion_id'
    if not certificado_create.inscripcion_id:
        raise HTTPException(status_code=400, detail="Se requiere inscripcion_id para emitir un certificado a un participante.")

    db_inscripcion = db.query(models.Inscripcion).filter(models.Inscripcion.id == certificado_create.inscripcion_id).first()
    if not db_inscripcion:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")

    file_path = generate_certificate(
        db_inscripcion.participante.nombre_completo,
        db_producto_educativo.nombre,
        db_producto_educativo.horas,
        # Asumiendo que quieres el nombre del primer docente, si no, la lógica debe ajustarse.
        db_producto_educativo.docentes[0].nombre_completo if db_producto_educativo.docentes else "Docente no asignado",
    )
    nuevo_certificado = models.Certificado(
        inscripcion_id=db_inscripcion.id,
        producto_educativo_id=db_producto_educativo.id,
        archivo_path=str(file_path), # Asegurarse que el path se guarde como string
    )
    db.add(nuevo_certificado)
    db.commit()
    db.refresh(nuevo_certificado)
    return nuevo_certificado


@router.post("/docente", response_model=Certificado)
def issue_certificate_to_docente(
    certificado_create: CertificadoCreate, db: Session = Depends(get_db)
):
    db_producto_educativo = (
        db.query(models.ProductoEducativo)
        .filter(models.ProductoEducativo.id == certificado_create.producto_educativo_id)
        .first()
    )
    if not db_producto_educativo:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")

    if not certificado_create.docente_id:
        raise HTTPException(status_code=400, detail="Se requiere docente_id para emitir un certificado a un docente.")

    db_docente = (
        db.query(models.Docente)
        .filter(models.Docente.id == certificado_create.docente_id)
        .first()
    )
    if not db_docente:
        raise HTTPException(status_code=404, detail="Docente no encontrado")

    file_path = generate_certificate(
        db_docente.nombre_completo,
        db_producto_educativo.nombre,
        db_producto_educativo.horas,
        db_docente.nombre_completo, # El docente es el mismo que recibe
        is_docente=True,
    )
    nuevo_certificado = models.Certificado(
        docente_id=db_docente.id,
        producto_educativo_id=db_producto_educativo.id,
        archivo_path=str(file_path),
    )
    db.add(nuevo_certificado)
    db.commit()
    db.refresh(nuevo_certificado)
    return nuevo_certificado


@router.post("/enviar/{certificado_id}")
def send_certificate_email_by_id(certificado_id: int, db: Session = Depends(get_db)):
    db_certificado = db.query(models.Certificado).filter(models.Certificado.id == certificado_id).first()
    if not db_certificado:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")

    recipient_email = ""
    recipient_name = ""
    
    if db_certificado.inscripcion:
        recipient_email = db_certificado.inscripcion.participante.email_personal
        recipient_name = db_certificado.inscripcion.participante.nombre_completo
    elif db_certificado.docente:
        recipient_email = db_certificado.docente.email_personal
        recipient_name = db_certificado.docente.nombre_completo
    else:
        raise HTTPException(status_code=400, detail="El certificado no está asociado a un participante o docente.")

    send_certificate_email(
        recipient_email=recipient_email,
        user_name=recipient_name,
        course_name=db_certificado.producto_educativo.nombre,
        attachment_path=db_certificado.archivo_path,
    )
    return {"message": "Certificado enviado exitosamente"}