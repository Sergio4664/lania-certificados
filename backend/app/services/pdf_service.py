# backend/app/services/pdf_service.py

import asyncio
import base64
import locale
from datetime import date
from html import escape as html_escape
from pathlib import Path
from typing import Optional, List

import nest_asyncio
nest_asyncio.apply()

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
# CSS POR DEFECTO (si no existe app/static/styles.css)
# ------------------------------------------------------
DEFAULT_CSS = """
* { box-sizing: border-box; }

body {
    font-family: 'Roboto', Arial, sans-serif;
    margin: 0; padding: 0;
}

.certificate-wrapper {
    width: 100%;
    min-height: 100vh;
    padding: 40px 60px;
}

.certificate-title {
    text-align: center;
    font-size: 32px;
    font-weight: 700;
    color: #b20000;
    margin-bottom: 8px;
}

.certificate-subtitle {
    text-align: center;
    font-size: 16px;
    margin-bottom: 18px;
}

.participant-name {
    text-align: center;
    font-size: 32px;
    font-weight: 700;
    margin: 10px 0 18px 0;
}

.course-text {
    text-align: center;
    font-size: 14px;
    margin-bottom: 12px;
}

.competencies-title {
    font-size: 14px;
    margin-top: 16px;
}

.competencies-list {
    margin: 0 40px;
    padding-left: 20px;
    font-size: 12px;
}

.footer-row {
    display: flex;
    justify-content: space-between;
    margin-top: 40px;
}

.qr-block img {
    width: 70px;
    height: 70px;
}

.issue-date {
    text-align: center;
    font-size: 10px;
    margin-top: 20px;
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
# RENDER PYPETEER → PDF (CON FIX DE SEÑALES)
# ------------------------------------------------------
def _render_pdf(html_content: str) -> bytes:
    """
    Render seguro de Pyppeteer compatible con FastAPI + Uvicorn.
    """
    nest_asyncio.apply()

    async def run():
        browser = await launch(
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ],
            handleSIGINT=False,
            handleSIGTERM=False,
            handleSIGHUP=False
        )
        page = await browser.newPage()
        await page.setContent(html_content, waitUntil="networkidle0")
        pdf = await page.pdf({"format": "A4", "printBackground": True})
        await browser.close()
        return pdf

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    return loop.run_until_complete(run())


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


# =======================================================================
# ⭐ A) CONSTANCIA TRADICIONAL → HTML + CSS
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
# ⭐ B) RECONOCIMIENTO → HTML + CSS
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

    items = "\n".join(f"<li>{html_escape(c)}</li>" for c in competencies)

    body_html = f"""
    <div class="certificate-wrapper">

        <div class="certificate-title">RECONOCIMIENTO</div>
        <div class="certificate-subtitle">Otorga el presente a:</div>

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
