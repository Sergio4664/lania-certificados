# create_user.py
from app.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password

def create_user():
    db = SessionLocal()
    try:
        # Verificar si ya existe
        existing = db.query(User).filter(User.email == "lania_ser").first()
        if existing:
            print("❌ Usuario ya existe")
            return
            
        # Crear usuario
        user = User(
            email="lania_ser",
            full_name="Sergio LANIA",
            role="ADMIN",
            password_hash=hash_password("12345678"),
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"✅ Usuario creado exitosamente!")
        print(f"   Email: {user.email}")
        print(f"   ID: {user.id}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_user()