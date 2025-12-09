# Ruta: backend/app/tasks.py

import sys
import os
from typing import List

# Importaciones necesarias para Celery:
from app.database import SessionLocal 
from app.services.certificate_service import CertificateService
from app.celery_app import celery_app  # Instancia de Celery

# Ajuste para importaciones absolutas al ejecutar el worker directamente
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 💡 TAREA CELERY QUE ACEPTA DOS PARÁMETROS
@celery_app.task(name="emitir_y_enviar_certificados_masivamente")
def emitir_y_enviar_certificados_masivamente_job(
    producto_id: int,
    emitir_con_competencias: bool = False
):
    """
    Función de tarea asíncrona que emite y envía masivamente certificados.
    Recibe dos argumentos:
      - producto_id (int)
      - emitir_con_competencias (bool)
    """

    # Abrir sesión de DB exclusiva para el worker
    with SessionLocal() as db:
        try:
            cert_service = CertificateService(db)

            # Ejecutar lógica de negocio usando ambos argumentos
            result = cert_service.emitir_y_enviar_masivamente(
                producto_id=producto_id,
                con_competencias=emitir_con_competencias
            )

            # Celery exige que el resultado sea JSON serializable
            return {
                "status": "completed",
                "producto_id": producto_id,
                "con_competencias": emitir_con_competencias,
                "result": result
            }

        except Exception as e:
            print(f"ERROR en tarea Celery para producto {producto_id}: {e}")
            # Si quieres habilitar retries, usa:
            # raise emitir_y_enviar_certificados_masivamente_job.retry(exc=e, countdown=60, max_retries=3)
            raise
