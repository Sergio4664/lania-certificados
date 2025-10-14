from sqlalchemy import Column, String, DateTime
from app.database import Base

class TokenRestablecimientoPassword(Base):
    __tablename__ = 'tokens_restablecimiento_password'

    email = Column(String(255), primary_key=True, index=True)
    token = Column(String(255), nullable=False)
    fecha_expiracion = Column(DateTime(timezone=True), nullable=False)