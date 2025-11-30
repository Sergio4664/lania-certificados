#Ruta: backend/app/main.py
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles 
import os # Importar OS para manejar rutas de forma segura
import sys # Importar sys para depuración
from fastapi.responses import FileResponse 
from pathlib import Path # Importante para rutas relativas robustas

from app.routers import (
    auth,
    public_verify,
    admin_administradores,
    admin_docentes,
    admin_participantes,
    admin_productos_educativos,
    admin_inscripciones,
    admin_certificados,
)

app = FastAPI(title="Sistema de Constancias LANIA - API")

# --- Configuración de CORS (Incluye 4201 y URLs de Producción) ---
origins = [
    "http://localhost",
    "http://localhost:4201",
    "http://127.0.0.0:4201",
    # Posibles dominios de producción (Si accede a su sitio con estos)
    "https://siscol.lania.mx", 
    "https://siscol.lania.mx:4201", 
    "http://siscol.lania.mx",
    "http://siscol.lania.mx:4201",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar archivos estáticos de la API (logos, plantillas, etc.)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# --- REGISTRO DE RUTAS API ---
api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(public_verify.router)
api_router.include_router(admin_administradores.router)
api_router.include_router(admin_docentes.router)
api_router.include_router(admin_participantes.router)
api_router.include_router(admin_productos_educativos.router)
api_router.include_router(admin_inscripciones.router)
api_router.include_router(admin_certificados.router)

app.include_router(api_router, prefix="/api/v1")

# -------------------------------
# SERVIR FRONTEND ANGULAR (RUTA CONFIRMADA)
# -------------------------------

# Calcular la ruta al directorio 'dist/lania-ui' de Angular de forma relativa.
# Esta es la ruta correcta que usted confirmó: ../frontend/lania-ui/dist/lania-ui
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
FRONTEND_PATH = PROJECT_ROOT / "frontend" / "lania-ui" / "dist" / "lania-ui"
FRONTEND_DIST_DIR = str(FRONTEND_PATH)

# Montar el directorio del frontend en la raíz (/) con html=True.
app.mount("/", StaticFiles(directory=FRONTEND_DIST_DIR, html=True), name="frontend")