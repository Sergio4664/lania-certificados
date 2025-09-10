# backend/app/routers/public_verify.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.certificate import Certificate
from app.models.enums import CertificateStatus
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v", tags=["public"])

@router.get("/t/{token}")
def verify(token: str, db: Session = Depends(get_db)):
    """Verificar certificado por token QR"""
    try:
        cert = db.query(Certificate).filter(Certificate.qr_token == token).first()
        if not cert: 
            raise HTTPException(404, "Certificado no encontrado")
        
        return {
            "serial": cert.serial, 
            "status": cert.status, 
            "issued_at": cert.issued_at.isoformat() if cert.issued_at else None, 
            "kind": cert.kind
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verificando certificado: {str(e)}")
        raise HTTPException(500, f"Error interno: {str(e)}")

@router.get("/serial/{serial}/pdf")
def download_pdf(serial: str, db: Session = Depends(get_db)):
    """Descargar PDF de certificado por serial"""
    try:
        cert = db.query(Certificate).filter(Certificate.serial == serial).first()
        if not cert or cert.status != CertificateStatus.LISTO_PARA_DESCARGAR:
            raise HTTPException(403, "Certificado no disponible para descarga")
        
        if not cert.pdf_path:
            raise HTTPException(404, "Archivo PDF no encontrado")
            
        # MODIFICACIÓN: content_disposition_type="inline" para previsualización
        return FileResponse(
            cert.pdf_path, 
            media_type="application/pdf", 
            filename=f"{serial}.pdf",
            content_disposition_type="inline" 
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error descargando certificado: {str(e)}")
        raise HTTPException(500, f"Error interno: {str(e)}")