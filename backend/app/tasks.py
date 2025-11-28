# Ruta: backend/app/tasks.py 

import sys
import os
from typing import List

# Importaciones necesarias para Celery:
from app.database import SessionLocal 
from app.services.certificate_service import CertificateService
from app.celery_app import celery_app # ⬅️ Importamos la instancia de Celery

# Ajuste para importaciones absolutas al ejecutar el worker directamente
# Esto asegura que 'from app.celery_app import...' funcione.
# Nota: La implementación original de RQ tenía este sys.path.append, Celery también lo necesita.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 💡 APLICACIÓN DEL DECORADOR DE CELERY
@celery_app.task(name="emitir_y_enviar_certificados_masivamente")
def emitir_y_enviar_certificados_masivamente_job(producto_id: int):
    """
    Función de tarea asíncrona que emite y envía masivamente certificados.
    
    Esta tarea se ejecuta en el Worker de Celery de forma asíncrona,
    liberando el servidor web de trabajo pesado.
    """
    
    # Abrir sesión de DB independiente para la tarea
    with SessionLocal() as db:
        try:
            cert_service = CertificateService(db)
            
            # 1. Ejecutar la lógica de negocio (generación de PDF, guardado, envío de correo)
            # Asegúrese de que cert_service.emitir_y_enviar_masivamente use la sesión 'db'
            result = cert_service.emitir_y_enviar_masivamente(producto_id=producto_id)
            
            # 2. El resultado debe ser serializable por JSON (Celery lo exige)
            return {"status": "completed", "result": result}
        
        except Exception as e:
            # En Celery, es bueno registrar el error y fallar explícitamente la tarea
            print(f"ERROR en tarea Celery para producto {producto_id}: {e}")
            raise self.retry(exc=e, countdown=60, max_retries=3) # Ejemplo de reintento