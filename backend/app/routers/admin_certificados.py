# Ruta: backend/app/routers/admin_certificados.py
from fastapi import APIRouter, Depends, HTTPException, status
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
    Recupera todos los certificados de la base de datos, ordenados por ID descendente.
    """
    certificados = db.query(models.Certificado).order_by(models.Certificado.id.desc()).all()
    return certificados

@router.get("/{certificado_id}", response_model=Certificado)
def read_single_certificado(certificado_id: int, db: Session = Depends(get_db)):
    """
    Recupera un único certificado por su ID, cargando sus relaciones principales.
    """
    certificado = db.query(models.Certificado).options(
        joinedload(models.Certificado.inscripcion).joinedload(models.Inscripcion.participante),
        joinedload(models.Certificado.inscripcion).joinedload(models.Inscripcion.producto_educativo),
        joinedload(models.Certificado.docente)
    ).filter(models.Certificado.id == certificado_id).first()
    
    if not certificado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificado no encontrado")
        
    return certificado

@router.post("/participante", response_model=Certificado, status_code=status.HTTP_201_CREATED)
def issue_certificate_to_participant(
    certificado_create: CertificadoCreate, db: Session = Depends(get_db)
):
    """
    Emite un nuevo certificado para un participante a partir de una inscripción.
    """
    if not certificado_create.inscripcion_id or not certificado_create.producto_educativo_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Se requiere 'inscripcion_id' y 'producto_educativo_id'.")

    db_inscripcion = db.query(models.Inscripcion).options(
        joinedload(models.Inscripcion.participante),
        joinedload(models.Inscripcion.producto_educativo).joinedload(models.ProductoEducativo.docentes)
    ).filter(models.Inscripcion.id == certificado_create.inscripcion_id).first()
    
    if not db_inscripcion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inscripción no encontrada")

    producto = db_inscripcion.producto_educativo
    instructor_name = producto.docentes[0].nombre_completo if producto.docentes else "Equipo LANIA"
    
    file_path = generate_certificate(
        participant_name=db_inscripcion.participante.nombre_completo,
        course_name=producto.nombre,
        course_type=producto.modalidad.value,
        course_hours=producto.horas,
        instructor_name=instructor_name,
    )
    
    nuevo_certificado = models.Certificado(
        inscripcion_id=db_inscripcion.id,
        producto_educativo_id=producto.id,
        archivo_path=str(file_path),
    )
    db.add(nuevo_certificado)
    db.commit()
    db.refresh(nuevo_certificado)
    
    return nuevo_certificado

@router.post("/docente", response_model=Certificado, status_code=status.HTTP_201_CREATED)
def issue_certificate_to_docente(
    certificado_create: CertificadoCreate, db: Session = Depends(get_db)
):
    """
    Emite una nueva constancia de ponente para un docente.
    """
    if not certificado_create.docente_id or not certificado_create.producto_educativo_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Se requiere 'docente_id' y 'producto_educativo_id'.")

    db_docente = db.query(models.Docente).filter(models.Docente.id == certificado_create.docente_id).first()
    if not db_docente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Docente no encontrado")
        
    db_producto = db.query(models.ProductoEducativo).filter(models.ProductoEducativo.id == certificado_create.producto_educativo_id).first()
    if not db_producto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto educativo no encontrado")

    file_path = generate_certificate(
        participant_name=db_docente.nombre_completo,
        course_name=db_producto.nombre,
        course_type=db_producto.modalidad.value,
        course_hours=db_producto.horas,
        is_docente=True,
    )
    
    nuevo_certificado = models.Certificado(
        docente_id=db_docente.id,
        producto_educativo_id=db_producto.id,
        archivo_path=str(file_path),
    )
    db.add(nuevo_certificado)
    db.commit()
    db.refresh(nuevo_certificado)

    return nuevo_certificado

@router.post("/{certificado_id}/enviar", status_code=status.HTTP_200_OK)
def send_certificate_email_by_id(certificado_id: int, db: Session = Depends(get_db)):
    """
    Localiza un certificado y lo reenvía por correo a su destinatario.
    """
    db_certificado = db.query(models.Certificado).filter(models.Certificado.id == certificado_id).first()
    if not db_certificado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificado no encontrado")

    if db_certificado.inscripcion:
        recipient_email = db_certificado.inscripcion.participante.email_personal
        recipient_name = db_certificado.inscripcion.participante.nombre_completo
    elif db_certificado.docente:
        recipient_email = db_certificado.docente.email_personal
        recipient_name = db_certificado.docente.nombre_completo
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El certificado no está asociado a un destinatario.")

    send_certificate_email(
        recipient_email=recipient_email,
        user_name=recipient_name,
        course_name=db_certificado.producto_educativo.nombre,
        attachment_path=db_certificado.archivo_path,
    )
    return {"message": "Certificado enviado exitosamente"}

@router.delete("/{certificado_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_certificado(certificado_id: int, db: Session = Depends(get_db)):
    """
    Elimina un certificado de la base de datos.
    """
    db_certificado = db.query(models.Certificado).filter(models.Certificado.id == certificado_id).first()
    if not db_certificado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificado no encontrado")
        
    db.delete(db_certificado)
    db.commit()
    # Una respuesta 204 No Content no debe tener cuerpo.