# app/core/security.py
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt
from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()

def create_access_token(sub: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": sub, "exp": exp}, settings.secret_key, algorithm=settings.algorithm)

def verify_password(plain, hashed) -> bool:
    return pwd_context.verify(plain, hashed)

def hash_password(plain) -> str:
    return pwd_context.hash(plain)
