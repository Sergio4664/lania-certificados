import asyncio
import base64
import locale
from datetime import date
from html import escape as html_escape
from pathlib import Path
from typing import Optional, List
# Se remueve 'import nest_asyncio' si fue añadido previamente.

# NUEVA IMPORTACIÓN: Necesaria para manejar la ejecución en un hilo separado
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
# CSS POR DEFECTO (si no existe app/static/styles.css) - ¡ACTUALIZADO!
# ------------------------------------------------------
DEFAULT_CSS = """
* { box-sizing: border-box; }

body {
    font-family: 'Roboto', Arial, sans-serif;
    margin: 0; padding: 0;
}

/* --- Certificate Container --- */
.certificate-wrapper {
    /* Ajuste de margen para centrar el contenido sobre el fondo (si lo hay) */
    width: 100%;
    min-height: 100vh;
    padding: 70px 100px; /* Margen superior/inferior 70px, lateral 100px */
}

/* --- Header Section (LANIA, etc.) --- */
.header-container {
    text-align: center;
    margin-bottom: 25px;
}
.header-logo {
    display: block;
    width: 80px; /* Tamaño del logo */
    margin: 0 auto 10px auto;
}
.header-text {
    line-height: 1.1;
}
.header-text .main {
    font-size: 16px; 
    font-weight: 700;
    color: #000;
    text-transform: uppercase;
}
.header-text .sub {
    font-size: 10px;
    color: #444;
}


/* --- Main Content --- */
.certificate-title {
    text-align: center;
    font-size: 28px; 
    font-weight: 700;
    color: #000; 
    margin: 20px 0 10px 0;
}

.certificate-subtitle {
    text-align: center;
    font-size: 16px;
    margin-bottom: 15px;
}

.participant-name {
    text-align: center;
    font-size: 40px; /* Letra más grande para el nombre */
    font-weight: 700;
    margin: 10px 0 25px 0;
}

.course-text {
    text-align: center;
    font-size: 16px;
    margin-bottom: 30px;
    line-height: 1.5;
}

/* --- Competencies List --- */
.competencies-title {
    font-size: 14px;
    font-weight: 700; 
    margin-top: 16px;
    text-align: left;
    margin-left: 40px; /* Alineación con la lista */
}

.competencies-list {
    margin: 0 40px 40px 40px; 
    padding-left: 20px;
    font-size: 12px;
    text-align: justify; /* Justificar texto para mejor lectura */
    list-style-type: disc; 
}
.competencies-list li {
    margin-bottom: 10px;
    line-height: 1.4;
}

/* --- Footer (Date, Signature, QR) --- */
.issue-date {
    text-align: right; /* Alineación a la derecha como en el ejemplo */
    font-size: 10px;
    margin-top: 50px; 
    margin-bottom: 10px;
    padding-right: 40px;
}

.footer-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end; /* Asegura que la línea de la firma quede abajo */
    margin-top: 30px;
}

.qr-block {
    text-align: left;
    font-size: 10px;
    width: 150px;
}
.qr-block img {
    width: 80px; 
    height: 80px;
}
.folio {
    margin-top: 5px;
    font-weight: 700;
}

.footer-center {
    text-align: center;
    width: 300px; 
}
.footer-center .line {
    border-top: 1px solid #000;
    margin-bottom: 5px;
}
.footer-center .name {
    font-size: 14px;
    font-weight: 700;
}
.footer-center .role {
    font-size: 12px;
}
"""


# ------------------------------------------------------
# Cargar styles.css si existe
# ------------------------------------------------------
def _load_css() -> str:
    css_path = Path("app/static/styles.css")
    if css_path.exists():
        return css_path.read_text(encoding="utf-8")
    return DEFAULT_CSS


# ------------------------------------------------------
# RENDER PYPETEER → PDF (SOLUCIÓN ROBUSTA PARA UVLOOP)
# ------------------------------------------------------

# Lógica asíncrona de Pyppeteer aislada
async def _async_render(html_content: str) -> bytes:
    """
    La lógica asíncrona de pyppeteer.
    """
    # 🚨 RUTA DEL BINARIO DE CHROME INSTALADO POR EL ADMINISTRADOR 🚨
    CHROME_PATH = "/usr/bin/google-chrome-stable" 

    browser = await launch(
        executablePath=CHROME_PATH, # <-- Usa el binario de Chrome del sistema
        args=[
            # Argumentos necesarios para ejecución en servidor/Docker
            "--no-sandbox",
            "--headless=new",          
            "--disable-gpu",
            
            # Argumentos de estabilidad críticos para evitar Target Closed
            "--disable-setuid-sandbox",
            "--no-zygote",             
            "--disable-dev-shm-usage",  
            
            # Argumentos para contenido local (si se requiere)
            "--disable-web-security",  
            "--ignore-certificate-errors", 
        ],
        handleSIGINT=False,
        handleSIGTERM=False,
        handleSIGHUP=False
    )
    page = await browser.newPage()
    # 💥 CORRECCIÓN CRÍTICA: Se eliminó 'waitUntil' para resolver el TypeError.
    await page.setContent(html_content) 
    
    pdf = await page.pdf({"format": "A4", "printBackground": True})
    await browser.close()
    return pdf

# Función síncrona que crea y corre un nuevo loop para la corrutina
def _render_in_new_loop(html_content: str) -> bytes:
    """
    Crea, ejecuta y cierra un loop de asyncio estándar para la corrutina 
    en el hilo actual.
    """
    # Se establece None para limpiar cualquier referencia potencial del thread
    # a un bucle existente.
    asyncio.set_event_loop(None)
    
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_async_render(html_content))
    finally:
        loop.close()
        # Vuelve a poner el bucle a None al terminar
        asyncio.set_event_loop(None)


def _render_pdf(html_content: str) -> bytes:
    """
    Render seguro de Pyppeteer, delegando la ejecución a un hilo 
    separado (ThreadPoolExecutor) para evitar el conflicto de bucles (uvloop).
    """
    # Usamos un ThreadPoolExecutor para ejecutar la función en un nuevo hilo.
    with ThreadPoolExecutor(max_workers=1) as executor:
        # El método submit ejecuta _render_in_new_loop en el nuevo hilo.
        # Esto aísla completamente la creación del bucle de asyncio.
        future = executor.submit(_render_in_new_loop, html_content)
        # Bloqueamos hasta que el resultado esté listo.
        return future.result()


# ------------------------------------------------------
# Construcción de texto de fecha
# ------------------------------------------------------
def _build_issue_date_text(issue_date: date) -> str:
    return (
        f"Se expide en la ciudad de Xalapa, Ver., a los {issue_date.day} días "
        f"de {issue_date.strftime('%B')} de {issue_date.year}"
    )


# ------------------------------------------------------
# QR BASE64
# ------------------------------------------------------
def _build_qr_data_uri(serial: str) -> str:
    qr_url = f"{app_settings.BASE_URL}/verificacion/{serial}"
    qr_bytes = generate_qr_png(qr_url)
    qr_b64 = base64.b64encode(qr_bytes).decode("ascii")
    return f"data:image/png;base64,{qr_b64}"


# ------------------------------------------------------
# LOGO BASE64 - ¡NUEVA FUNCIÓN!
# ------------------------------------------------------
def _build_logo_data_uri() -> str:
    # Asume que el archivo lania_logo.png está en app/static/
    logo_path = Path("app/static/lania_logo.png") 
    try:
        if logo_path.exists():
            logo_bytes = logo_path.read_bytes()
            logo_b64 = base64.b64encode(logo_bytes).decode("ascii")
            return f"data:image/png;base64,{logo_b64}"
    except Exception:
        # Esto ayuda si el archivo no existe o hay un problema de permisos
        pass 
    return ""
# ------------------------------------------------------


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
    # ... (el resto del código de la función se mantiene igual) ...
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
      {css_text}
      </style>
    </head>
    <body>{body_html}</body>
    </html>
    """

    return _render_pdf(full_html)


# =======================================================================
# ⭐ B) RECONOCIMIENTO → HTML + CSS - ¡ACTUALIZADO!
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

    css_text = _load_css()
    date_text = _build_issue_date_text(issue_date)
    qr_data_uri = _build_qr_data_uri(serial)
    logo_data_uri = _build_logo_data_uri() # 👈 Nueva llamada
    
    items = "\n".join(f"<li>{html_escape(c)}</li>" for c in competencies)

    body_html = f"""
    <div class="certificate-wrapper">
        
        <div class="header-container">
            <img src="{logo_data_uri}" class="header-logo" alt="LANIA Logo">
        </div>
        <div class="certificate-title">Otorga el presente reconocimiento</div>
        <div class="certificate-subtitle">a:</div>

        <div class="participant-name">{html_escape(participant_name)}</div>

        <div class="course-text">
            Por haber acreditado en el curso
            "<strong>{html_escape(course_name)}</strong>"
            ({hours} horas de trabajo), la evaluación de las competencias:
        </div>

        <div class="competencies-title">Competencias acreditadas:</div>
        <ul class="competencies-list">{items}</ul>

        <div class="issue-date">{html_escape(date_text)}</div>

        <div class="footer-row">
            
            <div class="qr-block">
                <img src="{qr_data_uri}">
                <div class="folio">Folio: {html_escape(serial)}</div> </div>

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
      {css_text}
      </style>
    </head>
    <body>{body_html}</body>
    </html>
    """

    return _render_pdf(full_html)