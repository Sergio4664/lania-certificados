import secrets
import os

# Genera una clave secreta fuerte de 32 bytes (aprox. 43 caracteres)
# El método token_urlsafe usa caracteres seguros para URLs y entornos.
SECRET_KEY = secrets.token_urlsafe(32)

print("--- CLAVE SECRETA GENERADA (CÓPIELA ABAJO) ---")
print(SECRET_KEY)
print("-------------------------------------------------")
print("INSTRUCCIÓN: Copie la clave y péguela en el archivo .env")

# Opcional: Escribir la clave a un archivo temporal (descomente si lo necesita)
# with open("nueva_secret_key.txt", "w") as f:
#     f.write(SECRET_KEY)