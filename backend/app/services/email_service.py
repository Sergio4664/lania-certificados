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

def send_certificate_email(
    recipient_email: str,
    recipient_name: str,
    course_name: str,
    pdf_content: bytes,
    serial: str
):
    """
    Envía un correo electrónico con el certificado adjunto usando SMTP desde Brevo.
    """
    if not all([settings.SMTP_SERVER, settings.SMTP_PORT, settings.SMTP_LOGIN, settings.SMTP_PASSWORD, settings.SMTP_SENDER_EMAIL]):
        logger.error("Faltan variables de entorno SMTP. No se puede enviar el correo.")
        # En un caso real, podríamos lanzar una excepción aquí.
        raise ValueError("Configuración de SMTP incompleta.")

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

    try:
        # Conexión segura con el servidor SMTP
        server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
        server.starttls()  # Activar la seguridad
        server.login(settings.SMTP_LOGIN, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"Correo de constancia {serial} enviado exitosamente a {recipient_email}.")
    except Exception as e:
        logger.error(f"Error al enviar correo vía SMTP a {recipient_email}: {e}")
        # Relanzamos la excepción para que el servicio que llama sepa que algo falló.
        raise e