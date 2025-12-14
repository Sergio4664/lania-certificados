import asyncio
import base64
import locale
from datetime import date
from html import escape as html_escape
from pathlib import Path
from typing import Optional, List
import io # Importación para manejar streams de bytes

# NUEVAS IMPORTACIONES PARA STAMPING DE PDF
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter # Para las dimensiones A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import black
from reportlab.lib.textsplit import wordSplit
from PyPDF2 import PdfReader, PdfWriter # Para combinar el PDF dinámico con la plantilla de fondo

# MANTENER ESTO PARA EL MÉTODO ANTERIOR (generate_certificate_pdf)
from concurrent.futures import ThreadPoolExecutor
from pyppeteer import launch

from app.services.qr_service import generate_qr_png
from app.models.producto_educativo import TipoProductoEnum
from app.core.config import settings as app_settings


# ------------------------------------------------------
# CONFIGURACIÓN LOCAL PARA FECHAS EN ESPAÑOL
# ------------------------------------------------------
try:
    locale.setlocale(locale.LC_TIME, "es_ES.UTF-8")
except:
    try:
        locale.setlocale(locale.LC_TIME, "Spanish_Spain.1252")
    except:
        pass


# ------------------------------------------------------
# CONFIGURACIÓN DE FUENTES PARA REPORTLAB
# ------------------------------------------------------
DEFAULT_FONT = 'Helvetica'
DEFAULT_FONT_BOLD = 'Helvetica-Bold'
try:
    # Si usas Roboto, descomenta y asegura que los archivos .ttf estén en app/fonts/
    # pdfmetrics.registerFont(TTFont('Roboto', 'app/fonts/Roboto-Regular.ttf'))
    # pdfmetrics.registerFont(TTFont('Roboto-Bold', 'app/fonts/Roboto-Bold.ttf'))
    # DEFAULT_FONT = 'Roboto'
    # DEFAULT_FONT_BOLD = 'Roboto-Bold'
    pass
except Exception:
    pass

# ------------------------------------------------------
# CSS POR DEFECTO (Se mantiene para la Constancia de Participación A)
# ------------------------------------------------------
DEFAULT_CSS = "" 

def _load_css() -> str:
    css_path = Path("app/static/styles.css")
    if css_path.exists():
        return css_path.read_text(encoding="utf-8")
    return DEFAULT_CSS


# ------------------------------------------------------
# RENDER PYPETEER → PDF (SOLUCIÓN ROBUSTA PARA UVLOOP)
# ------------------------------------------------------

async def _async_render(html_content: str) -> bytes:
    """
    La lógica asíncrona de pyppeteer.
    """
    # 🚨 RUTA DEL BINARIO DE CHROME INSTALADO POR EL ADMINISTRADOR 🚨
    CHROME_PATH = "/usr/bin/google-chrome-stable" 

    browser = await launch(
        executablePath=CHROME_PATH, 
        args=[
            "--no-sandbox",
            "--headless=new",          
            "--disable-gpu",
            "--disable-setuid-sandbox",
            "--no-zygote",             
            "--disable-dev-shm-usage",  
            "--disable-web-security",  
            "--ignore-certificate-errors", 
        ],
        handleSIGINT=False,
        handleSIGTERM=False,
        handleSIGHUP=False
    )
    page = await browser.newPage()
    await page.setContent(html_content) 
    
    pdf = await page.pdf({"format": "A4", "printBackground": True})
    await browser.close()
    return pdf

def _render_in_new_loop(html_content: str) -> bytes:
    asyncio.set_event_loop(None)
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_async_render(html_content))
    finally:
        loop.close()
        asyncio.set_event_loop(None)


def _render_pdf(html_content: str) -> bytes:
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(_render_in_loop, html_content)
        return future.result()


# ------------------------------------------------------
# Construcción de texto de fecha (se mantiene)
# ------------------------------------------------------
def _build_issue_date_text(issue_date: date) -> str:
    return (
        f"Se expide en la ciudad de Xalapa, Ver., a los {issue_date.day} días "
        f"de {issue_date.strftime('%B')} de {issue_date.year}"
    )


# ------------------------------------------------------
# QR BASE64 (se mantiene)
# ------------------------------------------------------
def _build_qr_data_uri(serial: str) -> str:
    qr_url = f"{app_settings.BASE_URL}/verificacion/{serial}"
    qr_bytes = generate_qr_png(qr_url)
    qr_b64 = base64.b64encode(qr_bytes).decode("ascii")
    return f"data:image/png;base64,{qr_b64}"


# ------------------------------------------------------
# LOGO BASE64 (se mantiene, pero no usado en generate_recognition_pdf)
# ------------------------------------------------------
def _build_logo_data_uri() -> str:
    logo_path = Path("app/static/lania_logo.png") 
    try:
        if logo_path.exists():
            logo_bytes = logo_path.read_bytes()
            logo_b64 = base64.b64encode(logo_bytes).decode("ascii")
            return f"data:image/png;base64,{logo_b64}"
    except Exception:
        pass 
    return ""


# =======================================================================
# ⭐ A) CONSTANCIA TRADICIONAL → HTML + CSS (SE MANTIENE)
# =======================================================================
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
) -> bytes:
    # ... (Cuerpo de la función generate_certificate_pdf se mantiene) ...
    css_text = _load_css()
    date_text = _build_issue_date_text(issue_date)
    qr_data_uri = _build_qr_data_uri(serial)

    if entity_type == "participante":
        messages = {
            TipoProductoEnum.CURSO_EDUCATIVO: "Por su participación en el curso",
            TipoProductoEnum.PILDORA_EDUCATIVA: "Por su asistencia a la píldora educativa",
            TipoProductoEnum.INYECCION_EDUCATIVA: "Por su participación en la Inyección Educativa",
        }
        texto = messages.get(tipo_producto, "Por su participación en el producto educativo")
        detalle = (
            f'{texto} "<strong>{html_escape(course_name)}</strong>", '
            f"con duración de {hours} horas, modalidad {modalidad.lower()}."
        )
    else:
        detalle = (
            f'Por su participación como ponente en el producto educativo '
            f'"<strong>{html_escape(course_name)}</strong>", impartido el {html_escape(course_date)}.'
        )

    nombre_mostrar = (
        f"{docente_specialty} {participant_name}"
        if docente_specialty and entity_type == "docente"
        else participant_name
    )
    
    body_html = f"""
    <div class="certificate-wrapper">

        <div class="certificate-title">CONSTANCIA</div>
        <div class="certificate-subtitle">Otorga la presente a:</div>

        <div class="participant-name">{html_escape(nombre_mostrar)}</div>

        <div class="course-text">{detalle}</div>

        <div class="issue-date">{html_escape(date_text)}</div>

        <div class="footer-row">

            <div class="qr-block">
                <img src="{qr_data_uri}">
                <div>Folio: {html_escape(serial)}</div>
            </div>

            <div class="footer-center">
                <div class="line"></div>
                <div class="name">Dr. Juan Manuel Gutiérrez Méndez</div>
                <div class="role">Director de Proyectos</div>
            </div>

        </div>
    </div>
    """

    full_html = f"""
    <html>
    <head>
      <meta charset="utf-8">
      <style>
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
      {_load_css()}
      </style>
    </head>
    <body>{body_html}</body>
    </html>
    """

    return _render_pdf(full_html)


# =======================================================================
# ⭐ B) RECONOCIMIENTO (CONSTANCIA DE COMPETENCIAS) → STAMPING PDF (CORREGIDO)
# =======================================================================
def generate_recognition_pdf(
    participant_name: str,
    course_name: str,
    hours: int,
    issue_date: date,
    serial: str,
    qr_token: str,
    competencies: List[str],
) -> bytes:
    """
    Genera el certificado de reconocimiento estampando los datos
    sobre la plantilla PDF estática usando coordenadas.
    """
    
    # 1. Definir la plantilla base
    template_path = Path("app/static/Formato constancias.pdf")
    if not template_path.exists():
        raise FileNotFoundError(f"Plantilla PDF no encontrada en: {template_path}")

    # Coordenadas y Dimensiones A4 (PostScript points: 595.27 x 841.89)
    A4_WIDTH, A4_HEIGHT = letter 
    
    # --- COORDENADAS ESTIMADAS (AJUSTAR MANUALMENTE) ---
    # Estas coordenadas se deben ajustar en función de tu plantilla Formato constancias.pdf
    
    # Textos centrales (Nombre, Curso)
    X_CENTER = A4_WIDTH / 2 
    Y_NAME = A4_HEIGHT - 320     
    Y_COURSE_TEXT = Y_NAME - 70  
    
    # Lista de Competencias (Bloque dinámico)
    X_COMPETENCIES_START = 120 
    MAX_COMPETENCIES_WIDTH = 380 
    LINE_HEIGHT = 16 
    FONT_SIZE_COMPETENCE = 14 
    Y_COMPETENCIES_TITLE = Y_COURSE_TEXT - 50 
    
    # Pie de página (QR, Folio, Firma, Fecha)
    X_QR = 100 
    Y_QR = 60  
    
    X_SIGNATURE = A4_WIDTH - 150 
    Y_SIGNATURE = Y_QR + 40 

    # Preparar el lienzo de ReportLab (capa dinámica)
    packet = io.BytesIO()
    c = canvas.Canvas(packet, pagesize=letter)
    c.setFillColor(black)
    
    # --- 1. NOMBRE DEL PARTICIPANTE (Grande y centrado) ---
    c.setFont(DEFAULT_FONT_BOLD, 48) 
    c.drawCentredString(X_CENTER, Y_NAME, participant_name)

    # --- 2. TEXTO DEL CURSO (Centrado) ---
    course_text = (
        f'Por haber acreditado en el curso "{course_name}" '
        f"({hours} horas de trabajo), la evaluación de las competencias:"
    )
    c.setFont(DEFAULT_FONT, 18)
    c.drawCentredString(X_CENTER, Y_COURSE_TEXT, course_text)

    # --- 3. LISTA DE COMPETENCIAS (Dinámico) ---
    
    # Título
    c.setFont(DEFAULT_FONT_BOLD, 16)
    c.drawString(X_COMPETENCIES_START, Y_COMPETENCIES_TITLE, "Competencias acreditadas:")
    
    # Definición de coordenadas para el texto de la competencia
    X_COMPETENCIES_TEXT = X_COMPETENCIES_START + 10 # Desplazamiento para el texto después de la viñeta
    X_COMPETENCIES_BULLET = X_COMPETENCIES_START
    
    current_y = Y_COMPETENCIES_TITLE - 1.5 * LINE_HEIGHT 
    
    c.setFont(DEFAULT_FONT, FONT_SIZE_COMPETENCE) 
    
    for comp in competencies:
        # CORRECCIÓN: Se utiliza un valor flotante (14.0) para el tamaño de fuente 
        # en wordSplit, lo que resuelve el 'KeyError: 14' que ocurría.
        lines = wordSplit(comp, DEFAULT_FONT, 14.0, MAX_COMPETENCIES_WIDTH)
        
        for i, line in enumerate(lines):
            if i == 0:
                # Dibuja la viñeta y la primera línea de texto
                c.drawString(X_COMPETENCIES_BULLET, current_y, "•")
                c.drawString(X_COMPETENCIES_TEXT, current_y, line.strip())
            else:
                # Dibuja las líneas subsiguientes con sangría
                c.drawString(X_COMPETENCIES_TEXT, current_y, line.strip())
            
            current_y -= LINE_HEIGHT 
        
        current_y -= LINE_HEIGHT * 0.5 # Espacio extra entre competencias


    # --- 4. PIE DE PÁGINA: QR y Folio ---
    
    qr_data_uri = _build_qr_data_uri(serial)
    
    try:
        qr_bytes = base64.b64decode(qr_data_uri.split(',')[1])
        qr_image = io.BytesIO(qr_bytes)
        
        QR_SIZE = 100
        c.drawImage(qr_image, X_QR, Y_QR, width=QR_SIZE, height=QR_SIZE, mask='auto')
        
        c.setFont(DEFAULT_FONT_BOLD, 12)
        c.drawString(X_QR, Y_QR - 20, f"Folio: {serial}")

    except Exception:
        pass

    # --- 5. PIE DE PÁGINA: Firma y Fecha ---
    
    # Firma y Línea 
    SIGNATURE_WIDTH = 250
    c.line(X_SIGNATURE - SIGNATURE_WIDTH/2, Y_SIGNATURE, X_SIGNATURE + SIGNATURE_WIDTH/2, Y_SIGNATURE)
    
    c.setFont(DEFAULT_FONT_BOLD, 16)
    c.drawCentredString(X_SIGNATURE, Y_SIGNATURE - 20, "Dr. Juan Manuel Gutiérrez Méndez")
    c.setFont(DEFAULT_FONT, 14)
    c.drawCentredString(X_SIGNATURE, Y_SIGNATURE - 40, "Director de Proyectos")

    # Fecha de Expedición
    date_text = _build_issue_date_text(issue_date)
    c.setFont(DEFAULT_FONT, 12)
    c.drawRightString(A4_WIDTH - 100, Y_SIGNATURE + 15, date_text)
    
    c.showPage()
    c.save()
    
    # ----------------------------------------------------------------
    # 6. Combinar la capa dinámica (ReportLab) con la plantilla estática (PyPDF2)
    # ----------------------------------------------------------------
    
    packet.seek(0)
    
    try:
        overlay_pdf = PdfReader(packet)
        
        with open(template_path, 'rb') as f:
            template_pdf = PdfReader(f)
        
        output = PdfWriter()
        page = template_pdf.pages[0]
        
        page.merge_page(overlay_pdf.pages[0])
        
        output.add_page(page)

        output_bytes = io.BytesIO()
        output.write(output_bytes)
        return output_bytes.getvalue()

    except Exception as e:
         raise Exception(f"Error combinando PDF (Verifique ReportLab/PyPDF2): {e}")