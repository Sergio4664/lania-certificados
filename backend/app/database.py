# backend/app/database.py
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import get_settings

settings = get_settings()

# Crear el engine
engine = create_engine(
    settings.database_url, 
    pool_pre_ping=True,
    echo=False  # Cambiar a True solo para debug
)

# Crear el sessionmaker
SessionLocal = sessionmaker(
    bind=engine, 
    autoflush=False, 
    autocommit=False, 
    expire_on_commit=False
)

# Base declarativa
metadata = MetaData()
Base = declarative_base(metadata=metadata)

# Dependency para obtener sesión de BD
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()