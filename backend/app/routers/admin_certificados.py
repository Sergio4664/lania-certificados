# Ruta: backend/app/routers/admin_certificados.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.database import get_db
from app.models import Certificado as CertificadoModel
from app.models import ProductoEducativo as ProductoEducativoModel
from app.models import Participante as ParticipanteModel
from app.models import Docente as DocenteModel
from app.models import Inscripcion as InscripcionModel
from app.schemas.certificado import Certificado, CertificadoCreate
from app.services.certificate_service import generate_certificate
from app.services.email_service import send_certificate_email
from app.routers.dependencies import get_current_admin_user

# --- ✅ CORRECCIÓN PRINCIPAL ---
# Se define el router con su prefijo y dependencias, igual que los otros routers de admin.
router = APIRouter(
    prefix="/admin/certificados",
    tags=["Admin - Certificados"],
    dependencies=[Depends(get_current_admin_user)]
)

@router.get("/", response_model=List[Certificado])
def read_all_certificados(db: Session = Depends(get_db)):
    """
    Obtiene todos los certificados con sus relaciones cargadas.
    """
    certificados = db.query(CertificadoModel).options(
        joinedload(CertificadoModel.inscripcion)
        .joinedload(InscripcionModel.participante),
        joinedload(CertificadoModel.inscripcion)
        .joinedload(InscripcionModel.producto_educativo),
        joinedload(CertificadoModel.docente)
    ).order_by(CertificadoModel.id.desc()).all()
    return certificados

@router.post("/participante", response_model=Certificado)
def issue_certificate_to_participant(
    certificado_create: CertificadoCreate, db: Session = Depends(get_db)
):
    # (El resto del código no necesita cambios, ya que la lógica es correcta)
    db_producto_educativo = (
        db.query(ProductoEducativoModel)
        .filter(ProductoEducativoModel.id == certificado_create.producto_educativo_id)
        .first()
    )
    if not db_producto_educativo:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")

    db_participante = (
        db.query(ParticipanteModel)
        .filter(ParticipanteModel.id == certificado_create.participante_id)
        .first()
    )
    if not db_participante:
        raise HTTPException(status_code=404, detail="Participante no encontrado")

    file_path = generate_certificate(
        db_participante.nombre,
        db_producto_educativo.nombre,
        db_producto_educativo.tipo.value,
    )
    nuevo_certificado = CertificadoModel(
        participante_id=db_participante.id,
        producto_educativo_id=db_producto_educativo.id,
        archivo_path=file_path,
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
        db.query(ProductoEducativoModel)
        .filter(ProductoEducativoModel.id == certificado_create.producto_educativo_id)
        .first()
    )
    if not db_producto_educativo:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")

    db_docente = (
        db.query(DocenteModel)
        .filter(DocenteModel.id == certificado_create.docente_id)
        .first()
    )
    if not db_docente:
        raise HTTPException(status_code=404, detail="Docente no encontrado")

    file_path = generate_certificate(
        db_docente.nombre,
        db_producto_educativo.nombre,
        db_producto_educativo.tipo.value,
        is_docente=True,
    )
    nuevo_certificado = CertificadoModel(
        docente_id=db_docente.id,
        producto_educativo_id=db_producto_educativo.id,
        archivo_path=file_path,
    )
    db.add(nuevo_certificado)
    db.commit()
    db.refresh(nuevo_certificado)
    return nuevo_certificado


@router.post("/enviar/participante/{certificado_id}")
def send_certificate_to_participant(certificado_id: int, db: Session = Depends(get_db)):
    db_certificado = (
        db.query(CertificadoModel)
        .filter(CertificadoModel.id == certificado_id)
        .first()
    )
    if not db_certificado:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")

    send_certificate_email(
        db_certificado.participante.email,
        db_certificado.participante.nombre,
        db_certificado.producto_educativo.nombre,
        db_certificado.archivo_path,
    )
    return {"message": "Certificado enviado exitosamente"}


@router.post("/enviar/docente/{certificado_id}")
def send_certificate_to_docente(certificado_id: int, db: Session = Depends(get_db)):
    db_certificado = (
        db.query(CertificadoModel).filter(CertificadoModel.id == certificado_id).first()
    )
    if not db_certificado:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")

    send_certificate_email(
        db_certificado.docente.email,
        db_certificado.docente.nombre,
        db_certificado.producto_educativo.nombre,
        db_certificado.archivo_path,
    )
    return {"message": "Certificado enviado exitosamente"}

@router.post("/participantes/producto/{producto_id}")
def issue_certificates_for_product_participants(producto_id: int, db: Session = Depends(get_db)):
    db_producto_educativo = db.query(ProductoEducativoModel).filter(ProductoEducativoModel.id == producto_id).first()
    if not db_producto_educativo:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")

    for participante in db_producto_educativo.participantes:
        file_path = generate_certificate(
            participante.nombre,
            db_producto_educativo.nombre,
            db_producto_educativo.tipo.value,
        )
        nuevo_certificado = CertificadoModel(
            participante_id=participante.id,
            producto_educativo_id=db_producto_educativo.id,
            archivo_path=file_path,
        )
        db.add(nuevo_certificado)
    
    db.commit()
    return {"message": "Certificados para participantes emitidos exitosamente"}

@router.post("/docentes/producto/{producto_id}")
def issue_certificates_for_product_docentes(producto_id: int, db: Session = Depends(get_db)):
    db_producto_educativo = db.query(ProductoEducativoModel).filter(ProductoEducativoModel.id == producto_id).first()
    if not db_producto_educativo:
        raise HTTPException(status_code=404, detail="Producto educativo no encontrado")

    for docente in db_producto_educativo.docentes:
        file_path = generate_certificate(
            docente.nombre,
            db_producto_educativo.nombre,
            db_producto_educativo.tipo.value,
            is_docente=True,
        )
        nuevo_certificado = CertificadoModel(
            docente_id=docente.id,
            producto_educativo_id=db_producto_educativo.id,
            archivo_path=file_path,
        )
        db.add(nuevo_certificado)
    
    db.commit()
    return {"message": "Certificados para docentes emitidos exitosamente"}

@router.post("/enviar/participantes/producto/{producto_id}")
def send_certificates_for_product_participants(producto_id: int, db: Session = Depends(get_db)):
    db_certificados = db.query(CertificadoModel).filter(CertificadoModel.producto_educativo_id == producto_id, CertificadoModel.participante_id != None).all()
    if not db_certificados:
        raise HTTPException(status_code=404, detail="No se encontraron certificados para los participantes de este producto")

    for certificado in db_certificados:
        send_certificate_email(
            certificado.participante.email,
            certificado.participante.nombre,
            certificado.producto_educativo.nombre,
            certificado.archivo_path,
        )
    return {"message": "Certificados enviados a todos los participantes exitosamente"}

@router.post("/enviar/docentes/producto/{producto_id}")
def send_certificates_for_product_docentes(producto_id: int, db: Session = Depends(get_db)):
    db_certificados = db.query(CertificadoModel).filter(CertificadoModel.producto_educativo_id == producto_id, CertificadoModel.docente_id != None).all()
    if not db_certificados:
        raise HTTPException(status_code=404, detail="No se encontraron certificados para los docentes de este producto")

    for certificado in db_certificados:
        send_certificate_email(
            certificado.docente.email,
            certificado.docente.nombre,
            certificado.producto_educativo.nombre,
            certificado.archivo_path,
        )
    return {"message": "Certificados enviados a todos los docentes exitosamente"}