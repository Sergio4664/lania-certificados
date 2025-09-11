# backend/app/services/pdf_service.py
from io import BytesIO
from PyPDF2 import PdfWriter, PdfReader
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter # Importamos solo letter para orientación vertical
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from datetime import date
import locale
from app.services.qr_service import generate_qr_png

# Configura el locale para tener los meses en español
try:
    locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
except locale.Error:
    locale.setlocale(locale.LC_TIME, 'Spanish_Spain.1252') # Fallback for Windows

def generate_certificate_pdf(participant_name: str, course_name: str, hours: int, issue_date: date, template_path: str, kind: str, serial: str, qr_token: str, course_modality: str, course_date: str) -> bytes:
    """
    Genera un PDF de certificado superponiendo texto y QR en una plantilla existente (vertical).
    """
    packet = BytesIO()
    # Usamos tamaño carta en orientación vertical (portrait)
    c = canvas.Canvas(packet, pagesize=letter)
    
    # --- Coordenadas y Estilos ---
    center_x = letter[0] / 2

    # "Otorga la presente"
    c.setFont("Helvetica", 14)
    c.setFillColorRGB(0.2, 0.2, 0.2)
    c.drawCentredString(center_x, 21.3 * cm, "Otorga la presente")

    # "CONSTANCIA"
    c.setFont("Helvetica-Bold", 36)
    c.setFillColorRGB(0.8, 0.2, 0.2)
    c.drawCentredString(center_x, 20.3 * cm, "CONSTANCIA")

    # --- LÓGICA MEJORADA PARA "a:" o "al:" ---
    c.setFont("Helvetica", 14)
    c.setFillColorRGB(0, 0, 0)
    # Si el 'kind' termina en "_PONENTE", se asume que es para un ponente.
    label = "al:" if kind.endswith("_PONENTE") else "a:"
    c.drawCentredString(center_x, 18.5 * cm, label)

    # Nombre del Participante/Ponente
    c.setFont("Helvetica-Bold", 26)
    c.drawCentredString(center_x, 17.5 * cm, participant_name)

    # --- LÓGICA MEJORADA PARA LA RAZÓN DE LA CONSTANCIA ---
    y_reason_line1 = 15.5 * cm
    c.setFont("Helvetica", 12)
    
    reason_text = {
        "PILDORA_PARTICIPANTE": "Por su asistencia a la píldora educativa",
        "PILDORA_PONENTE": "Por su participación como ponente en la conferencia",
        "INYECCION_PARTICIPANTE": "Por su participación en la Inyección Educativa",
        "INYECCION_PONENTE": "Por su participación como ponente en la Inyección Educativa",
        "CURSO_PARTICIPANTE": "Por su asistencia al curso",
        "CURSO_PONENTE": "Por haber aprobado el curso"
    }
    # Se obtiene el texto del diccionario, con un valor por defecto si no se encuentra.
    line1 = reason_text.get(kind, "Por su participación en el evento")
    c.drawCentredString(center_x, y_reason_line1, line1)

    # Nombre del curso
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(center_x, y_reason_line1 - 0.7 * cm, f'"{course_name}"')
    
    # Detalles del curso (duración o fecha de impartición)
    c.setFont("Helvetica", 11)
    if not kind.endswith("_PONENTE"):
        c.drawCentredString(center_x, y_reason_line1 - 1.4 * cm, f"con duración de {hours} horas, modalidad {course_modality.lower()}")
    else:
        c.drawCentredString(center_x, y_reason_line1 - 1.4 * cm, f"impartida el {course_date}")

    # Firma
    c.setFont("Helvetica", 11)
    c.drawCentredString(center_x, 6.0 * cm, "Dr. Juan Manuel Gutiérrez Méndez")
    c.line(center_x - 3.5 * cm, 5.8 * cm, center_x + 3.5 * cm, 5.8 * cm)
    c.drawCentredString(center_x, 5.3 * cm, "Director de Proyectos")

    # Fecha de expedición
    issue_date_str = f"Se expide en la ciudad de Xalapa, Ver., a los {issue_date.day} días de {issue_date.strftime('%B')} de {issue_date.year}"
    c.setFont("Helvetica", 9)
    c.drawCentredString(center_x, 4.0 * cm, issue_date_str)

    # Folio y QR en la esquina inferior izquierda
    qr_png_bytes = generate_qr_png(f"http://127.0.0.1:8000/v/t/{qr_token}")
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