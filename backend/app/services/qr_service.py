import qrcode
from io import BytesIO
from app.core.config import settings # ✅ Importar settings para BASE_URL
from typing import Optional

# 🎯 CORRECCIÓN: La ruta real del frontend es /verificacion/
VERIFICATION_PATH = "/verificacion/" 

# Mantenemos la función original generate_qr_png(data: str) para compatibilidad con pdf_service.py
def generate_qr_png(data: str) -> bytes:
    img = qrcode.make(data)
    buf = BytesIO(); img.save(buf, format="PNG")
    return buf.getvalue()

# Esta función ya no se usa directamente en pdf_service.py, pero la corregimos por si acaso.
def generate_qr_png_with_serial(serial: str, size: int = 250) -> Optional[bytes]:
    """
    Genera un código QR que enlaza al sistema de verificación de certificados.
    """
    try:
        base_url = settings.BASE_URL.rstrip('/') # Elimina cualquier barra final si existe
        
        # Construye la URL completa que el QR debe abrir
        verification_url = f"{base_url}{VERIFICATION_PATH}{serial}" 
        
        img = qrcode.make(verification_url)
        
        # Guarda la imagen en un buffer en memoria
        buf = BytesIO()
        img.save(buf, format="PNG")
        
        return buf.getvalue()

    except Exception as e:
        # En un entorno real, usar logging aquí.
        print(f"Error al generar QR para serial {serial}: {e}")
        return None