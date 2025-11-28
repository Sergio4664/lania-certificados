#Ruta: backend/app/main.py
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles 
import os # Importar OS para manejar rutas de forma segura
import sys # Importar sys para depuración

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

# --- Configuración de CORS ---
origins = [
    "http://localhost",
    "http://localhost:4200",
    "http://127.0.0.0:4200",
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
# SERVIR FRONTEND ANGULAR
# -------------------------------
from fastapi.responses import FileResponse
import os

# Obtener ruta absoluta del frontend
BASE_DIR = "/home/lania-siscol/lania-certificaciones"
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend/lania-ui/dist/lania-ui")

# Montar archivos estáticos generados por Angular
StaticFiles(
    directory="/home/lania-siscol/lania-certificaciones/frontend/lania-ui/dist",
    html=True
)


# Ruta principal para Angular (manejo de rutas SPA)
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    index_path = os.path.join(FRONTEND_DIST, "index.html")
    return FileResponse(index_path)