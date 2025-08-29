# app/routers/public_verify.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import SessionLocal, get_db
from app.models.certificate import Certificate
from app.models.enums import CertificateStatus

router = APIRouter(prefix="/v", tags=["public"])

def get_db():
    db = SessionLocal()
    try: 
        yield db
    finally: 
        db.close()

@router.get("/t/{token}")
def verify(token: str, db: Session = Depends(get_db)):
    cert = db.query(Certificate).filter(Certificate.qr_token == token).first()
    if not cert: 
        raise HTTPException(404, "No encontrado")
    return {
        "serial": cert.serial, 
        "status": cert.status, 
        "issued_at": cert.issued_at, 
        "kind": cert.kind
    }

@router.get("/serial/{serial}/pdf")
def download_pdf(serial: str, db: Session = Depends(get_db)):
    cert = db.query(Certificate).filter(Certificate.serial == serial).first()
    if not cert or cert.status != CertificateStatus.LISTO_PARA_DESCARGAR:
        raise HTTPException(403, "No disponible")
    return FileResponse(cert.pdf_path, media_type="application/pdf", filename=f"{serial}.pdf")