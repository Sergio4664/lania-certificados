# backend/app/celery_app.py

from celery import Celery
from app.core.config import settings
from kombu import Exchange, Queue

# Define la instancia de Celery. El broker y el backend usan REDIS_URL.
celery_app = Celery(
    "task_queue", 
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Configuración de Celery
celery_app.conf.update(
    # ZONA HORARIA
    timezone='America/Mexico_City', 
    
    # Serialización de tareas
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    
    # 💡 LISTA DE MÓDULOS: Celery buscará aquí las funciones decoradas con @celery_app.task
    imports=('app.tasks',),
    
    # AJUSTES DE CONEXIÓN A REDIS
    broker_connection_retry_on_startup=True,
    broker_transport_options={'visibility_timeout': 3600}, # Tiempo de timeout para tareas (1 hora)
    
    # Configuración básica de cola
    task_queues=(
        Queue('default', Exchange('default'), routing_key='default'),
    ),
    task_default_queue='default',
)