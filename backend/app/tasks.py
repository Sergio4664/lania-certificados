# Ruta: backend/app/tasks.py 

from app.db.session import SessionLocal
from app.services.certificate_service import CertificateService
from typing import List

def emitir_y_enviar_certificados_masivamente_job(producto_id: int):
    """
    Función de trabajo pesado (Job) que emite y envía masivamente certificados.
    Ejecutada por el RQ Worker.
    """
    # La tarea debe abrir su propia sesión de base de datos (independiente de la API)
    with SessionLocal() as db:
        cert_service = CertificateService(db)
        # Llama a la lógica de emisión que ya tiene
        result = cert_service.emitir_y_enviar_masivamente(producto_id=producto_id)
        return result