from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app import models
from app.schemas.administrador import AdministradorOut, AdministradorCreate, AdministradorUpdate
from app.database import get_db
from app.core.security import get_password_hash
from app.routers.dependencies import get_current_admin_user

router = APIRouter(
    prefix="/api/admin/administradores",
    tags=["Admin - Administradores"],
    dependencies=[Depends(get_current_admin_user)]
)

@router.post("/", response_model=AdministradorOut, status_code=status.HTTP_201_CREATED)
def create_administrador(admin: AdministradorCreate, db: Session = Depends(get_db)):
    db_admin = db.query(models.Administrador).filter(models.Administrador.email_institucional == admin.email_institucional).first()
    if db_admin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El email institucional ya está registrado")
    
    hashed_password = get_password_hash(admin.password)
    db_admin = models.Administrador(
        nombre_completo=admin.nombre_completo,
        email_institucional=admin.email_institucional,
        password_hash=hashed_password,
        telefono=admin.telefono,
        whatsapp=admin.whatsapp
    )
    db.add(db_admin)
    db.commit()
    db.refresh(db_admin)
    return db_admin

@router.get("/", response_model=List[AdministradorOut])
def read_administradores(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    admins = db.query(models.Administrador).order_by(models.Administrador.id).offset(skip).limit(limit).all()
    return admins

@router.get("/{admin_id}", response_model=AdministradorOut)
def read_administrador(admin_id: int, db: Session = Depends(get_db)):
    db_admin = db.query(models.Administrador).filter(models.Administrador.id == admin_id).first()
    if db_admin is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Administrador no encontrado")
    return db_admin

@router.put("/{admin_id}", response_model=AdministradorOut)
def update_administrador(admin_id: int, admin: AdministradorUpdate, db: Session = Depends(get_db)):
    db_admin = db.query(models.Administrador).filter(models.Administrador.id == admin_id).first()
    if db_admin is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Administrador no encontrado")
    
    update_data = admin.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(db_admin, key, value)
        
    db.commit()
    db.refresh(db_admin)
    return db_admin

@router.delete("/{admin_id}", status_code=status.HTTP_200_OK)
def delete_administrador(admin_id: int, db: Session = Depends(get_db)):
    db_admin = db.query(models.Administrador).filter(models.Administrador.id == admin_id).first()
    if db_admin is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Administrador no encontrado")
    db.delete(db_admin)
    db.commit()
    return {"detail": "Administrador eliminado exitosamente"}