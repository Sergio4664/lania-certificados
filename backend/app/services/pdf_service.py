#Ruta: backend/app/services/pdf_service.py
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

# --- ⬇️ AQUÍ ESTÁ LA CORRECCIÓN ⬇️ ---
# Se importa desde 'producto_educativo', no 'enums'
from app.models.producto_educativo import TipoProductoEnum
# --- ⬆️ FIN DE LA CORRECCIÓN ⬆️ ---

# --- Registro de Fuentes y Configuración de Idioma (sin cambios) ---
try:
    pdfmetrics.registerFont(TTFont('DancingScript-Bold', 'app/fonts/DancingScript-Bold.ttf'))
except Exception:
    pdfmetrics.registerFont(TTFont('DancingScript-Bold', 'Helvetica-Bold'))

try:
    locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')
except locale.Error:
    try:
        locale.setlocale(locale.LC_TIME, 'Spanish_Spain.1252')
    except locale.Error:
        pass # Mantener locale por defecto si falla

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
    serial: str,
    qr_token: str,
    course_date: str, # (Usado para docentes)
    entity_type: str, # 'participante' o 'docente'
    
    # --- ✅ 2. Argumentos modificados y añadidos ---
    tipo_producto: TipoProductoEnum, # CAMBIADO: de product_type_str a enum
    modalidad: str,             # AÑADIDO: para incluir la modalidad
    
    docente_specialty: Optional[str] = None,
    competencies: Optional[List[str]] = None
) -> bytes:
    """
    Genera un PDF de certificado con texto dinámico para participantes o docentes.
    """
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)
    center_x = letter[0] / 2

    # --- Estilos (sin cambios) ---
    style_normal = ParagraphStyle(name='Normal', fontName='Helvetica', fontSize=12, leading=20, alignment=TA_CENTER)
    style_bold = ParagraphStyle(name='Bold', fontName='Helvetica-Bold', fontSize=26, leading=30, alignment=TA_CENTER)
    style_participant_name = ParagraphStyle(name='Participant', fontName='DancingScript-Bold', fontSize=38, leading=42, alignment=TA_CENTER)

    # --- Elementos Estáticos (sin cambios) ---
    c.setFont("Helvetica", 14)
    c.setFillColorRGB(0.2, 0.2, 0.2)
    c.drawCentredString(center_x, 21.3 * cm, "Otorga la presente")
    c.setFont("Helvetica-Bold", 36)
    c.setFillColorRGB(0.8, 0.2, 0.2)
    c.drawCentredString(center_x, 20.2 * cm, "CONSTANCIA")
    c.setFont("Helvetica", 14)
    c.setFillColorRGB(0, 0, 0)
    label = "al:" if entity_type == 'docente' else "a:"
    c.drawCentredString(center_x, 18.8 * cm, label)

    # --- Nombre (Participante o Docente con su grado) (sin cambios) ---
    y_position = 18.2 * cm
    display_name = f"{docente_specialty} {participant_name}" if docente_specialty else participant_name
    participant_height = draw_multiline_text(c, display_name, center_x, y_position, 18 * cm, style_participant_name)
    y_position -= (participant_height + 1.2 * cm)

    # --- ✅ 3. Lógica de Texto Dinámico (MODIFICADA) ---
    text_width = 18 * cm
    if entity_type == 'participante':
        
        # Mapa de texto según el tipo de producto (basado en tus ejemplos)
        TIPO_PRODUCTO_MAP = {
            tipo_producto.CURSO_EDUCATIVO: "Por su participación en el curso",
            tipo_producto.PILDORA_EDUCATIVA: "Por su asistencia a la píldora educativa",
            tipo_producto.INYECCION_EDUCATIVA: "Por su participación en la Inyección Educativa"
        }
        
        # Obtener el texto correcto
        line1 = TIPO_PRODUCTO_MAP.get(
            tipo_producto, 
            "Por su participación en el producto educativo" # Fallback genérico
        )
        
        # Dibujar la primera línea
        height1 = draw_multiline_text(c, line1, center_x, y_position, text_width, style_normal)
        y_position -= (height1 + 0.2 * cm)
        
        # Dibujar el nombre del curso/producto
        height2 = draw_multiline_text(c, f'"{course_name}"', center_x, y_position, text_width, style_bold)
        y_position -= (height2 + 0.2 * cm)

        # --- ✅ 4. Texto de Detalles (MODIFICADO para incluir modalidad) ---
        # .lower() para que se lea "modalidad remota"
        details_text = f"con duración de {hours} horas, modalidad {modalidad.lower()}."
        draw_multiline_text(c, details_text, center_x, y_position, text_width, style_normal)

    elif entity_type == 'docente':
        # Texto para el docente/instructor (sin cambios)
        line1 = "Por su participación como ponente en el producto educativo"
        height1 = draw_multiline_text(c, line1, center_x, y_position, text_width, style_normal)
        y_position -= (height1 + 0.2 * cm)

        height2 = draw_multiline_text(c, f'"{course_name}"', center_x, y_position, text_width, style_bold)
        y_position -= (height2 + 0.2 * cm)
        
        details_text = f"impartido el {course_date}."
        draw_multiline_text(c, details_text, center_x, y_position, text_width, style_normal)

    # --- Firma, Fecha y QR (sin cambios) ---
    c.setFont("Helvetica", 11)
    c.drawCentredString(center_x, 6.0 * cm, "Dr. Juan Manuel Gutiérrez Méndez")
    c.line(center_x - 3.5 * cm, 5.8 * cm, center_x + 3.5 * cm, 5.8 * cm)
    c.drawCentredString(center_x, 5.3 * cm, "Director de Proyectos")

    issue_date_str = f"Se expide en la ciudad de Xalapa, Ver., a los {issue_date.day} días de {issue_date.strftime('%B')} de {issue_date.year}"
    c.setFont("Helvetica", 9)
    c.drawCentredString(center_x, 4.0 * cm, issue_date_str)
    
    qr_png_bytes = generate_qr_png(f"http://localhost:4200/verificar/{qr_token}")
    qr_image = ImageReader(BytesIO(qr_png_bytes))
    c.drawImage(qr_image, 1.5 * cm, 1.5 * cm, width=50, height=50, mask='auto')
    c.setFont("Helvetica", 7)
    c.drawString(1.5 * cm, 1.0 * cm, f"Folio: {serial}")

    c.save()
    packet.seek(0)

    # --- Combinar con la plantilla (sin cambios) ---
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