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
    course_type_str: str, # Se añade el nuevo parámetro
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

    # --- CAMBIO AQUÍ ---
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