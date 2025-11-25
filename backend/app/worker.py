# backend/app/worker.py
import os
import sys
from redis import Redis 
from rq import Worker, Queue 

# 🚨 CORRECCIÓN DE IMPORTACIÓN ABSOLUTA: 
# Agregamos el directorio 'backend' al sys.path para que Python pueda resolver 
# la ruta 'from app.core.config import settings' al ejecutar el script directamente.
# La ruta absoluta es .../lania-certificaciones/backend
worker_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.dirname(worker_dir)) 

from app.core.config import settings

# Función para la configuración de la conexión (usando la URL de settings)
def get_redis_connection():
    """Establece la conexión a Redis usando la URL configurada."""
    # settings.REDIS_URL ahora está definido y se carga correctamente
    print(f"Conectando a Redis en: {settings.REDIS_URL}")
    return Redis.from_url(settings.REDIS_URL)

if __name__ == '__main__':
    # Intenta obtener la conexión a Redis
    try:
        redis_conn = get_redis_connection()
    except Exception as e:
        # Esto falla si el servidor de Redis no está ejecutándose en redis://localhost:6379
        print(f"Error fatal al conectar a Redis. Asegúrese de que el servidor Redis esté activo: {e}", file=sys.stderr)
        sys.exit(1)

    # El worker escucha la cola 'default' (por defecto de RQ)
    listen = ['default']
    
    # Iniciar el worker directamente, pasando la conexión de redis-py.
    print(f"RQ Worker iniciado, escuchando en la cola: {listen}...")
    
    # Crea el objeto Worker y le pasa la conexión de Redis
    worker = Worker(listen, connection=redis_conn)
    
    # Iniciar el worker. Esto bloqueará el proceso.
    worker.work()