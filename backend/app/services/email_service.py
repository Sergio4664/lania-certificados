import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from app.core.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

def send_certificate_email(
    recipient_email: str,
    recipient_name: str,
    course_name: str,
    course_type_str: str,
    pdf_content: bytes,
    serial: str
):
    if not all([settings.smtp_server, settings.smtp_port, settings.smtp_login, settings.smtp_password, settings.smtp_sender_email]):
        logger.error("Faltan credenciales SMTP en la configuración. No se puede enviar el correo.")
        return

    msg = MIMEMultipart()
    msg['From'] = f"{settings.smtp_sender_name} <{settings.smtp_sender_email}>"
    msg['To'] = recipient_email
    msg['Subject'] = f"Tu constancia de la {course_type_str}: {course_name}"

    html_body = f"""
    <html>
        <body>
            <h1>¡Felicidades, {recipient_name}!</h1>
            <p>Has completado exitosamente la <strong>{course_type_str}</strong>: "{course_name}".</p>
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

    try:
        server = smtplib.SMTP(settings.smtp_server, settings.smtp_port)
        server.starttls()
        server.login(settings.smtp_login, settings.smtp_password)
        server.send_message(msg)
        server.quit()
        logger.info(f"Correo de constancia enviado a {recipient_email} vía SMTP.")
    except Exception as e:
        logger.error(f"Error al enviar correo a {recipient_email} vía SMTP: {e}")
        raise

# --- NUEVA FUNCIÓN PARA RESTABLECER CONTRASEÑA ---

def send_password_reset_email(recipient_email: str, user_name: str, reset_link: str):
    """
    Envía un correo electrónico para restablecer la contraseña.
    """
    if not all([settings.smtp_server, settings.smtp_port, settings.smtp_login, settings.smtp_password, settings.smtp_sender_email]):
        logger.error("Faltan credenciales SMTP en la configuración. No se puede enviar el correo.")
        # En este caso, no relanzamos la excepción para no exponer fallos del servidor.
        return

    msg = MIMEMultipart("alternative")
    msg['From'] = f"{settings.smtp_sender_name} <{settings.smtp_sender_email}>"
    msg['To'] = recipient_email
    msg['Subject'] = "Restablecimiento de Contraseña - Sistema de Constancias LANIA"

    # Cuerpo del correo en texto plano y HTML
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
        <p>Gracias,<br>El equipo de LANIA</p>
    </body>
    </html>
    """

    part1 = MIMEText(text, "plain")
    part2 = MIMEText(html, "html")
    msg.attach(part1)
    msg.attach(part2)

    try:
        server = smtplib.SMTP(settings.smtp_server, settings.smtp_port)
        server.starttls()
        server.login(settings.smtp_login, settings.smtp_password)
        server.send_message(msg)
        server.quit()
        logger.info(f"Correo de restablecimiento de contraseña enviado a {recipient_email} vía SMTP.")
    except Exception as e:
        logger.error(f"Error al enviar correo de restablecimiento a {recipient_email} vía SMTP: {e}")
        # No relanzamos el error para no dar pistas a un posible atacante.
        # El error ya quedó registrado en los logs del servidor.