# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles # Importa StaticFiles

from app.routers import auth, admin_docentes, admin_courses, admin_participants, admin_certificates, public_verify # Importa tus routers

app = FastAPI()

# Configuración de CORS
origins = [
    "http://localhost",
    "http://localhost:4200", # Tu frontend Angular
    "http://127.0.0.1:4200",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Monta la carpeta 'static' para servir archivos estáticos
app.mount("/static", StaticFiles(directory="app/static"), name="static") # Añade esta línea

# Incluye tus routers
app.include_router(auth.router)
app.include_router(admin_docentes.router)
app.include_router(admin_courses.router)
app.include_router(admin_participants.router)
app.include_router(admin_certificates.router)
app.include_router(public_verify.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to LANIA API"}