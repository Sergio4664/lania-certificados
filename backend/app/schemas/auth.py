# backend/app/schemas/auth.py
from pydantic import BaseModel, EmailStr, validator

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

    @validator('email')
    def validate_email_domain(cls, v):
        """Valida que el correo electrónico pertenezca al dominio @lania.edu.mx."""
        if not v.endswith('@lania.edu.mx'):
            raise ValueError('El correo debe tener el dominio @lania.edu.mx')
        return v