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

try:
    pdfmetrics.registerFont(TTFont('DancingScript-Bold', 'app/fonts/DancingScript-Bold.ttf'))
except Exception as e:
    print(f"ADVERTENCIA: No se pudo cargar la fuente 'DancingScript-Bold' (Error: {e}). Se usará Helvetica-Bold como alternativa.")
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

def generate_certificate_pdf(
    participant_name: str,
    course_name: str,
    hours: int,
    issue_date: date,
    template_path: str,
    kind: str,
    serial: str,
    qr_token: str,
    course_modality: str,
    course_type_str: str, # Se usará este parámetro
    course_date: str,
    competencies: Optional[List[str]] = None,
    docente_specialty: Optional[str] = None
) -> bytes:
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)
    center_x = letter[0] / 2

    style_normal = ParagraphStyle(name='Normal_Helvetica', fontName='Helvetica', fontSize=12, leading=20, alignment=TA_CENTER)
    style_bold = ParagraphStyle(name='Bold_Helvetica', fontName='Helvetica-Bold', fontSize=26, leading=30, alignment=TA_CENTER)
    style_participant_name = ParagraphStyle(name='Participant_Cursive', fontName='DancingScript-Bold', fontSize=38, leading=42, alignment=TA_CENTER)

    c.setFont("Helvetica", 14)
    c.setFillColorRGB(0.2, 0.2, 0.2)
    c.drawCentredString(center_x, 21.3 * cm, "Otorga la presente")
    c.setFont("Helvetica-Bold", 36)
    c.setFillColorRGB(0.8, 0.2, 0.2)
    c.drawCentredString(center_x, 20.2 * cm, "CONSTANCIA")
    c.setFont("Helvetica", 14)
    c.setFillColorRGB(0, 0, 0)
    label = "al:" if "PONENTE" in kind else "a:"
    c.drawCentredString(center_x, 18.8 * cm, label)

    y_position = 18.2 * cm
    display_name = f"{docente_specialty} {participant_name}" if docente_specialty else participant_name
    participant_display_height = draw_multiline_text(c, display_name, center_x, y_position, 18 * cm, style_participant_name)
    y_position -= (participant_display_height + 1.2 * cm)
    
    text_width = 18 * cm

    if "COMPETENCIAS" in kind and competencies:
        text = f'Por haber acreditado en el curso <b>"{course_name}"</b> ({hours} horas de trabajo), la evaluación de las competencias:'
        height = draw_multiline_text(c, text, center_x, y_position, text_width, style_normal)
        y_position -= (height + 0.5 * cm)
        style_competency = ParagraphStyle(name='Competency_Style', fontName='Helvetica', fontSize=10, leading=14, leftIndent=20)
        for comp in competencies:
            p = Paragraph(f"• {comp}", style_competency)
            p.wrapOn(c, text_width - 1*cm, 10 * cm)
            p_height = p.height
            p.drawOn(c, 2.5 * cm, y_position - p_height)
            y_position -= (p_height + 0.1 * cm)
    else:
        # --- CAMBIO AQUÍ ---
        articulo = "la" if course_type_str.lower().startswith(('píldora', 'inyección')) else "el"
        
        if "PONENTE" in kind:
            reason_intro = f"Por su participación como ponente en {articulo}"
        else:
            reason_intro = f"Por su asistencia a {articulo}"

        line1 = f"{reason_intro} <b>{course_type_str}</b>"
        height1 = draw_multiline_text(c, line1, center_x, y_position, text_width, style_normal)
        y_position -= (height1 + 0.2 * cm)

        height2 = draw_multiline_text(c, f'"{course_name}"', center_x, y_position, text_width, style_bold)
        y_position -= (height2 + 0.2 * cm)

        if "PONENTE" in kind:
            details_text = f"impartida el {course_date}"
        else:
            details_text = f"con duración de {hours} horas, modalidad {course_modality.lower()}"
        
        draw_multiline_text(c, details_text, center_x, y_position, text_width, style_normal)

    y_firma = 6.0 * cm
    c.setFont("Helvetica", 11)
    c.drawCentredString(center_x, y_firma, "Dr. Juan Manuel Gutiérrez Méndez")
    c.line(center_x - 3.5 * cm, y_firma - 0.2 * cm, center_x + 3.5 * cm, y_firma - 0.2 * cm)
    c.drawCentredString(center_x, y_firma - 0.7 * cm, "Director de Proyectos")

    issue_date_str = f"Se expide en la ciudad de Xalapa, Ver., a los {issue_date.day} días de {issue_date.strftime('%B')} de {issue_date.year}"
    c.setFont("Helvetica", 9)
    c.drawCentredString(center_x, 4.0 * cm, issue_date_str)

    qr_png_bytes = generate_qr_png(f"http://127.0.0.1:4200/v/{qr_token}")
    qr_image = ImageReader(BytesIO(qr_png_bytes))
    c.drawImage(qr_image, 1.5 * cm, 1.5 * cm, width=50, height=50, mask='auto')
    c.setFont("Helvetica", 7)
    c.drawString(1.5 * cm, 1.0 * cm, f"Folio: {serial}")

    c.save()
    packet.seek(0)

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
    packet.close()

    return pdf_bytes