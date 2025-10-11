from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

# --- IMPORTACIONES ACTUALIZADAS ---
# Se importan todos los routers nuevos y se eliminan los antiguos.
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


# --- CONFIGURACIÓN DE CORS (SIN CAMBIOS) ---
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

# Monta una ruta para servir archivos estáticos (como la plantilla del PDF) si es necesario
app.mount("/static", StaticFiles(directory="app/static"), name="static")


# --- REGISTRO DE ROUTERS ACTUALIZADO ---
# Se incluyen todos los routers nuevos con sus prefijos correctos.
app.include_router(auth.router)
app.include_router(public_verify.router)
app.include_router(admin_administradores.router)
app.include_router(admin_docentes.router)
app.include_router(admin_participantes.router)
app.include_router(admin_productos_educativos.router)
app.include_router(admin_inscripciones.router)
app.include_router(admin_certificados.router)


@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API del Sistema de Constancias LANIA"}