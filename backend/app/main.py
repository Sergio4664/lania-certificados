from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles 
import os # Importar OS para manejar rutas de forma segura
from pathlib import Path # Importante para rutas relativas robustas

# Nota: Se eliminó 'import sys' y 'from fastapi.responses import FileResponse' ya que no son necesarios aquí.

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
"http://127.0.0.1:4201",
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
# SERVIR FRONTEND ANGULAR (CATCH-ALL FINAL)
# -------------------------------

# Calcular la ruta al directorio 'dist/lania-ui' de Angular de forma relativa.
from pathlib import Path

# __file__ es backend/app/main.py → parent.parent → backend
BACKEND_ROOT = Path(__file__).resolve().parent.parent
# Proyecto raíz, padre de backend
PROJECT_ROOT = BACKEND_ROOT.parent
FRONTEND_DIST_DIR = PROJECT_ROOT / "frontend" / "lania-ui" / "dist" / "lania-ui"
if not FRONTEND_DIST_DIR.exists():
    raise RuntimeError(f"Frontend build not found in {FRONTEND_DIST_DIR}")

# Montar el directorio del frontend en la raíz (/) con html=True.
# Esto es esencial: si la ruta no coincide con /api/v1 o /static, devuelve index.html.
# Montaje del frontend
app.mount("/", StaticFiles(directory=FRONTEND_DIST_DIR, html=True), name="frontend")

# SOLO si no tuvieras html=True (no es tu caso)
from fastapi.responses import FileResponse
index_path = FRONTEND_DIST_DIR + "/index.html"

@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    return FileResponse(index_path)