# backend/app/routers/admin_users.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User as UserModel
from app.schemas.auth import UserCreate
from app.core.security import get_password_hash, get_current_active_user

router = APIRouter()

@router.get("/api/admin/users", response_model=list[dict])
def read_users(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_active_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    users = db.query(UserModel).all()
    return [{"id": user.id, "email": user.email, "full_name": user.full_name, "is_active": user.is_active} for user in users]

@router.post("/api/admin/users", response_model=dict)
def create_user(user: UserCreate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_active_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    db_user = db.query(UserModel).filter(UserModel.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    db_user = UserModel(email=user.email, full_name=user.full_name, hashed_password=hashed_password, role="ADMIN")
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"id": db_user.id, "email": db_user.email, "full_name": db_user.full_name, "is_active": db_user.is_active}

@router.delete("/api/admin/users/{user_id}", response_model=dict)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_active_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}