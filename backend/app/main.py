from fastapi import FastAPI
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

# --- CORS Configuration (No Changes) ---
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

# --- ✅ UNIFIED ROUTER REGISTRATION ---
# All routers are now consistently included under the /api/v1 prefix.
# This prevents path duplication and redirect errors.
app.include_router(auth.router, prefix="/api/v1")
app.include_router(public_verify.router, prefix="/api/v1")
app.include_router(admin_administradores.router, prefix="/api/v1")
app.include_router(admin_docentes.router, prefix="/api/v1")
app.include_router(admin_participantes.router, prefix="/api/v1")
app.include_router(admin_productos_educativos.router, prefix="/api/v1")
app.include_router(admin_inscripciones.router, prefix="/api/v1")
app.include_router(admin_certificados.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API del Sistema de Constancias LANIA"}