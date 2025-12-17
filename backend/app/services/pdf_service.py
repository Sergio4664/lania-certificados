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
from datetime import date
import locale
from typing import Optional, List

from app.services.qr_service import generate_qr_png
from app.models.producto_educativo import TipoProductoEnum
from app.core.config import settings as app_settings

# ---------------------------------------
# Registro de fuentes (CORREGIDO)
# ---------------------------------------

# ---------- Dancing Script ----------
try:
    pdfmetrics.registerFont(TTFont("DancingScript-Bold", "app/fonts/DancingScript-Bold.ttf"))
except Exception:
    pass

# ---------- Brittany Signature ----------
try:
    pdfmetrics.registerFont(TTFont("BrittanySignature", "app/fonts/BrittanySignature.ttf"))
except Exception:
    pass

# ---------- Myriad Pro Regular (AJUSTE PARA EVITAR CURSIVA) ----------
try:
    # Registramos con un nombre específico para evitar confusiones de familia
    pdfmetrics.registerFont(
        TTFont("MyriadPro-Regular", "app/fonts/MyriadPro-Regular.ttf")
    )
    # Vinculamos la familia para que las etiquetas <b> funcionen, 
    # pero el 'normal' apunta explícitamente al archivo regular.
    pdfmetrics.registerFontFamily(
        'MyriadPro-Regular', 
        normal='MyriadPro-Regular', 
        bold='Helvetica-Bold'
    )
except Exception as e:
    print(f"Error al cargar MyriadPro: {e}")

# ---------- Localización ----------
try:
    locale.setlocale(locale.LC_TIME, "es_ES.UTF-8")
except locale.Error:
    try:
        locale.setlocale(locale.LC_TIME, "Spanish_Spain.1252")
    except locale.Error:
        pass

# ---------------------------------------
# Funciones Auxiliares
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

def calculate_text_lines(text: str, font_name: str, font_size: int, max_width: float) -> int:
    words = text.split()
    if not words: return 0
    lines, current_line = 0, ""
    for word in words:
        test_line = f"{current_line} {word}".strip()
        if stringWidth(test_line, font_name, font_size) <= max_width:
            current_line = test_line
        else:
            lines += 1
            current_line = word
    return lines + 1 if current_line else lines

def calculate_optimal_font_size(competencies, max_width, available_height, max_font_size=12, min_font_size=9):
    for font_size in range(max_font_size, min_font_size - 1, -1):
        total_height = 0
        line_height = font_size * 1.4
        for comp in competencies:
            num_lines = calculate_text_lines(comp, 'MyriadPro-Regular', font_size, max_width)
            total_height += (num_lines * line_height) + (line_height * 0.5)
        if total_height <= available_height:
            return font_size
    return min_font_size

def draw_competencies(c, competencies, x, y_start, max_width, font_name, font_size, line_spacing=1.4):
    y = y_start
    line_height = font_size * line_spacing
    c.setFont(font_name, font_size)
    
    for comp in competencies:
        words = comp.split()
        current_line = ""
        is_first_line = True
        for word in words:
            test_line = f"{current_line} {word}".strip()
            if stringWidth(test_line, font_name, font_size) <= max_width:
                current_line = test_line
            else:
                bullet = "• " if is_first_line else "  "
                c.drawString(x, y, f"{bullet}{current_line}")
                y -= line_height
                is_first_line, current_line = False, word
        if current_line:
            bullet = "• " if is_first_line else "  "
            c.drawString(x, y, f"{bullet}{current_line}")
            y -= line_height
        y -= line_height * 0.4
    return y

# -------------------------------------------------------------------
# ✔ CONSTANCIA PILDORA EDUCATIVA (participantes) 
# -------------------------------------------------------------------
def generate_pildora_participante_pdf(
    participant_name: str,
    course_name: str,
    hours: int,
    issue_date: date,
    serial: str,
    modalidad: str,
    template_path: Optional[str] = None
) -> bytes:
    """
    Genera constancia específica para PILDORA EDUCATIVA (participantes).
    """
    
    if template_path is None:
        template_path = "app/static/Formato constancias.pdf"
    
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)
    
    page_width, page_height = letter
    center_x = page_width / 2
    text_width = 18 * cm
    
   # ----------- Estilo para el nombre (Fuente BrittanySignature, 38pt, multilínea) -------------------
    style_participant_name = ParagraphStyle(
        name='ParticipantInyeccion',
        fontName='BrittanySignature', # Fuente Actualizada
        fontSize=30, 
        leading=42,
        alignment=TA_CENTER
    )
    
    # ----------- ENCABEZADO "Otorga la presente" -------------------
    c.setFont("Helvetica", 27)
    c.setFillColorRGB(0, 0, 0)  # Negro
    # CORRECCIÓN: Usamos la posición estándar 21.3 cm
    c.drawCentredString(center_x, 18.5 * cm, "Otorga la presente") 
    
    # ----------- CONSTANCIA (TAMAÑO 36pt, NEGRA, CON INTERLETRADO) -------------------
    TEXT_TO_SPACE = "CONSTANCIA"
    font_name = "Helvetica"
    font_size = 22
    y_pos = 16 * cm # Posición vertical
    letter_spacing = 3 # 5 puntos de espaciado extra entre letras (Ajuste aquí)

    # 1. Calcular el ancho total de la palabra con el espaciado
    total_width = 0
    for i, char in enumerate(TEXT_TO_SPACE):
        total_width += stringWidth(char, font_name, font_size)
        if i < len(TEXT_TO_SPACE) - 1:
            total_width += letter_spacing

    # 2. Calcular la posición inicial X para centrar la palabra
    start_x = center_x - (total_width / 2)

    # 3. Dibujar la palabra letra por letra
    c.setFont(font_name, font_size)
    c.setFillColorRGB(0, 0, 0)
    x = start_x
    
    for char in TEXT_TO_SPACE:
        c.drawString(x, y_pos, char)
        x += stringWidth(char, font_name, font_size) + letter_spacing
    
    # ----------- "a:" -------------------
    # CORRECCIÓN: Subimos ligeramente a 19.4 cm
    c.setFont("Helvetica", 20)
    c.drawCentredString(center_x, 14.5 * cm, "a:")
    
    # ----------- NOMBRE (USANDO draw_multiline_text) -------------------
    # CORRECCIÓN: Posición de inicio ajustada a 18.8 cm
    y_position = 14 * cm 
    
    # draw_multiline_text es más seguro y maneja nombres largos
    participant_height = draw_multiline_text(
        c, participant_name, center_x, y_position, text_width, style_participant_name
    )
    
    # Calculamos la posición de inicio para el siguiente bloque de texto
    # CORRECCIÓN: Usamos 0.8 cm de espacio, mejor que 0.5 cm.
    y_text = y_position - (participant_height + 0.8 * cm) 

# ----------- ESTILOS TEXTO CURSO (Interlineado dinámico) -------------------
    style_normal_course = ParagraphStyle(
        name='NormalCourse',
        fontName='Helvetica',
        fontSize=20,
        leading=22, # Se mantiene para el texto normal
        alignment=TA_CENTER
    )
    style_bold_course = ParagraphStyle(
        name='BoldCourse',
        fontName='Helvetica-Bold',
        fontSize=30,
        leading=35, # <-- CORRECCIÓN CLAVE: Aumentado a 35pt (de 22pt) para un interlineado limpio y formal.
        alignment=TA_CENTER,
        leftIndent=50,  # Sangría de 50 puntos a la izquierda
        rightIndent=50  # Sangría de 50 puntos a la derecha
    )
    
    # ----------- TEXTO "Por su participación..." -------------------
    line1 = "Por su asistencia a la píldora educativa"
    height1 = draw_multiline_text(c, line1, center_x, y_text, text_width, style_normal_course)
    # CORRECCIÓN CLAVE: Aumentamos el espacio aquí para una mejor separación visual.
    y_text -= (height1 + 0.3 * cm) # <-- Espacio entre Línea 1 y Curso ajustado a 0.8 cm (era 0.2 cm)
    
    # ----------- NOMBRE DEL CURSO (entre comillas, bold) -------------------
    course_text = f'"{course_name}"'
    height2 = draw_multiline_text(c, course_text, center_x, y_text, text_width, style_bold_course)
    # Se mantiene un buen espacio entre el Curso y los Detalles.
    y_text -= (height2 + 0.3 * cm) 
    
    # ----------- DURACIÓN Y MODALIDAD -------------------
    details = f"con duración de {hours} horas, modalidad {modalidad.lower()}."
    height3 = draw_multiline_text(c, details, center_x, y_text, text_width, style_normal_course)
    # Ya no se necesita actualizar y_text si es el último elemento del bloque central
    # y_text -= (height3 + 0.3 * cm)

    # ----------- FIRMA -------------------
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(center_x, 2 * cm, "Dr. Juan Manuel Gutiérrez Méndez")
    
    # Línea de firma
    c.line(center_x - 4 * cm, 1.8 * cm, center_x + 4 * cm, 1.8 * cm)
    
    c.setFont("Helvetica", 11)
    c.drawCentredString(center_x, 1.4 * cm, "Director de Proyectos")
    
    # ----------- FECHA -------------------
    issue_str = (
        f"Se expide en la ciudad de Xalapa, Ver., a los {issue_date.day} días "
        f"de {issue_date.strftime('%B')} de {issue_date.year}"
    )
    c.setFont("Helvetica", 10)
    c.drawCentredString(12 * cm, 0.8 * cm, issue_str)
    
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
# ✔ CONSTANCIA INYECCIÓN EDUCATIVA (participantes)
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
    Ajustes finos de coordenadas y espaciado para igualar el formato de 'Ejemplo inyección (2).pdf'.
    """
    
    if template_path is None:
        template_path = "app/static/Formato constancias.pdf"
    
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)
    
    page_width, page_height = letter
    center_x = page_width / 2
    text_width = 18 * cm
    
   # ----------- Estilo para el nombre (Fuente BrittanySignature, 38pt, multilínea) -------------------
    style_participant_name = ParagraphStyle(
        name='ParticipantInyeccion',
        fontName='BrittanySignature', # Fuente Actualizada
        fontSize=30, 
        leading=42,
        alignment=TA_CENTER
    )
    
    # ----------- ENCABEZADO "Otorga la presente" -------------------
    c.setFont("Helvetica", 27)
    c.setFillColorRGB(0, 0, 0)  # Negro
    # CORRECCIÓN: Usamos la posición estándar 21.3 cm
    c.drawCentredString(center_x, 18.5 * cm, "Otorga la presente") 
    
    # ----------- CONSTANCIA (TAMAÑO 36pt, NEGRA, CON INTERLETRADO) -------------------
    TEXT_TO_SPACE = "CONSTANCIA"
    font_name = "Helvetica"
    font_size = 22
    y_pos = 16 * cm # Posición vertical
    letter_spacing = 3 # 5 puntos de espaciado extra entre letras (Ajuste aquí)

    # 1. Calcular el ancho total de la palabra con el espaciado
    total_width = 0
    for i, char in enumerate(TEXT_TO_SPACE):
        total_width += stringWidth(char, font_name, font_size)
        if i < len(TEXT_TO_SPACE) - 1:
            total_width += letter_spacing

    # 2. Calcular la posición inicial X para centrar la palabra
    start_x = center_x - (total_width / 2)

    # 3. Dibujar la palabra letra por letra
    c.setFont(font_name, font_size)
    c.setFillColorRGB(0, 0, 0)
    x = start_x
    
    for char in TEXT_TO_SPACE:
        c.drawString(x, y_pos, char)
        x += stringWidth(char, font_name, font_size) + letter_spacing
    
    # ----------- "a:" -------------------
    # CORRECCIÓN: Subimos ligeramente a 19.4 cm
    c.setFont("Helvetica", 20)
    c.drawCentredString(center_x, 14.5 * cm, "a:")
    
    # ----------- NOMBRE (USANDO draw_multiline_text) -------------------
    # CORRECCIÓN: Posición de inicio ajustada a 18.8 cm
    y_position = 14 * cm 
    
    # draw_multiline_text es más seguro y maneja nombres largos
    participant_height = draw_multiline_text(
        c, participant_name, center_x, y_position, text_width, style_participant_name
    )
    
    # Calculamos la posición de inicio para el siguiente bloque de texto
    # CORRECCIÓN: Usamos 0.8 cm de espacio, mejor que 0.5 cm.
    y_text = y_position - (participant_height + 2 * cm) 

# ----------- ESTILOS TEXTO CURSO (Interlineado dinámico) -------------------
    style_normal_course = ParagraphStyle(
        name='NormalCourse',
        fontName='Helvetica',
        fontSize=16,
        leading=22, # Interlineado interno ajustado: 16pt + 6pt de espacio
        alignment=TA_CENTER
    )
    style_bold_course = ParagraphStyle(
        name='BoldCourse',
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=28, # Interlineado interno ajustado: 22pt + 6pt de espacio
        alignment=TA_CENTER
    )
    
    # ----------- TEXTO "Por su participación..." -------------------
    line1 = "Por su participación en la Inyección Educativa"
    height1 = draw_multiline_text(c, line1, center_x, y_text, text_width, style_normal_course)
    y_text -= (height1 + 0.2 * cm) # Espacio entre bloques
    
    # ----------- NOMBRE DEL CURSO (entre comillas, bold) -------------------
    course_text = f'"{course_name}",'
    height2 = draw_multiline_text(c, course_text, center_x, y_text, text_width, style_bold_course)
    y_text -= (height2 + 0.2 * cm) # Espacio entre bloques
    
    # ----------- DURACIÓN Y MODALIDAD -------------------
    details = f"con duración de {hours} horas, modalidad {modalidad.lower()}."
    height3 = draw_multiline_text(c, details, center_x, y_text, text_width, style_normal_course) 
    # Ya no se necesita actualizar y_text si es el último elemento del bloque central
    # y_text -= (height3 + 0.1 * cm)

    # ----------- FIRMA -------------------
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(center_x, 2 * cm, "Dr. Juan Manuel Gutiérrez Méndez")
    
    # Línea de firma
    c.line(center_x - 4 * cm, 1.8 * cm, center_x + 4 * cm, 1.8 * cm)
    
    c.setFont("Helvetica", 11)
    c.drawCentredString(center_x, 1.4 * cm, "Director de Proyectos")
    
    # ----------- FECHA -------------------
    issue_str = (
        f"Se expide en la ciudad de Xalapa, Ver., a los {issue_date.day} días "
        f"de {issue_date.strftime('%B')} de {issue_date.year}"
    )
    c.setFont("Helvetica", 10)
    c.drawCentredString(12 * cm, 0.8 * cm, issue_str)
    
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
# ✔ CONSTANCIA CURSO EDUCATIVO (participantes)
# -------------------------------------------------------------------
def generate_curso_participante_pdf(
    participant_name: str,
    course_name: str,
    hours: int,
    issue_date: date,
    serial: str,
    modalidad: str,
    template_path: Optional[str] = None
) -> bytes:
    """
    Genera constancia específica para CURSO EDUCATIVO (participantes).
    """
    
    if template_path is None:
        template_path = "app/static/Formato constancias.pdf"
    
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)
    
    page_width, page_height = letter
    center_x = page_width / 2
    text_width = 18 * cm
    
   # ----------- Estilo para el nombre (Fuente BrittanySignature, 38pt, multilínea) -------------------
    style_participant_name = ParagraphStyle(
        name='ParticipantInyeccion',
        fontName='BrittanySignature', # Fuente Actualizada
        fontSize=30, 
        leading=42,
        alignment=TA_CENTER
    )
    
    # ----------- ENCABEZADO "Otorga la presente" -------------------
    c.setFont("Helvetica", 27)
    c.setFillColorRGB(0, 0, 0)  # Negro
    # CORRECCIÓN: Usamos la posición estándar 21.3 cm
    c.drawCentredString(center_x, 18.5 * cm, "Otorga la presente") 
    
    # ----------- CONSTANCIA (TAMAÑO 36pt, NEGRA, CON INTERLETRADO) -------------------
    TEXT_TO_SPACE = "CONSTANCIA"
    font_name = "Helvetica"
    font_size = 22
    y_pos = 16 * cm # Posición vertical
    letter_spacing = 3 # 5 puntos de espaciado extra entre letras (Ajuste aquí)

    # 1. Calcular el ancho total de la palabra con el espaciado
    total_width = 0
    for i, char in enumerate(TEXT_TO_SPACE):
        total_width += stringWidth(char, font_name, font_size)
        if i < len(TEXT_TO_SPACE) - 1:
            total_width += letter_spacing

    # 2. Calcular la posición inicial X para centrar la palabra
    start_x = center_x - (total_width / 2)

    # 3. Dibujar la palabra letra por letra
    c.setFont(font_name, font_size)
    c.setFillColorRGB(0, 0, 0)
    x = start_x
    
    for char in TEXT_TO_SPACE:
        c.drawString(x, y_pos, char)
        x += stringWidth(char, font_name, font_size) + letter_spacing
    
    # ----------- "a:" -------------------
    # CORRECCIÓN: Subimos ligeramente a 19.4 cm
    c.setFont("Helvetica", 20)
    c.drawCentredString(center_x, 14.5 * cm, "a:")
    
    # ----------- NOMBRE (USANDO draw_multiline_text) -------------------
    # CORRECCIÓN: Posición de inicio ajustada a 18.8 cm
    y_position = 14 * cm 
    
    # draw_multiline_text es más seguro y maneja nombres largos
    participant_height = draw_multiline_text(
        c, participant_name, center_x, y_position, text_width, style_participant_name
    )
    
    # Calculamos la posición de inicio para el siguiente bloque de texto
    # CORRECCIÓN: Usamos 0.8 cm de espacio, mejor que 0.5 cm.
    y_text = y_position - (participant_height + 0.5 * cm) 

# ----------- ESTILOS TEXTO CURSO (Interlineado dinámico) -------------------
    style_normal_course = ParagraphStyle(
        name='NormalCourse',
        fontName='Helvetica',
        fontSize=16,
        leading=22, # Interlineado interno ajustado: 16pt + 6pt de espacio
        alignment=TA_CENTER
    )
    style_bold_course = ParagraphStyle(
        name='BoldCourse',
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=28, # Interlineado interno ajustado: 22pt + 6pt de espacio
        alignment=TA_CENTER
    )
    
    # ----------- TEXTO "Por su participación..." -------------------
    line1 = "Por su participación en el curso"
    height1 = draw_multiline_text(c, line1, center_x, y_text, text_width, style_normal_course)
    y_text -= (height1 + 0.2 * cm) # Espacio entre bloques
    
    # ----------- NOMBRE DEL CURSO (entre comillas, bold) -------------------
    course_text = f'"{course_name}",'
    height2 = draw_multiline_text(c, course_text, center_x, y_text, text_width, style_bold_course)
    y_text -= (height2 + 0.2 * cm) # Espacio entre bloques
    
    # ----------- DURACIÓN Y MODALIDAD -------------------
    details = f"con duración de {hours} horas, modalidad {modalidad.lower()}."
    height3 = draw_multiline_text(c, details, center_x, y_text, text_width, style_normal_course) 
    # Ya no se necesita actualizar y_text si es el último elemento del bloque central
    # y_text -= (height3 + 0.1 * cm)

    # ----------- FIRMA -------------------
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(center_x, 2 * cm, "Dr. Juan Manuel Gutiérrez Méndez")
    
    # Línea de firma
    c.line(center_x - 4 * cm, 1.8 * cm, center_x + 4 * cm, 1.8 * cm)
    
    c.setFont("Helvetica", 11)
    c.drawCentredString(center_x, 1.4 * cm, "Director de Proyectos")
    
    # ----------- FECHA -------------------
    issue_str = (
        f"Se expide en la ciudad de Xalapa, Ver., a los {issue_date.day} días "
        f"de {issue_date.strftime('%B')} de {issue_date.year}"
    )
    c.setFont("Helvetica", 10)
    c.drawCentredString(12 * cm, 0.8 * cm, issue_str)
    
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

# ---------------------------------------
# Utilidad de formato académico de fechas
# ---------------------------------------
from datetime import date # Ya está importado al inicio, pero se incluye para completar el bloque de código que proporcionaste.

def format_spanish_date_range(start_date: date, end_date: date) -> str:
    """
    Formatea fechas para constancias académicas en español formal.
    """

    # Caso 1: misma fecha (día, mes y año)
    if start_date == end_date:
        return (
            f"impartida el día {start_date.day} de "
            f"{start_date.strftime('%B')} de {start_date.year}"
        )

    # Caso 2: mismo mes y mismo año
    if start_date.month == end_date.month and start_date.year == end_date.year:
        return (
            f"impartida del {start_date.day} al {end_date.day} de "
            f"{start_date.strftime('%B')} de {start_date.year}"
        )

    # Caso 3: meses o años distintos
    return (
        f"impartida del {start_date.day} de {start_date.strftime('%B')} de {start_date.year} "
        f"al {end_date.day} de {end_date.strftime('%B')} de {end_date.year}"
    )

# -------------------------------------------------------------------
# ✔ CONSTANCIA DOCENTE (todas las modalidades)
# -------------------------------------------------------------------
def generate_docente_pdf(
    participant_name: str,
    course_name: str,
    issue_date: date,
    serial: str,
    course_start_date: date, 
    course_end_date: date,
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
    text_width = 18 * cm
    
    # ----------- Estilo para el nombre (Fuente BrittanySignature, 38pt, multilínea) -------------------
    style_participant_name = ParagraphStyle(
        name='ParticipantInyeccion',
        fontName='BrittanySignature', # Fuente Actualizada
        fontSize=30, 
        leading=42,
        alignment=TA_CENTER
    )
    
    # ----------- ENCABEZADO "Otorga la presente" -------------------
    c.setFont("Helvetica", 27)
    c.setFillColorRGB(0, 0, 0) 	# Negro
    # CORRECCIÓN: Usamos la posición estándar 21.3 cm
    c.drawCentredString(center_x, 18.5 * cm, "Otorga la presente") 
    
    # ----------- CONSTANCIA (TAMAÑO 36pt, NEGRA, CON INTERLETRADO) -------------------
    TEXT_TO_SPACE = "CONSTANCIA"
    font_name = "Helvetica"
    font_size = 22
    y_pos = 16 * cm # Posición vertical
    # FIX: Definición de letter_spacing faltante (causa del error: name 'letter_spacing' is not defined)
    letter_spacing = 3 

    # 1. Calcular el ancho total de la palabra con el espaciado
    total_width = 0
    for i, char in enumerate(TEXT_TO_SPACE):
        total_width += stringWidth(char, font_name, font_size)
        if i < len(TEXT_TO_SPACE) - 1:
            total_width += letter_spacing

    # 2. Calcular la posición inicial X para centrar la palabra
    start_x = center_x - (total_width / 2)

    # 3. Dibujar la palabra letra por letra
    c.setFont(font_name, font_size)
    c.setFillColorRGB(0, 0, 0)
    x = start_x
    
    for char in TEXT_TO_SPACE:
        c.drawString(x, y_pos, char)
        x += stringWidth(char, font_name, font_size) + letter_spacing
    
    # ----------- "al:" -------------------
    # CORRECCIÓN: Subimos ligeramente a 19.4 cm
    c.setFont("Helvetica", 20)
    c.drawCentredString(center_x, 14.5 * cm, "al:")
    
    # ----------- NOMBRE DEL DOCENTE -------------------
    y_position = 14 * cm
    # Si hay especialidad, se añade al nombre (ej: Dr. Juan Pérez)
    display_name = f"{docente_specialty} {participant_name}" if docente_specialty else participant_name
    
    participant_height = draw_multiline_text(
        c, display_name, center_x, y_position, 18 * cm, style_participant_name
    )

    # ----------- ESTILOS TEXTO CURSO (Interlineado dinámico) -------------------
    style_normal_course = ParagraphStyle(
        name="NormalCourse",
        fontName="Helvetica",        # ✔ fuente base soportada nativamente
        fontSize=16,
        leading=22,                 # interlineado académico
        alignment=TA_CENTER
    )

    style_bold_course = ParagraphStyle(
        name="BoldCourse",
        fontName="Helvetica-Bold",   # ✔ bold real, sin mapping
        fontSize=28,
        leading=28,
        alignment=TA_CENTER
    )


    # ----------- Ajuste de flujo vertical -------------------
    y_position -= (participant_height + 0.3 * cm)
    text_width = 18 * cm

    # ----------- TEXTO PRINCIPAL -------------------
    line1 = "Por su participación como ponente en la conferencia"
    height1 = draw_multiline_text(
    c, line1, center_x, y_position, text_width, style_normal_course
    )
    y_position -= (height1 + 0.2 * cm)

    # ----------- NOMBRE DEL CURSO -------------------
    course_text = f'"{course_name}"'
    height2 = draw_multiline_text(
    c, course_text, center_x, y_position, text_width, style_bold_course
    )
    y_position -= (height2 + 0.2 * cm)

    date_range_str = format_spanish_date_range(course_start_date, course_end_date)

    # ----------- DETALLES -------------------
    details = f"{date_range_str}." 
    draw_multiline_text(
    c, details, center_x, y_position, text_width, style_normal_course
    )

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
    c.drawCentredString(12 * cm, 4.0 * cm, issue_str) 
    
    # ----------- QR y FOLIO -------------------
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
    entity_type: str,
    tipo_producto: TipoProductoEnum,
    modalidad: str,
    # Argumentos de fecha actualizados:
    course_start_date: Optional[date] = None, 
    course_end_date: Optional[date] = None,
    # ---
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
            # Se pasan las fechas de inicio y fin (objects date):
            course_start_date=course_start_date,
            course_end_date=course_end_date,
            # ---
            docente_specialty=docente_specialty,
            template_path=template_path
        )
    
    # PILDORA EDUCATIVA (participantes)
    if tipo_producto == TipoProductoEnum.PILDORA_EDUCATIVA:
        return generate_pildora_participante_pdf(
            participant_name=participant_name,
            course_name=course_name,
            hours=hours,
            issue_date=issue_date,
            serial=serial,
            modalidad=modalidad,
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
    
    # CURSO EDUCATIVO (participantes)
    if tipo_producto == TipoProductoEnum.CURSO_EDUCATIVO:
        return generate_curso_participante_pdf(
            participant_name=participant_name,
            course_name=course_name,
            hours=hours,
            issue_date=issue_date,
            serial=serial,
            modalidad=modalidad,
            template_path=template_path
        )


# -------------------------------------------------------------------
# RECONOCIMIENTO (USANDO MyriadPro-Regular)
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
    if template_path is None:
        template_path = "app/static/Formato constancias.pdf"
    
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)
    page_width, page_height = letter
    center_x = page_width / 2
    
    text_width_main = 18 * cm
    max_width_comp = 15 * cm
    x_comp_left = center_x - (max_width_comp / 2)
    y_limit_signature = 6.0 * cm 

    style_participant_name = ParagraphStyle(
        name='ParticipantRecognition',
        fontName='BrittanySignature', 
        fontSize=30, leading=38, alignment=TA_CENTER
    )

    style_course_info = ParagraphStyle(
        name='CourseInfo',
        fontName='Helvetica',
        fontSize=15, leading=20, alignment=TA_CENTER,
        leftIndent=30, rightIndent=30
    )

    # 1. Títulos
    c.setFont("Helvetica", 28)
    c.drawCentredString(center_x, 19.5 * cm, "Otorga el presente reconocimiento")
    c.setFont("Helvetica", 18)
    c.drawCentredString(center_x, 18.2 * cm, "a:")
    
    # 2. Nombre
    y_current = 17.8 * cm 
    participant_height = draw_multiline_text(c, participant_name, center_x, y_current, text_width_main, style_participant_name)
    
    # 3. Info Curso (Uso de etiquetas <b> permitido por el registro de familia)
    y_current -= (participant_height + 0.8 * cm) 
    course_text_line = f"Por haber acreditado en el curso <b>\"{course_name}\"</b> ({hours} horas de trabajo), la evaluación de las competencias:"
    course_height = draw_multiline_text(c, course_text_line, center_x, y_current, text_width_main, style_course_info) 
    
    # 4. Competencias (DIBUJO CON FUENTE CORREGIDA)
    y_current -= (course_height + 0.6 * cm)
    available_height = y_current - y_limit_signature
    
    optimal_font_size = calculate_optimal_font_size(
        competencies, max_width_comp, available_height, 12, 9
    )

    draw_competencies(
        c=c,
        competencies=competencies,
        x=x_comp_left,
        y_start=y_current,
        max_width=max_width_comp,
        font_name='MyriadPro-Regular', # <--- NOMBRE EXACTO REGISTRADO
        font_size=optimal_font_size,
        line_spacing=1.4
    )
    
    # 5. Firmas y Fecha
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(center_x, 2.5 * cm, "Dr. Juan Manuel Gutiérrez Méndez")
    c.line(center_x - 3.5 * cm, 2.3 * cm, center_x + 3.5 * cm, 2.3 * cm)
    c.setFont("Helvetica", 10)
    c.drawCentredString(center_x, 1.9 * cm, "Director de Proyectos")
    
    issue_str = f"Se expide en la ciudad de Xalapa, Ver., a los {issue_date.day} días de {issue_date.strftime('%B')} de {issue_date.year}"
    c.setFont("Helvetica", 10)
    c.drawCentredString(12 * cm, 1.0 * cm, issue_str)
    
    # 6. QR y Folio
    qr_url = f"{app_settings.BASE_URL}/verificacion/{serial}"
    qr_image = ImageReader(BytesIO(generate_qr_png(qr_url)))
    c.drawImage(qr_image, 1.5 * cm, 1.5 * cm, width=50, height=50, mask="auto")
    c.setFont("Helvetica", 7)
    c.drawString(1.5 * cm, 1.1 * cm, f"Folio del certificado: {serial}")
    
    c.save()
    packet.seek(0)
    
    # Merge con PDF base
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