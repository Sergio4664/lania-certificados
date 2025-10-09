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
    pdf_content: bytes,
    serial: str
):
    """
    Envía un correo electrónico con el certificado adjunto usando SMTP.
    """
    if not all([settings.smtp_server, settings.smtp_port, settings.smtp_login, settings.smtp_password, settings.smtp_sender_email]):
        logger.error("Faltan credenciales SMTP en la configuración. No se puede enviar el correo.")
        return

    # 1. Crear el contenedor del mensaje (el correo)
    msg = MIMEMultipart()
    msg['From'] = f"{settings.smtp_sender_name} <{settings.smtp_sender_email}>"
    msg['To'] = recipient_email
    msg['Subject'] = f"Tu constancia del curso: {course_name}"

    # 2. Añadir el cuerpo del correo en formato HTML
    html_body = f"""
    <html>
        <body>
            <h1>¡Felicidades, {recipient_name}!</h1>
            <p>Has completado exitosamente el curso: <strong>{course_name}</strong>.</p>
            <p>Adjunto encontrarás tu constancia en formato PDF.</p>
            <br>
            <p>Saludos cordiales,<br>El equipo de LANIA</p>
        </body>
    </html>
    """
    msg.attach(MIMEText(html_body, 'html'))

    # 3. Adjuntar el archivo PDF
    part = MIMEBase('application', 'octet-stream')
    part.set_payload(pdf_content)
    encoders.encode_base64(part)
    part.add_header(
        'Content-Disposition',
        f'attachment; filename="constancia-{serial}.pdf"',
    )
    msg.attach(part)

    # 4. Enviar el correo a través del servidor SMTP
    try:
        # --- INICIO DE LA CORRECCIÓN ---
        # Se establece la conexión y luego se asegura con starttls() de forma separada.
        # Esto es más compatible y suele resolver los errores de certificado SSL.
        server = smtplib.SMTP(settings.smtp_server, settings.smtp_port)
        server.starttls()  # Asegura la conexión
        server.login(settings.smtp_login, settings.smtp_password)
        server.send_message(msg)
        server.quit()      # Cierra la conexión
        # --- FIN DE LA CORRECCIÓN ---
        logger.info(f"Correo de constancia enviado a {recipient_email} vía SMTP.")
    except Exception as e:
        logger.error(f"Error al enviar correo a {recipient_email} vía SMTP: {e}")
        raise