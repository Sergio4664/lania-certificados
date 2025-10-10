# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

from app.routers import auth, admin_users, admin_docentes, admin_courses, public_verify
from backend.app.routers import admin_certificados, admin_participantes

app = FastAPI()

# Configuración de CORS
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

# Incluye tus routers
app.include_router(auth.router)
app.include_router(admin_docentes.router)
app.include_router(admin_courses.router)
app.include_router(admin_participantes.router)
app.include_router(admin_certificados.router)
app.include_router(public_verify.router)
# MODIFICACIÓN: Simplifica esta línea para que sea igual a las demás
app.include_router(admin_users.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to LANIA API"}