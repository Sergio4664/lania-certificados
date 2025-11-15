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
from reportlab.lib.enums import TA_CENTER, TA_LEFT 
from datetime import date
import locale
from app.services.qr_service import generate_qr_png
from typing import Optional, List
from app.models.producto_educativo import TipoProductoEnum

# 🚀 NUEVOS IMPORTS PARA SOPORTE DE WKHTMLTOPDF
import pdfkit 
from app.core.config import get_settings 
# ----------------------------------------------


# --- Registro de Fuentes y Configuración (sin cambios) ---
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
        pass


# --- CONFIGURACIÓN DE WKHTMLTOPDF (Nueva función de ayuda que lee la ruta) ---
def get_pdfkit_config():
    """Configura pdfkit con la ruta de wkhtmltopdf si está definida en config.py."""
    settings = get_settings()
    if settings.WKHTMLTOPDF_PATH:
        # Crea la configuración usando la ruta de config.py
        return pdfkit.configuration(wkhtmltopdf=settings.WKHTMLTOPDF_PATH)
    # Si no está definida, pdfkit buscará en el PATH del sistema
    return None
# -------------------------------------------------------------------


def draw_multiline_text(c, text, x, y, max_width, style):
    p = Paragraph(text, style)
    p.wrapOn(c, max_width, 10 * cm)
    p_height = p.height
    
    if style.alignment == TA_LEFT:
        p.drawOn(c, x, y - p_height)
    else:
        p.drawOn(c, x - (max_width / 2), y - p_height)
        
    return p_height


# --- ✅ NUEVA FUNCIÓN: CALCULAR TAMAÑO DE FUENTE DINÁMICO ---
def calculate_dynamic_font_size(num_items: int, available_height_cm: float) -> tuple[int, float]:
    """
    Calcula el tamaño de fuente y el espaciado óptimos según el número de items.
    
    Args:
        num_items: Número de competencias a mostrar
        available_height_cm: Altura disponible en centímetros
    
    Returns:
        tuple: (font_size, leading) - tamaño de fuente y espaciado entre líneas
    """
    # Convertir altura disponible a puntos (1 cm ≈ 28.35 puntos)
    available_height_pts = available_height_cm * 28.35
    
    # Altura estimada por item (incluyendo espaciado)
    estimated_height_per_item = available_height_pts / num_items
    
    # Definir rangos de tamaño de fuente según densidad
    if num_items <= 5:
        font_size = 10
        leading = 14
    elif num_items <= 8:
        font_size = 9
        leading = 12
    elif num_items <= 12:
        font_size = 8
        leading = 10
    elif num_items <= 16:
        font_size = 7
        leading = 9
    else:  # Más de 16 items
        font_size = 6
        leading = 8
    
    return font_size, leading


# --- ========================================================= ---
# --- FUNCIÓN 1: CONSTANCIAS (La que ya tenías)
# --- ========================================================= ---

def generate_certificate_pdf(
    participant_name: str,
    course_name: str,
    hours: int,
    issue_date: date,
    template_path: str,
    serial: str,
    qr_token: str,
    course_date: str, 
    entity_type: str, 
    tipo_producto: TipoProductoEnum,
    modalidad: str,
    docente_specialty: Optional[str] = None
) -> bytes:
    """
    Genera un PDF de CONSTANCIA (normal o docente).
    """
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)
    center_x = letter[0] / 2

    # --- Estilos (sin cambios) ---
    style_normal = ParagraphStyle(name='Normal', fontName='Helvetica', fontSize=12, leading=20, alignment=TA_CENTER)
    style_bold = ParagraphStyle(name='Bold', fontName='Helvetica-Bold', fontSize=26, leading=30, alignment=TA_CENTER)
    style_participant_name = ParagraphStyle(name='Participant', fontName='DancingScript-Bold', fontSize=38, leading=42, alignment=TA_CENTER)

    # --- Elementos Estáticos (CONSTANCIA) ---
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

    # --- Nombre (Participante o Docente) (sin cambios) ---
    y_position = 18.2 * cm
    display_name = f"{docente_specialty} {participant_name}" if docente_specialty else participant_name
    participant_height = draw_multiline_text(c, display_name, center_x, y_position, 18 * cm, style_participant_name)
    y_position -= (participant_height + 1.2 * cm)

    # --- Lógica de Texto Dinámico (CONSTANCIA) (sin cambios) ---
    text_width = 18 * cm
    if entity_type == 'participante':
        TIPO_PRODUCTO_MAP = {
            TipoProductoEnum.CURSO_EDUCATIVO: "Por su participación en el curso",
            TipoProductoEnum.PILDORA_EDUCATIVA: "Por su asistencia a la píldora educativa",
            TipoProductoEnum.INYECCION_EDUCATIVA: "Por su participación en la Inyección Educativa"
        }
        line1 = TIPO_PRODUCTO_MAP.get(
            tipo_producto, 
            "Por su participación en el producto educativo"
        )
        height1 = draw_multiline_text(c, line1, center_x, y_position, text_width, style_normal)
        y_position -= (height1 + 0.2 * cm)
        height2 = draw_multiline_text(c, f'"{course_name}"', center_x, y_position, text_width, style_bold)
        y_position -= (height2 + 0.2 * cm)
        details_text = f"con duración de {hours} horas, modalidad {modalidad.lower()}."
        draw_multiline_text(c, details_text, center_x, y_position, text_width, style_normal)

    elif entity_type == 'docente':
        line1 = "Por su participación como ponente en el producto educativo"
        height1 = draw_multiline_text(c, line1, center_x, y_position, text_width, style_normal)
        y_position -= (height1 + 0.2 * cm)
        height2 = draw_multiline_text(c, f'"{course_name}"', center_x, y_position, text_width, style_bold)
        y_position -= (height2 + 0.2 * cm)
        details_text = f"impartido el {course_date}."
        draw_multiline_text(c, details_text, center_x, y_position, text_width, style_normal)

    # --- Firma, Fecha y QR ---
    c.setFont("Helvetica", 11)
    c.drawCentredString(center_x, 6.0 * cm, "Dr. Juan Manuel Gutiérrez Méndez")
    c.line(center_x - 3.5 * cm, 5.8 * cm, center_x + 3.5 * cm, 5.8 * cm)
    c.drawCentredString(center_x, 5.3 * cm, "Director de Proyectos")

    issue_date_str = f"Se expide en la ciudad de Xalapa, Ver., a los {issue_date.day} días de {issue_date.strftime('%B')} de {issue_date.year}"
    c.setFont("Helvetica", 9)
    c.drawCentredString(center_x, 4.0 * cm, issue_date_str)
    
    qr_png_bytes = generate_qr_png(f"http://localhost:4200/verificacion/{qr_token}") 
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


# --- ========================================================= ---
# --- FUNCIÓN 2: RECONOCIMIENTO CON ÁREA DINÁMICA (MODIFICADA)
# --- ========================================================= ---

def generate_recognition_pdf(
    participant_name: str,
    course_name: str,
    hours: int,
    issue_date: date,
    template_path: str,
    serial: str,
    qr_token: str,
    competencies: List[str]
) -> bytes:
    """
    Genera un PDF de RECONOCIMIENTO con área dinámica para competencias.
    Las competencias se ajustan automáticamente según su cantidad.
    """
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)
    center_x = letter[0] / 2

    # --- Estilos base ---
    style_normal = ParagraphStyle(
        name='Normal', 
        fontName='Helvetica', 
        fontSize=12, 
        leading=20, 
        alignment=TA_CENTER
    )
    style_participant_name = ParagraphStyle(
        name='Participant', 
        fontName='DancingScript-Bold', 
        fontSize=38, 
        leading=42, 
        alignment=TA_CENTER
    )

    # --- Elementos Estáticos (RECONOCIMIENTO) ---
    c.setFont("Helvetica", 14)
    c.setFillColorRGB(0.2, 0.2, 0.2)
    c.drawCentredString(center_x, 21.3 * cm, "Otorga el presente")
    c.setFont("Helvetica-Bold", 36)
    c.setFillColorRGB(0.8, 0.2, 0.2)
    c.drawCentredString(center_x, 20.2 * cm, "RECONOCIMIENTO")
    c.setFont("Helvetica", 14)
    c.setFillColorRGB(0, 0, 0)
    c.drawCentredString(center_x, 18.8 * cm, "a:")

    # --- Nombre (Participante) ---
    y_position = 18.2 * cm
    participant_height = draw_multiline_text(
        c, participant_name, center_x, y_position, 18 * cm, style_participant_name
    )
    y_position -= (participant_height + 1.2 * cm)

    # --- Texto introductorio ---
    text_width = 18 * cm
    line1 = f'Por haber acreditado en el curso "{course_name}" ({hours} horas de trabajo), la evaluación de las competencias:'
    
    height1 = draw_multiline_text(c, line1, center_x, y_position, text_width, style_normal)
    y_position -= (height1 + 0.5 * cm)
    
    # ----------------------------------------------------------------------
    # 🎯 ÁREA DINÁMICA PARA COMPETENCIAS
    # ----------------------------------------------------------------------
    
    # 1. Definir límites del cuadro de competencias
    Y_COMPETENCIES_START = y_position  # Donde comienza el cuadro
    Y_COMPETENCIES_END = 6.5 * cm      # Donde termina (antes de la firma) - MÁS ESPACIO
    
    # 2. Calcular altura disponible
    available_height_cm = (Y_COMPETENCIES_START - Y_COMPETENCIES_END) / cm
    
    # 3. Calcular tamaño de fuente dinámico según número de competencias
    num_competencies = len(competencies)
    font_size, leading = calculate_dynamic_font_size(num_competencies, available_height_cm)
    
    # 4. Crear estilo dinámico para competencias
    style_competency = ParagraphStyle(
        name='Competency', 
        fontName='Helvetica', 
        fontSize=font_size, 
        leading=leading, 
        alignment=TA_LEFT,
        leftIndent=0,
        rightIndent=0
    )
    
    # 5. Configuración del área de dibujo
    list_left_margin = 3.5 * cm 
    list_max_width = 16 * cm
    
    # 6. Espaciado proporcional según el tamaño de fuente
    item_spacing = leading * 0.5  # Espaciado proporcional
    
    # 7. Dibujar todas las competencias con el tamaño ajustado
    if competencies:
        for item in competencies:
            item_text = f"• {item}"
            
            # Medir altura del item
            p_test = Paragraph(item_text, style_competency)
            p_test.wrapOn(c, list_max_width, 10 * cm)
            item_height = p_test.height
            
            # Verificar si hay espacio suficiente
            if (y_position - item_height) < Y_COMPETENCIES_END:
                # Si no hay espacio, no dibujar más (aunque con el cálculo dinámico esto no debería pasar)
                break
            
            # Dibujar el item
            draw_multiline_text(
                c, item_text, list_left_margin, y_position, 
                list_max_width, style_competency
            )
            
            # Avanzar la posición vertical
            y_position -= (item_height + item_spacing)
    
    # ----------------------------------------------------------------------
    # 🎯 FIRMA Y PIE DE PÁGINA (POSICIÓN FIJA)
    # ----------------------------------------------------------------------
    
    Y_DOCTOR_BASE = 5.0 * cm
    
    # Nombre del Doctor
    c.setFont("Helvetica", 11)
    c.drawCentredString(center_x, Y_DOCTOR_BASE, "Dr. Juan Manuel Gutiérrez Méndez")
    c.line(center_x - 3.5 * cm, Y_DOCTOR_BASE - 0.2 * cm, center_x + 3.5 * cm, Y_DOCTOR_BASE - 0.2 * cm)
    c.drawCentredString(center_x, Y_DOCTOR_BASE - 0.7 * cm, "Director de Proyectos")

    # Fecha de Expedición
    y_date = Y_DOCTOR_BASE - 2.0 * cm 
    issue_date_str = f"Se expide en la ciudad de Xalapa, Ver., a los {issue_date.day} días de {issue_date.strftime('%B')} de {issue_date.year}"
    c.setFont("Helvetica", 9)
    c.drawCentredString(center_x, y_date, issue_date_str)
    
    # QR y Folio
    qr_png_bytes = generate_qr_png(f"http://localhost:4200/verificacion/{qr_token}")
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