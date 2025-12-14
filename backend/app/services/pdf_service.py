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
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.colors import HexColor
from datetime import date
import locale
from typing import Optional, List


from app.services.qr_service import generate_qr_png
from app.models.producto_educativo import TipoProductoEnum
from app.core.config import settings as app_settings


# ---------------------------------------
# Registrar fuentes
# ---------------------------------------
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


# ---------------------------------------
# Función auxiliar para dibujar párrafos
# ---------------------------------------
def draw_multiline_text(c, text, x, y, max_width, style):
    p = Paragraph(text, style)
    p.wrapOn(c, max_width, 10 * cm)
    p_height = p.height

    if style.alignment == TA_LEFT:
        p.drawOn(c, x, y - p_height)
    else:
        p.drawOn(c, x - (max_width / 2), y - p_height)

    return p_height


# ---------------------------------------
# Función para calcular líneas de texto
# ---------------------------------------
def calculate_text_lines(text: str, font_name: str, font_size: int, max_width: float) -> int:
    """
    Calcula cuántas líneas ocupa un texto dado el ancho máximo.
    """
    words = text.split()
    if not words:
        return 0
    
    lines = 0
    current_line = ""
    
    for word in words:
        test_line = f"{current_line} {word}".strip()
        width = stringWidth(test_line, font_name, font_size)
        
        if width <= max_width:
            current_line = test_line
        else:
            lines += 1
            current_line = word
    
    if current_line:
        lines += 1
    
    return lines


# ---------------------------------------
# Función para calcular tamaño óptimo
# ---------------------------------------
def calculate_optimal_font_size(
    competencies: List[str],
    max_width: float,
    available_height: float,
    max_font_size: int = 14,
    min_font_size: int = 8,
    line_spacing: float = 1.3
) -> int:
    """
    Calcula el tamaño de fuente óptimo para que todas las competencias
    quepan en el espacio disponible.
    """
    for font_size in range(max_font_size, min_font_size - 1, -1):
        total_height = 0
        line_height = font_size * line_spacing
        
        for comp in competencies:
            num_lines = calculate_text_lines(comp, 'Helvetica', font_size, max_width)
            # Altura de la competencia + espacio extra entre competencias
            total_height += (num_lines * line_height) + (line_height * 0.5)
        
        # Si cabe con este tamaño, lo usamos
        if total_height <= available_height:
            return font_size
    
    # Si no cabe ni con el tamaño mínimo, devolvemos el mínimo
    return min_font_size


# ---------------------------------------
# Función para dibujar competencias con bullets
# ---------------------------------------
def draw_competencies(
    c: canvas.Canvas,
    competencies: List[str],
    x: float,
    y_start: float,
    max_width: float,
    font_name: str,
    font_size: int,
    line_spacing: float = 1.3
) -> float:
    """
    Dibuja las competencias con bullets y retorna la posición Y final.
    """
    y = y_start
    line_height = font_size * line_spacing
    c.setFont(font_name, font_size)
    
    for comp in competencies:
        words = comp.split()
        if not words:
            continue
        
        current_line = ""
        is_first_line = True
        
        for word in words:
            test_line = f"{current_line} {word}".strip()
            width = stringWidth(test_line, font_name, font_size)
            
            if width <= max_width:
                current_line = test_line
            else:
                # Dibujar la línea actual
                if current_line:
                    bullet = "• " if is_first_line else "  "
                    c.drawString(x, y, f"{bullet}{current_line}")
                    y -= line_height
                    is_first_line = False
                current_line = word
        
        # Dibujar la última línea de la competencia
        if current_line:
            bullet = "• " if is_first_line else "  "
            c.drawString(x, y, f"{bullet}{current_line}")
            y -= line_height
        
        # Espacio extra entre competencias
        y -= line_height * 0.5
    
    return y


# -------------------------------------------------------------------
# ✔ CONSTANCIA INYECCIÓN EDUCATIVA (participantes) - CORREGIDA
# -------------------------------------------------------------------
def generate_inyeccion_participante_pdf(
    participant_name: str,
    course_name: str,
    hours: int,
    issue_date: date,
    serial: str,
    modalidad: str,
    template_path: Optional[str] = None
) -> bytes:
    """
    Genera constancia específica para INYECCIÓN EDUCATIVA (participantes).
    Estilo: CONSTANCIA tamaño estándar, sin color rojo, nombre en cursiva grande (ajustada).
    """
    
    if template_path is None:
        template_path = "app/static/Formato constancias.pdf"
    
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)
    
    page_width, page_height = letter
    center_x = page_width / 2
    text_width = 18 * cm
    
    # ----------- Estilo para el nombre (Reducido de 48 a 38, usando ParagraphStyle) -------------------
    style_participant_name = ParagraphStyle(
        name='ParticipantInyeccion',
        fontName='DancingScript-Bold',
        fontSize=38, # Tamaño 38pt (más seguro que 48pt)
        leading=42,
        alignment=TA_CENTER
    )
    
    # ----------- ENCABEZADO "Otorga la presente" -------------------
    c.setFont("Helvetica", 14)
    c.setFillColorRGB(0, 0, 0)  # Negro
    c.drawCentredString(center_x, 21.3 * cm, "Otorga la presente")
    
    # ----------- CONSTANCIA (TAMAÑO Y POSICIÓN AJUSTADOS) -------------------
    c.setFont("Helvetica-Bold", 36)  # Reducido de 52 a 36 (para mantener consistencia visual con otros)
    c.setFillColorRGB(0, 0, 0)  # NEGRO, NO ROJO
    c.drawCentredString(center_x, 20.2 * cm, "CONSTANCIA") # Posición ajustada
    
    # ----------- "a:" -------------------
    c.setFont("Helvetica", 14)
    c.drawCentredString(center_x, 18.8 * cm, "a:") # Posición ajustada
    
    # ----------- NOMBRE (USANDO draw_multiline_text) -------------------
    y_position = 18.2 * cm # Posición de inicio para el nombre
    
    # draw_multiline_text es más seguro y maneja nombres largos
    participant_height = draw_multiline_text(
        c, participant_name, center_x, y_position, text_width, style_participant_name
    )
    
    # Calculamos la posición de inicio para el siguiente bloque de texto
    y_text = y_position - (participant_height + 0.5 * cm) # Espacio después del nombre
    
    # ----------- TEXTO "Por su participación..." -------------------
    c.setFont("Helvetica", 14)
    text1 = "Por su participación en la Inyección Educativa"
    c.drawCentredString(center_x, y_text, text1)
    
    # ----------- NOMBRE DEL CURSO (entre comillas, bold) -------------------
    y_text -= 0.8 * cm
    c.setFont("Helvetica-Bold", 16)
    course_text = f'"{course_name}",'
    c.drawCentredString(center_x, y_text, course_text)
    
    # ----------- DURACIÓN Y MODALIDAD -------------------
    y_text -= 0.8 * cm
    c.setFont("Helvetica", 14)
    duration_text = f"con duración de {hours} horas, modalidad {modalidad.lower()}."
    c.drawCentredString(center_x, y_text, duration_text)
    
    # ----------- FIRMA -------------------
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(center_x, 6.5 * cm, "Dr. Juan Manuel Gutiérrez Méndez")
    
    # Línea de firma
    c.line(center_x - 4 * cm, 6.3 * cm, center_x + 4 * cm, 6.3 * cm)
    
    c.setFont("Helvetica", 11)
    c.drawCentredString(center_x, 5.8 * cm, "Director de Proyectos")
    
    # ----------- FECHA -------------------
    issue_str = (
        f"Se expide en la ciudad de Xalapa, Ver., a los {issue_date.day} días "
        f"de {issue_date.strftime('%B')} de {issue_date.year}"
    )
    c.setFont("Helvetica", 10)
    c.drawCentredString(center_x, 4.2 * cm, issue_str)
    
    # ----------- QR CODE (abajo izquierda) -------------------
    qr_url = f"{app_settings.BASE_URL}/verificacion/{serial}"
    qr_png_bytes = generate_qr_png(qr_url)
    qr_image = ImageReader(BytesIO(qr_png_bytes))
    
    c.drawImage(qr_image, 1.5 * cm, 1.2 * cm, width=50, height=50, mask="auto")
    
    c.setFont("Helvetica", 7)
    c.drawString(1.5 * cm, 0.8 * cm, f"Folio: {serial}")
    
    # ----------- GUARDAR -------------------
    c.save()
    packet.seek(0)
    
    # ----------- COMBINAR CON PLANTILLA -------------------
    new_pdf = PdfReader(packet)
    
    with open(template_path, "rb") as tpl:
        existing_pdf = PdfReader(tpl)
        output = PdfWriter()
        page = existing_pdf.pages[0]
        page.merge_page(new_pdf.pages[0])
        output.add_page(page)
        
        with BytesIO() as buffer:
            output.write(buffer)
            return buffer.getvalue()


# -------------------------------------------------------------------
# ✔ CONSTANCIA CURSO/PÍLDORA (participantes)
# -------------------------------------------------------------------
def generate_curso_participante_pdf(
    participant_name: str,
    course_name: str,
    hours: int,
    issue_date: date,
    serial: str,
    tipo_producto: TipoProductoEnum,
    modalidad: str,
    template_path: Optional[str] = None
) -> bytes:
    """
    Genera constancia para CURSO EDUCATIVO y PÍLDORA EDUCATIVA (participantes).
    """
    
    if template_path is None:
        template_path = "app/static/Formato constancias.pdf"
    
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)
    
    page_width, page_height = letter
    center_x = page_width / 2
    
    # ----------- Estilos -------------------
    style_normal = ParagraphStyle(
        name='Normal',
        fontName='Helvetica',
        fontSize=12,
        leading=20,
        alignment=TA_CENTER
    )
    style_bold = ParagraphStyle(
        name='Bold',
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=30,
        alignment=TA_CENTER
    )
    style_participant_name = ParagraphStyle(
        name='Participant',
        fontName='DancingScript-Bold',
        fontSize=38,
        leading=42,
        alignment=TA_CENTER
    )
    
    # ----------- ENCABEZADO -------------------
    c.setFont("Helvetica", 14)
    c.drawCentredString(center_x, 21.3 * cm, "Otorga la presente")
    
    c.setFont("Helvetica-Bold", 36)
    c.setFillColorRGB(0.8, 0.2, 0.2)  # ROJO para cursos/píldoras
    c.drawCentredString(center_x, 20.2 * cm, "CONSTANCIA")
    
    c.setFont("Helvetica", 14)
    c.setFillColorRGB(0, 0, 0)
    c.drawCentredString(center_x, 18.8 * cm, "a:")
    
    # ----------- NOMBRE -------------------
    y_position = 18.2 * cm
    participant_height = draw_multiline_text(
        c, participant_name, center_x, y_position, 18 * cm, style_participant_name
    )
    y_position -= (participant_height + 1.2 * cm)
    
    text_width = 18 * cm
    
    # ----------- TEXTO SEGÚN TIPO -------------------
    TIPO_PRODUCTO_MAP = {
        TipoProductoEnum.CURSO_EDUCATIVO: "Por su participación en el curso",
        TipoProductoEnum.PILDORA_EDUCATIVA: "Por su asistencia a la píldora educativa",
    }
    
    line1 = TIPO_PRODUCTO_MAP.get(
        tipo_producto,
        "Por su participación en el producto educativo"
    )
    
    height1 = draw_multiline_text(c, line1, center_x, y_position, text_width, style_normal)
    y_position -= (height1 + 0.2 * cm)
    
    height2 = draw_multiline_text(c, f'"{course_name}"', center_x, y_position, text_width, style_bold)
    y_position -= (height2 + 0.2 * cm)
    
    details = f"con duración de {hours} horas, modalidad {modalidad.lower()}."
    draw_multiline_text(c, details, center_x, y_position, text_width, style_normal)
    
    # ----------- FIRMA -------------------
    c.setFont("Helvetica", 11)
    c.drawCentredString(center_x, 6.0 * cm, "Dr. Juan Manuel Gutiérrez Méndez")
    c.line(center_x - 3.5 * cm, 5.8 * cm, center_x + 3.5 * cm, 5.8 * cm)
    c.drawCentredString(center_x, 5.3 * cm, "Director de Proyectos")
    
    # ----------- FECHA -------------------
    issue_str = (
        f"Se expide en la ciudad de Xalapa, Ver., a los {issue_date.day} días "
        f"de {issue_date.strftime('%B')} de {issue_date.year}"
    )
    c.setFont("Helvetica", 9)
    c.drawCentredString(center_x, 4.0 * cm, issue_str)
    
    # ----------- QR -------------------
    qr_url = f"{app_settings.BASE_URL}/verificacion/{serial}"
    qr_png_bytes = generate_qr_png(qr_url)
    qr_image = ImageReader(BytesIO(qr_png_bytes))
    c.drawImage(qr_image, 1.5 * cm, 1.5 * cm, width=50, height=50, mask="auto")
    
    c.setFont("Helvetica", 7)
    c.drawString(1.5 * cm, 1.0 * cm, f"Folio: {serial}")
    
    c.save()
    packet.seek(0)
    
    # ----------- COMBINAR CON PLANTILLA -------------------
    new_pdf = PdfReader(packet)
    
    with open(template_path, "rb") as tpl:
        existing_pdf = PdfReader(tpl)
        output = PdfWriter()
        page = existing_pdf.pages[0]
        page.merge_page(new_pdf.pages[0])
        output.add_page(page)
        
        with BytesIO() as buffer:
            output.write(buffer)
            return buffer.getvalue()


# -------------------------------------------------------------------
# ✔ CONSTANCIA DOCENTE (todas las modalidades)
# -------------------------------------------------------------------
def generate_docente_pdf(
    participant_name: str,
    course_name: str,
    issue_date: date,
    serial: str,
    course_date: str,
    docente_specialty: Optional[str] = None,
    template_path: Optional[str] = None
) -> bytes:
    """
    Genera constancia para DOCENTES (cualquier tipo de producto).
    """
    
    if template_path is None:
        template_path = "app/static/Formato constancias.pdf"
    
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)
    
    page_width, page_height = letter
    center_x = page_width / 2
    
    style_normal = ParagraphStyle(
        name='Normal',
        fontName='Helvetica',
        fontSize=12,
        leading=20,
        alignment=TA_CENTER
    )
    style_bold = ParagraphStyle(
        name='Bold',
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=30,
        alignment=TA_CENTER
    )
    style_participant_name = ParagraphStyle(
        name='Participant',
        fontName='DancingScript-Bold',
        fontSize=38,
        leading=42,
        alignment=TA_CENTER
    )
    
    # ----------- ENCABEZADO -------------------
    c.setFont("Helvetica", 14)
    c.drawCentredString(center_x, 21.3 * cm, "Otorga la presente")
    
    c.setFont("Helvetica-Bold", 36)
    c.setFillColorRGB(0.8, 0.2, 0.2)
    c.drawCentredString(center_x, 20.2 * cm, "CONSTANCIA")
    
    c.setFont("Helvetica", 14)
    c.setFillColorRGB(0, 0, 0)
    c.drawCentredString(center_x, 18.8 * cm, "al:")
    
    # ----------- NOMBRE -------------------
    y_position = 18.2 * cm
    display_name = f"{docente_specialty} {participant_name}" if docente_specialty else participant_name
    
    participant_height = draw_multiline_text(
        c, display_name, center_x, y_position, 18 * cm, style_participant_name
    )
    y_position -= (participant_height + 1.2 * cm)
    
    text_width = 18 * cm
    
    # ----------- TEXTO DOCENTE -------------------
    line1 = "Por su participación como ponente en el producto educativo"
    height1 = draw_multiline_text(c, line1, center_x, y_position, text_width, style_normal)
    y_position -= (height1 + 0.2 * cm)
    
    height2 = draw_multiline_text(c, f'"{course_name}"', center_x, y_position, text_width, style_bold)
    y_position -= (height2 + 0.2 * cm)
    
    details = f"impartido el {course_date}."
    draw_multiline_text(c, details, center_x, y_position, text_width, style_normal)
    
    # ----------- FIRMA -------------------
    c.setFont("Helvetica", 11)
    c.drawCentredString(center_x, 6.0 * cm, "Dr. Juan Manuel Gutiérrez Méndez")
    c.line(center_x - 3.5 * cm, 5.8 * cm, center_x + 3.5 * cm, 5.8 * cm)
    c.drawCentredString(center_x, 5.3 * cm, "Director de Proyectos")
    
    # ----------- FECHA -------------------
    issue_str = (
        f"Se expide en la ciudad de Xalapa, Ver., a los {issue_date.day} días "
        f"de {issue_date.strftime('%B')} de {issue_date.year}"
    )
    c.setFont("Helvetica", 9)
    c.drawCentredString(center_x, 4.0 * cm, issue_str)
    
    # ----------- QR -------------------
    qr_url = f"{app_settings.BASE_URL}/verificacion/{serial}"
    qr_png_bytes = generate_qr_png(qr_url)
    qr_image = ImageReader(BytesIO(qr_png_bytes))
    c.drawImage(qr_image, 1.5 * cm, 1.5 * cm, width=50, height=50, mask="auto")
    
    c.setFont("Helvetica", 7)
    c.drawString(1.5 * cm, 1.0 * cm, f"Folio: {serial}")
    
    c.save()
    packet.seek(0)
    
    # ----------- COMBINAR CON PLANTILLA -------------------
    new_pdf = PdfReader(packet)
    
    with open(template_path, "rb") as tpl:
        existing_pdf = PdfReader(tpl)
        output = PdfWriter()
        page = existing_pdf.pages[0]
        page.merge_page(new_pdf.pages[0])
        output.add_page(page)
        
        with BytesIO() as buffer:
            output.write(buffer)
            return buffer.getvalue()


# -------------------------------------------------------------------
# ✔ FUNCIÓN MAESTRA: Genera PDF según tipo
# -------------------------------------------------------------------
def generate_certificate_pdf(
    participant_name: str,
    course_name: str,
    hours: int,
    issue_date: date,
    serial: str,
    qr_token: str,
    course_date: str,
    entity_type: str,
    tipo_producto: TipoProductoEnum,
    modalidad: str,
    docente_specialty: Optional[str] = None,
    template_path: Optional[str] = None
) -> bytes:
    """
    Función maestra que redirige a la función específica según el tipo.
    """
    
    # DOCENTES (cualquier tipo de producto)
    if entity_type == "docente":
        return generate_docente_pdf(
            participant_name=participant_name,
            course_name=course_name,
            issue_date=issue_date,
            serial=serial,
            course_date=course_date,
            docente_specialty=docente_specialty,
            template_path=template_path
        )
    
    # INYECCIÓN EDUCATIVA (participantes)
    if tipo_producto == TipoProductoEnum.INYECCION_EDUCATIVA:
        return generate_inyeccion_participante_pdf(
            participant_name=participant_name,
            course_name=course_name,
            hours=hours,
            issue_date=issue_date,
            serial=serial,
            modalidad=modalidad,
            template_path=template_path
        )
    
    # CURSO o PÍLDORA (participantes)
    return generate_curso_participante_pdf(
        participant_name=participant_name,
        course_name=course_name,
        hours=hours,
        issue_date=issue_date,
        serial=serial,
        tipo_producto=tipo_producto,
        modalidad=modalidad,
        template_path=template_path
    )


# -------------------------------------------------------------------
# ✔ RECONOCIMIENTO (competencias con auto-ajuste)
# -------------------------------------------------------------------
def generate_recognition_pdf(
    participant_name: str,
    course_name: str,
    hours: int,
    issue_date: date,
    serial: str,
    qr_token: str,
    competencies: List[str],
    template_path: Optional[str] = None
) -> bytes:
    """
    Genera un PDF de reconocimiento con competencias que se auto-ajustan.
    """
    
    if template_path is None:
        template_path = "app/static/Formato constancias.pdf"
    
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)
    
    page_width, page_height = letter
    center_x = page_width / 2
    
    # ----------- COORDENADAS BASE -------------------
    y_name = page_height - 320
    y_course = y_name - 70
    
    x_comp = 120
    max_width_comp = 380
    y_comp_title = y_course - 50
    
    y_qr = 60
    bottom_limit = y_qr + 120
    available_height = y_comp_title - bottom_limit
    
    # ----------- CALCULAR TAMAÑO ÓPTIMO -------------------
    optimal_font_size = calculate_optimal_font_size(
        competencies=competencies,
        max_width=max_width_comp,
        available_height=available_height,
        max_font_size=14,
        min_font_size=8,
        line_spacing=1.3
    )
    
    # ----------- NOMBRE -------------------
    c.setFont("Helvetica-Bold", 48)
    c.drawCentredString(center_x, y_name, participant_name)
    
    # ----------- CURSO -------------------
    c.setFont("Helvetica", 18)
    course_text = f'Por haber acreditado el curso "{course_name}" ({hours} horas)'
    c.drawCentredString(center_x, y_course, course_text)
    
    # ----------- TÍTULO COMPETENCIAS -------------------
    c.setFont("Helvetica-Bold", 16)
    c.drawString(x_comp, y_comp_title, "Competencias acreditadas:")
    
    # ----------- COMPETENCIAS -------------------
    y_start_comp = y_comp_title - (optimal_font_size * 1.3 * 1.5)
    
    draw_competencies(
        c=c,
        competencies=competencies,
        x=x_comp,
        y_start=y_start_comp,
        max_width=max_width_comp,
        font_name='Helvetica',
        font_size=optimal_font_size,
        line_spacing=1.3
    )
    
    # ----------- QR -------------------
    qr_url = f"{app_settings.BASE_URL}/verificacion/{serial}"
    qr_png_bytes = generate_qr_png(qr_url)
    qr_image = ImageReader(BytesIO(qr_png_bytes))
    c.drawImage(qr_image, 100, y_qr, width=100, height=100, mask="auto")
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(100, y_qr - 20, f"Folio: {serial}")
    
    # ----------- FECHA -------------------
    issue_str = (
        f"Se expide en la ciudad de Xalapa, Ver., a los {issue_date.day} días "
        f"de {issue_date.strftime('%B')} de {issue_date.year}"
    )
    c.setFont("Helvetica", 12)
    c.drawRightString(page_width - 100, y_qr + 115, issue_str)
    
    c.showPage()
    c.save()
    packet.seek(0)
    
    # ----------- COMBINAR -------------------
    overlay_pdf = PdfReader(packet)
    
    with open(template_path, "rb") as tpl:
        template_pdf = PdfReader(tpl)
        output = PdfWriter()
        page = template_pdf.pages[0]
        page.merge_page(overlay_pdf.pages[0])
        output.add_page(page)
        
        with BytesIO() as buffer:
            output.write(buffer)
            return buffer.getvalue()