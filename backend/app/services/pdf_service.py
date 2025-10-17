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
from typing import Optional, List

# --- REGISTRO DE FUENTES (SIN CAMBIOS) ---
try:
    pdfmetrics.registerFont(TTFont('DancingScript-Bold', 'app/fonts/DancingScript-Bold.ttf'))
except Exception:
    pdfmetrics.registerFont(TTFont('DancingScript-Bold', 'Helvetica-Bold'))

try:
    locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
except locale.Error:
    locale.setlocale(locale.LC_TIME, 'Spanish_Spain.1252')

def draw_multiline_text(c, text, x, y, max_width, style):
    p = Paragraph(text, style)
    p.wrapOn(c, max_width, 10 * cm)
    p_height = p.height
    p.drawOn(c, x - (max_width / 2), y - p_height)
    return p_height

# ✅ CORRECCIÓN PRINCIPAL: SE ELIMINAN PARÁMETROS INNECESARIOS COMO 'kind' y 'course_modality'
def generate_certificate_pdf(
    participant_name: str,
    course_name: str,
    hours: int,
    issue_date: date,
    template_path: str,
    serial: str,
    qr_token: str, # Este es el token para el QR, no el campo de la BD
    course_date: str,
    competencies: Optional[List[str]] = None
) -> bytes:
    """
    Genera un PDF de certificado superponiendo texto y QR en una plantilla.
    """
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)
    center_x = letter[0] / 2

    # --- Estilos ---
    style_normal = ParagraphStyle(name='Normal', fontName='Helvetica', fontSize=12, leading=20, alignment=TA_CENTER)
    style_bold = ParagraphStyle(name='Bold', fontName='Helvetica-Bold', fontSize=26, leading=30, alignment=TA_CENTER)
    style_participant_name = ParagraphStyle(name='Participant', fontName='DancingScript-Bold', fontSize=38, leading=42, alignment=TA_CENTER)

    # --- Elementos estáticos ---
    c.setFont("Helvetica", 14)
    c.setFillColorRGB(0.2, 0.2, 0.2)
    c.drawCentredString(center_x, 21.3 * cm, "Otorga la presente")
    c.setFont("Helvetica-Bold", 36)
    c.setFillColorRGB(0.8, 0.2, 0.2)
    c.drawCentredString(center_x, 20.2 * cm, "CONSTANCIA")
    c.setFont("Helvetica", 14)
    c.setFillColorRGB(0, 0, 0)
    c.drawCentredString(center_x, 18.8 * cm, "a:")

    # --- Nombre del participante ---
    y_position = 18.2 * cm
    participant_height = draw_multiline_text(c, participant_name, center_x, y_position, 18 * cm, style_participant_name)
    y_position -= (participant_height + 1.2 * cm)

    # --- Cuerpo del texto dinámico ---
    text_width = 18 * cm
    if competencies:
        text = f'Por haber acreditado en el curso <b>"{course_name}"</b> ({hours} horas), la evaluación de las siguientes competencias:'
        height = draw_multiline_text(c, text, center_x, y_position, text_width, style_normal)
        y_position -= (height + 0.5 * cm)
        style_competency = ParagraphStyle(name='Competency', fontName='Helvetica', fontSize=10, leading=14, leftIndent=20)
        for comp in competencies:
            p = Paragraph(f"• {comp}", style_competency)
            p.wrapOn(c, text_width - 1*cm, 10 * cm)
            p_height = p.height
            p.drawOn(c, 2.5 * cm, y_position - p_height)
            y_position -= (p_height + 0.1 * cm)
    else:
        text = f'Por su valiosa participación en el producto educativo:'
        height1 = draw_multiline_text(c, text, center_x, y_position, text_width, style_normal)
        y_position -= (height1 + 0.2 * cm)
        height2 = draw_multiline_text(c, f'"{course_name}"', center_x, y_position, text_width, style_bold)
        y_position -= (height2 + 0.2 * cm)
        details_text = f"con una duración de {hours} horas, impartido el {course_date}."
        draw_multiline_text(c, details_text, center_x, y_position, text_width, style_normal)

    # --- Firma, fecha y QR ---
    c.setFont("Helvetica", 11)
    c.drawCentredString(center_x, 6.0 * cm, "Dr. Juan Manuel Gutiérrez Méndez")
    c.line(center_x - 3.5 * cm, 5.8 * cm, center_x + 3.5 * cm, 5.8 * cm)
    c.drawCentredString(center_x, 5.3 * cm, "Director de Proyectos")

    issue_date_str = f"Se expide en la ciudad de Xalapa, Ver., a los {issue_date.day} días de {issue_date.strftime('%B')} de {issue_date.year}"
    c.setFont("Helvetica", 9)
    c.drawCentredString(center_x, 4.0 * cm, issue_date_str)
    
    # Se genera el QR con la URL de verificación
    qr_png_bytes = generate_qr_png(f"http://localhost:4200/verificar/{qr_token}")
    qr_image = ImageReader(BytesIO(qr_png_bytes))
    c.drawImage(qr_image, 1.5 * cm, 1.5 * cm, width=50, height=50, mask='auto')
    c.setFont("Helvetica", 7)
    c.drawString(1.5 * cm, 1.0 * cm, f"Folio: {serial}")

    c.save()
    packet.seek(0)

    # --- Combinar con la plantilla ---
    new_pdf = PdfReader(packet)
    with open(template_path, "rb") as f:
        existing_pdf = PdfReader(f)
        output = PdfWriter()
        page = existing_pdf.pages[0]
        page.merge_page(new_pdf.pages[0])
        output.add_page(page)
        with BytesIO() as final_buffer:
            output.write(final_buffer)
            pdf_bytes = final_buffer.getvalue()
    
    return pdf_bytes