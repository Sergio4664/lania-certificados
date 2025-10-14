# create_user.py
from app.database import SessionLocal
from app.models.administradores import Administrador
from app.core.security import get_password_hash

def create_user():
    """
    Crea un usuario administrador inicial en la base de datos si no existe.
    """
    db = SessionLocal()
    try:
        admin_email = "sergio@lania.edu.mx"
        admin_nombre = "Sergio Cervantes"
        admin_password = "12345678"

        existing_admin = db.query(Administrador).filter(Administrador.email_institucional == admin_email).first()
        if existing_admin:
            print(f"❌ El usuario con el correo '{admin_email}' ya existe.")
            return
            
        # CORRECCIÓN: Se usa 'password_hash' para que coincida con el modelo en administradores.py
        nuevo_administrador = Administrador(
            email_institucional=admin_email,
            nombre_completo=admin_nombre,
            password_hash=get_password_hash(admin_password) 
        )
        
        db.add(nuevo_administrador)
        db.commit()
        db.refresh(nuevo_administrador)
        
        print("✅ ¡Usuario administrador creado exitosamente!")
        print(f"   Email: {nuevo_administrador.email_institucional}")
        print(f"   ID: {nuevo_administrador.id}")
        
    except Exception as e:
        print(f"❌ Ocurrió un error al crear el usuario: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_user()