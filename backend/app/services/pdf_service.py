# backend/app/services/pdf_service.py
from io import BytesIO
from PyPDF2 import PdfWriter, PdfReader
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from datetime import date
import locale
from app.services.qr_service import generate_qr_png

# --- CONFIGURACIÓN DE FUENTES Y LOCALIZACIÓN (SIN CAMBIOS) ---
try:
    pdfmetrics.registerFont(TTFont('DancingScript-Bold', 'app/fonts/DancingScript-Bold.ttf'))
except Exception as e:
    print(f"ADVERTENCIA: No se pudo cargar la fuente 'DancingScript-Bold'. Se usará Helvetica-Bold.")
    pdfmetrics.registerFont(TTFont('DancingScript-Bold', 'Helvetica-Bold'))

try:
    locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
except locale.Error:
    try:
        locale.setlocale(locale.LC_TIME, 'Spanish_Spain.1252')
    except locale.Error:
        print("ADVERTENCIA: No se pudo configurar el locale a español. Las fechas podrían aparecer en inglés.")


def _draw_multiline_text(c, text, x, y, max_width, style):
    """Función auxiliar para dibujar texto multilínea centrado."""
    p = Paragraph(text, style)
    p.wrapOn(c, max_width, 10 * cm)
    p_height = p.height
    p.drawOn(c, x - (max_width / 2), y - p_height)
    return p_height


def generate_certificate_pdf(
    participant_name: str,
    course_name: str,
    hours: int,
    issue_date: date,
    serial: str,
    qr_token: str,
    course_dates_str: str,
    docente_names_str: str,
    template_path: str = "app/static/Formato constancias.pdf"
) -> bytes:
    """
    Genera el PDF de un certificado con una estructura simplificada.
    """
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)
    center_x = letter[0] / 2
    text_width = 18 * cm

    # --- DEFINICIÓN DE ESTILOS ---
    style_normal = ParagraphStyle(name='Normal', fontName='Helvetica', fontSize=12, leading=16, alignment=TA_CENTER)
    style_bold_course = ParagraphStyle(name='BoldCourse', fontName='Helvetica-Bold', fontSize=26, leading=30, alignment=TA_CENTER)
    style_participant_name = ParagraphStyle(name='ParticipantName', fontName='DancingScript-Bold', fontSize=38, leading=42, alignment=TA_CENTER)

    # --- DIBUJO DEL CONTENIDO ---
    # 1. Títulos
    c.setFont("Helvetica", 14)
    c.setFillColorRGB(0.2, 0.2, 0.2)
    c.drawCentredString(center_x, 21.3 * cm, "Otorga la presente")
    c.setFont("Helvetica-Bold", 36)
    c.setFillColorRGB(0.8, 0.2, 0.2)
    c.drawCentredString(center_x, 20.2 * cm, "CONSTANCIA")
    
    # 2. Nombre del participante
    c.setFont("Helvetica", 14)
    c.setFillColorRGB(0, 0, 0)
    c.drawCentredString(center_x, 18.8 * cm, "a:")
    y_position = 18.2 * cm
    participant_height = _draw_multiline_text(c, participant_name, center_x, y_position, text_width, style_participant_name)
    y_position -= (participant_height + 1.2 * cm)

    # 3. Razón del certificado
    reason_text = f"Por haber concluido satisfactoriamente el producto educativo:"
    height1 = _draw_multiline_text(c, reason_text, center_x, y_position, text_width, style_normal)
    y_position -= (height1 + 0.2 * cm)

    # 4. Nombre del curso
    height2 = _draw_multiline_text(c, f'"{course_name}"', center_x, y_position, text_width, style_bold_course)
    y_position -= (height2 + 0.2 * cm)

    # 5. Detalles (duración, fechas, docentes)
    details_text = f"Con una duración de {hours} horas, llevado a cabo {course_dates_str}. Impartido por: {docente_names_str}."
    _draw_multiline_text(c, details_text, center_x, y_position, text_width, style_normal)

    # --- PIE DE PÁGINA Y FIRMA ---
    y_firma = 6.0 * cm
    c.setFont("Helvetica", 11)
    c.drawCentredString(center_x, y_firma, "Dr. Juan Manuel Gutiérrez Méndez")
    c.line(center_x - 3.5 * cm, y_firma - 0.2 * cm, center_x + 3.5 * cm, y_firma - 0.2 * cm)
    c.drawCentredString(center_x, y_firma - 0.7 * cm, "Director de Proyectos")
    
    # Fecha de emisión con formato en español
    issue_date_str = f"Se expide en la ciudad de Xalapa, Ver., a los {issue_date.day} días del mes de {issue_date.strftime('%B')} de {issue_date.year}"
    c.setFont("Helvetica", 9)
    c.drawCentredString(center_x, 4.0 * cm, issue_date_str)

    # QR y Folio
    qr_png_bytes = generate_qr_png(f"https://tu-sitio-web.com/verificar/{qr_token}") # Reemplaza con tu URL real
    qr_image = ImageReader(BytesIO(qr_png_bytes))
    c.drawImage(qr_image, 1.5 * cm, 1.5 * cm, width=50, height=50, mask='auto')
    c.setFont("Helvetica", 7)
    c.drawString(1.5 * cm, 1.0 * cm, f"Folio: {serial}")

    c.save()
    packet.seek(0)
    
    # --- COMBINACIÓN CON LA PLANTILLA ---
    new_pdf = PdfReader(packet)
    with open(template_path, "rb") as f:
        existing_pdf = PdfReader(f)
        output = PdfWriter()
        page = existing_pdf.pages[0]
        page.merge_page(new_pdf.pages[0])
        output.add_page(page)
        with BytesIO() as final_buffer:
            output.write(final_buffer)
            return final_buffer.getvalue()