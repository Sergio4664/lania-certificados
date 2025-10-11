# backend/app/services/email_service.py
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from app.core.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

def _send_email(msg: MIMEMultipart):
    """Función auxiliar para enviar correos y manejar la conexión SMTP."""
    if not all([settings.smtp_server, settings.smtp_port, settings.smtp_login, settings.smtp_password, settings.smtp_sender_email]):
        logger.error("Faltan credenciales SMTP en la configuración. No se puede enviar el correo.")
        return False
    try:
        with smtplib.SMTP(settings.smtp_server, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_login, settings.smtp_password)
            server.send_message(msg)
            logger.info(f"Correo enviado exitosamente a {msg['To']}.")
        return True
    except Exception as e:
        logger.error(f"Error al enviar correo a {msg['To']} vía SMTP: {e}")
        return False

def send_certificate_email(
    recipient_email: str,
    recipient_name: str,
    course_name: str,
    pdf_content: bytes,
    serial: str
):
    """Envía el correo con el certificado adjunto (versión simplificada)."""
    msg = MIMEMultipart()
    msg['From'] = f"{settings.smtp_sender_name} <{settings.smtp_sender_email}>"
    msg['To'] = recipient_email
    msg['Subject'] = f"Tu constancia de: {course_name}"

    html_body = f"""
    <html>
        <body>
            <h1>¡Felicidades, {recipient_name}!</h1>
            <p>Has completado exitosamente el producto educativo: "<strong>{course_name}</strong>".</p>
            <p>Adjunto encontrarás tu constancia en formato PDF.</p>
            <br>
            <p>Saludos cordiales,<br>El equipo de LANIA</p>
        </body>
    </html>
    """
    msg.attach(MIMEText(html_body, 'html'))

    part = MIMEBase('application', 'octet-stream')
    part.set_payload(pdf_content)
    encoders.encode_base64(part)
    part.add_header('Content-Disposition', f'attachment; filename="constancia-{serial}.pdf"')
    msg.attach(part)

    if not _send_email(msg):
        raise Exception("No se pudo enviar el correo de la constancia.")


def send_password_reset_email(recipient_email: str, user_name: str, reset_link: str):
    """Envía un correo para restablecer la contraseña (sin cambios)."""
    msg = MIMEMultipart("alternative")
    msg['From'] = f"{settings.smtp_sender_name} <{settings.smtp_sender_email}>"
    msg['To'] = recipient_email
    msg['Subject'] = "Restablecimiento de Contraseña - Sistema de Constancias LANIA"

    text = f"""
    Hola {user_name},
    Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:
    {reset_link}
    Este enlace expirará en 1 hora.
    Si no solicitaste esto, por favor ignora este correo.
    """
    html = f"""
    <html>
    <body>
        <h2>Restablecimiento de Contraseña</h2>
        <p>Hola {user_name},</p>
        <p>Has solicitado restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva. Este enlace es válido por 1 hora.</p>
        <a href="{reset_link}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a>
        <p>Si no solicitaste un restablecimiento de contraseña, puedes ignorar este correo de forma segura.</p>
    </body>
    </html>
    """
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))
    
    _send_email(msg)