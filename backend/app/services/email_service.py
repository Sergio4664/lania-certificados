import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import logging

# Se importa la configuración de una manera centralizada
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

def _send_message_via_smtp(msg: MIMEMultipart, recipient_email: str, subject: str):
    """Función helper para manejar la conexión y el envío SMTP."""
    
    # 1. Validación de configuración
    if not all([settings.SMTP_SERVER, settings.SMTP_PORT, settings.SMTP_LOGIN, settings.SMTP_PASSWORD, settings.SMTP_SENDER_EMAIL]):
        logger.error("Faltan variables de entorno SMTP. No se puede enviar el correo.")
        raise ValueError("Configuración de SMTP incompleta.")

    try:
        # Conexión segura con el servidor SMTP
        server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
        server.starttls()  # Activar la seguridad
        server.login(settings.SMTP_LOGIN, settings.SMTP_PASSWORD)
        
        # 2. Envío del mensaje
        server.send_message(msg)
        server.quit()
        logger.info(f"Correo '{subject}' enviado exitosamente a {recipient_email}.")
    except Exception as e:
        logger.error(f"Error al enviar correo vía SMTP a {recipient_email}: {e}")
        # Relanzamos la excepción para que el servicio que llama sepa que algo falló.
        raise e

# ----------------------------------------------------------------------------------
# FUNCIONES PRINCIPALES
# ----------------------------------------------------------------------------------

def send_certificate_email(
    recipient_email: str,
    recipient_name: str,
    course_name: str,
    pdf_content: bytes,
    serial: str
):
    """
    Envía un correo electrónico con el certificado adjunto.
    """
    msg = MIMEMultipart()
    msg['From'] = f"{settings.SMTP_SENDER_NAME} <{settings.SMTP_SENDER_EMAIL}>"
    msg['To'] = recipient_email
    msg['Subject'] = f"Tu constancia para: {course_name}"

    html_body = f"""
    <html>
        <body>
            <h1>¡Felicidades, {recipient_name}!</h1>
            <p>Has completado exitosamente el producto educativo: "<b>{course_name}</b>".</p>
            <p>Adjunto encontrarás tu constancia oficial en formato PDF.</p>
            <p>Puedes verificar la autenticidad de tu constancia en cualquier momento en nuestro portal.</p>
            <br>
            <p>Saludos cordiales,<br>El equipo de {settings.SMTP_SENDER_NAME}</p>
        </body>
    </html>
    """
    msg.attach(MIMEText(html_body, 'html'))

    part = MIMEBase('application', 'octet-stream')
    part.set_payload(pdf_content)
    encoders.encode_base64(part)
    part.add_header('Content-Disposition', f'attachment; filename="constancia-{serial}.pdf"')
    msg.attach(part)

    _send_message_via_smtp(msg, recipient_email, msg['Subject'])
    
    
def send_password_reset_email(
    email: str, 
    token: str, 
    user_name: str,
    # AÑADIDO: Recibe el tiempo de expiración en minutos
    token_expire_minutes: int 
):
    """
    Envía un correo electrónico con un enlace de restablecimiento de contraseña.
    Esta función es llamada por la ruta 'forgot-password' y por el administrador.
    """
    # Determinar la URL base del frontend
    FRONTEND_URL = settings.FRONTEND_URL 
    reset_url = f"{FRONTEND_URL}/auth/reset-password?token={token}"

    subject = "Restablecimiento de Contraseña - Sistema LANIA"
    
    # Crear el contenido del correo
    html_body = f"""
    <html>
        <body>
            <p>Hola {user_name},</p>
            <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
            <p><a href="{reset_url}" style="display: inline-block; padding: 10px 20px; margin: 10px 0; background-color: #3f51b5; color: white; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a></p>
            
            <p>Si has recibido este correo por un administrador (opción 🔑), o si no solicitaste este cambio, puedes ignorar este correo electrónico.</p>
            
            <p>Este enlace expirará en {token_expire_minutes} minutos.</p> <!-- CORREGIDO: Usa el argumento pasado -->
            <p>Saludos cordiales,<br>El equipo de {settings.SMTP_SENDER_NAME}</p>
        </body>
    </html>
    """

    msg = MIMEMultipart()
    msg['From'] = f"{settings.SMTP_SENDER_NAME} <{settings.SMTP_SENDER_EMAIL}>"
    msg['To'] = email
    msg['Subject'] = subject
    msg.attach(MIMEText(html_body, 'html'))

    _send_message_via_smtp(msg, email, subject)