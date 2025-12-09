# Ruta: backend/create_user.py

import argparse # Importar la librería para manejar argumentos
from app.database import SessionLocal
from app.models.administradores import Administrador
from app.core.security import get_password_hash

def create_user(admin_email: str, admin_password: str, admin_nombre: str = "Administrador"):
    """
    Crea un usuario administrador inicial en la base de datos a partir de argumentos de línea de comandos.
    """
    db = SessionLocal()
    try:
        # 1. Verificar si el administrador ya existe
        # USAMOS EL NOMBRE DE COLUMNA CORRECTO: email_institucional
        existing_admin = db.query(Administrador).filter(Administrador.email_institucional == admin_email).first()
        if existing_admin:
            print(f"❌ El usuario con el correo '{admin_email}' ya existe.")
            return
            
        # 2. Crear el nuevo administrador usando los argumentos
        # USAMOS LOS NOMBRES DE COLUMNA CORRECTOS: email_institucional, nombre_completo, password_hash
        nuevo_administrador = Administrador(
            email_institucional=admin_email,
            nombre_completo=admin_nombre,
            password_hash=get_password_hash(admin_password) 
        )
        
        db.add(nuevo_administrador)
        db.commit()
        db.refresh(nuevo_administrador)
        
        print("✅ ¡Usuario administrador creado exitosamente!")
        print(f"   Email: {nuevo_administrador.email_institucional}")
        print(f"   ID: {nuevo_administrador.id}")
        
    except Exception as e:
        # Este error ahora atrapará la falla de conexión si ocurre
        print(f"❌ Ocurrió un error al crear el usuario: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Crea un usuario administrador en la base de datos.")
    parser.add_argument("--email", required=True, help="Correo electrónico del nuevo administrador.")
    parser.add_argument("--password", required=True, help="Contraseña del nuevo administrador.")
    parser.add_argument("--nombre", default="Administrador", help="Nombre completo del nuevo administrador.")
    
    args = parser.parse_args()
    
    # Llamamos a la función con los argumentos de línea de comandos
    create_user(args.email, args.password, args.nombre)