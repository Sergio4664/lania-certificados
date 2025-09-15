# backend/app/services/pdf_service.py
from io import BytesIO
from PyPDF2 import PdfWriter, PdfReader
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.enums import TA_CENTER
from datetime import date
import locale
from app.services.qr_service import generate_qr_png
from typing import Optional, List

# Configura el locale para tener los meses en español
try:
    locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
except locale.Error:
    locale.setlocale(locale.LC_TIME, 'Spanish_Spain.1252') # Fallback for Windows

def draw_multiline_text(c, text, x, y, max_width, style):
    p = Paragraph(text, style)
    p.wrapOn(c, max_width, 10 * cm)
    p.drawOn(c, x - (max_width / 2), y - p.height)
    return p.height

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
    course_date: str,
    competencies: Optional[List[str]] = None
) -> bytes:
    """
    Genera un PDF de certificado superponiendo texto y QR en una plantilla existente (vertical).
    """
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)
    
    center_x = letter[0] / 2
    styles = getSampleStyleSheet()

    # Estilos
    style_normal = styles['Normal']
    style_normal.fontName = 'Helvetica'
    style_normal.fontSize = 12
    style_normal.leading = 16
    style_normal.alignment = TA_CENTER

    style_bold = styles['Normal']
    style_bold.fontName = 'Helvetica-Bold'
    style_bold.fontSize = 18
    style_bold.leading = 22
    style_bold.alignment = TA_CENTER

    c.setFont("Helvetica", 14)
    c.setFillColorRGB(0.2, 0.2, 0.2)
    c.drawCentredString(center_x, 21.3 * cm, "Otorga la presente")

    c.setFont("Helvetica-Bold", 36)
    c.setFillColorRGB(0.8, 0.2, 0.2)
    c.drawCentredString(center_x, 20.3 * cm, "CONSTANCIA")

    c.setFont("Helvetica", 14)
    c.setFillColorRGB(0, 0, 0)
    label = "al:" if "PONENTE" in kind else "a:"
    c.drawCentredString(center_x, 18.5 * cm, label)

    c.setFont("Helvetica-Bold", 26)
    c.drawCentredString(center_x, 17.5 * cm, participant_name)

    # --- Lógica para el cuerpo del texto ---
    y_position = 15.8 * cm
    text_width = 18 * cm

    if "COMPETENCIAS" in kind and competencies:
        # Versión con Competencias
        text = f'Por haber acreditado en el curso <b>"{course_name}"</b> ({hours} horas de trabajo), la evaluación de las competencias:'
        height = draw_multiline_text(c, text, center_x, y_position, text_width, style_normal)
        y_position -= height + 0.5 * cm
        
        style_competency = styles['Normal']
        style_competency.fontName = 'Helvetica'
        style_competency.fontSize = 10
        style_competency.leading = 14
        style_competency.leftIndent = 20
        
        for comp in competencies:
            p = Paragraph(f"• {comp}", style_competency)
            p.wrapOn(c, text_width - 1*cm, 10 * cm)
            p.drawOn(c, 2.5 * cm, y_position - p.height)
            y_position -= p.height + 0.1 * cm
    else:
        # Versión Normal
        reason_text = {
            "PILDORA_PARTICIPANTE": "Por su asistencia a la píldora educativa",
            "PILDORA_PONENTE": "Por su participación como ponente en la conferencia",
            "INYECCION_PARTICIPANTE": "Por su participación en la Inyección Educativa",
            "INYECCION_PONENTE": "Por su participación como ponente en la Inyección Educativa",
            "CURSO_PARTICIPANTE": "Por su asistencia al curso",
            "CURSO_PONENTE": "Por haber aprobado el curso"
        }
        line1 = reason_text.get(kind, "Por su participación en el evento")
        draw_multiline_text(c, line1, center_x, y_position, text_width, style_normal)
        y_position -= 0.7 * cm
        draw_multiline_text(c, f'"{course_name}"', center_x, y_position, text_width, style_bold)
        y_position -= 0.7 * cm
        
        if not "PONENTE" in kind:
            details_text = f"con duración de {hours} horas, modalidad {course_modality.lower()}"
        else:
            details_text = f"impartida el {course_date}"
        draw_multiline_text(c, details_text, center_x, y_position, text_width, style_normal)

    # Firma y fecha (ajustadas si es necesario)
    y_firma = 6.0 * cm
    c.setFont("Helvetica", 11)
    c.drawCentredString(center_x, y_firma, "Dr. Juan Manuel Gutiérrez Méndez")
    c.line(center_x - 3.5 * cm, y_firma - 0.2 * cm, center_x + 3.5 * cm, y_firma - 0.2 * cm)
    c.drawCentredString(center_x, y_firma - 0.7 * cm, "Director de Proyectos")

    issue_date_str = f"Se expide en la ciudad de Xalapa, Ver., a los {issue_date.day} días de {issue_date.strftime('%B')} de {issue_date.year}"
    c.setFont("Helvetica", 9)
    c.drawCentredString(center_x, 4.0 * cm, issue_date_str)

    # Folio y QR
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