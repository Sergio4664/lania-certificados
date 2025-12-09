from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from starlette.responses import FileResponse
from pathlib import Path

# Configuración
from app.core.config import settings as app_settings

# Routers del sistema
from app.routers import (
    auth,
    public_verify,
    public_downloads,            # ✅ NUEVO — Para descargas públicas
    admin_administradores,
    admin_docentes,
    admin_participantes,
    admin_productos_educativos,
    admin_inscripciones,
    admin_certificados,
)


# ============================================================
# APP FastAPI
# ============================================================

app = FastAPI(title="Sistema de Constancias LANIA - API")

# ============================================================
# CORS
# ============================================================

origins = [
    app_settings.FRONTEND_URL,
    "http://127.0.0.1:4201",
    "http://siscol.lania.mx",
    "https://siscol.lania.mx",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Routers API (/api/v1)
# ============================================================

api_router = APIRouter()

# Rutas públicas
api_router.include_router(auth.router)
api_router.include_router(public_verify.router)
api_router.include_router(public_downloads.router)   # ✅ NUEVO ENDPOINT PÚBLICO

# Rutas administrativas (requieren autenticación)
api_router.include_router(admin_administradores.router)
api_router.include_router(admin_docentes.router)
api_router.include_router(admin_participantes.router)
api_router.include_router(admin_productos_educativos.router)
api_router.include_router(admin_inscripciones.router)
api_router.include_router(admin_certificados.router)

# Prefijo global
app.include_router(api_router, prefix="/api/v1")


# ============================================================
# SERVIR EL FRONTEND (Angular)
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "lania-ui" / "dist" / "lania-ui"

if not FRONTEND_DIST.exists():
    raise RuntimeError(f"Frontend build no encontrado en {FRONTEND_DIST}")

index_file = FRONTEND_DIST / "index.html"

# Archivos estáticos (CSS, JS, imágenes)
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIST)), name="static_frontend")


# ============================================================
# RUTA RAÍZ
# ============================================================

@app.get("/")
async def root():
    return FileResponse(str(index_file))


# ============================================================
# CATCH-ALL — Soporte para rutas Angular SPA
# ============================================================

@app.get("/{full_path:path}")
async def catch_all(full_path: str):

    # Evitar interceptar rutas de API
    if full_path.startswith("api/v1"):
        raise HTTPException(status_code=404, detail="API route not found")

    # Si es un archivo existente, se devuelve
    file_path = FRONTEND_DIST / full_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))

    # Devolver siempre index.html para la SPA
    return FileResponse(str(index_file))
