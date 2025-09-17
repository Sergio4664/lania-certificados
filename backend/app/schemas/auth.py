# backend/app/schemas/auth.py
from pydantic import BaseModel, EmailStr

class Token(BaseModel): 
    access_token: str
    token_type: str = "bearer"

class Login(BaseModel): 
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str