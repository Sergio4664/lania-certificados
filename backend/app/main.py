# Ruta: backend/app/main.py
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

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

# --- Configuración de CORS (sin cambios) ---
origins = [
    "http://localhost",
    "http://localhost:4200",
    "http://127.0.0.1:4200",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")

# --- ✅ REGISTRO DE RUTAS UNIFICADO Y LIMPIO ---
# 1. Creamos un router principal que agrupará todas las demás rutas.
api_router = APIRouter()

# 2. Incluimos cada router específico DENTRO del router principal.
#    Nota: Estos no llevan prefijo aquí.
api_router.include_router(auth.router)
api_router.include_router(public_verify.router)
api_router.include_router(admin_administradores.router)
api_router.include_router(admin_docentes.router)
api_router.include_router(admin_participantes.router)
api_router.include_router(admin_productos_educativos.router)
api_router.include_router(admin_inscripciones.router)
api_router.include_router(admin_certificados.router)

# 3. Incluimos el router principal en la app con el prefijo global /api/v1.
#    Esto aplica el prefijo a todas las rutas de una sola vez.
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API del Sistema de Constancias LANIA"}