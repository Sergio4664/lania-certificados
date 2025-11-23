# Ruta: backend/worker.py 
import os
from redis import Redis
from rq import Worker, Connection
from app.core.config import get_settings

# Cargar configuración y URL de Redis
settings = get_settings()
redis_conn = Redis.from_url(settings.REDIS_URL)

if __name__ == '__main__':
    # Contexto de conexión para el worker
    with Connection(redis_conn):
        print("🚀 RQ Worker iniciado. Escuchando en la cola predeterminada...")
        print(f"🔗 Conectado a Redis en: {settings.REDIS_URL}")
        
        # El Worker se conecta a la cola 'default' y empieza a tomar trabajos.
        worker = Worker(['default'], connection=redis_conn)
        worker.work()