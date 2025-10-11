from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Importamos la función para obtener la configuración
from app.core.config import get_settings

# Obtenemos la instancia de la configuración que lee el .env
settings = get_settings()

# Usamos la variable DATABASE_URL directamente desde la configuración
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# Creamos el motor (engine) de la base de datos
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Creamos una clase para las sesiones de la base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Creamos una clase Base de la que heredarán nuestros modelos de SQLAlchemy
Base = declarative_base()

def get_db():
    """
    Función de dependencia para obtener una sesión de base de datos en los endpoints.
    Asegura que la sesión se cierre siempre después de cada petición.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()