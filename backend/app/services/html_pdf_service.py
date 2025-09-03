from jinja2 import Template
import pdfkit
from datetime import datetime, date
import os
import logging

logger = logging.getLogger(__name__)

def get_template_path(kind: str) -> str:
    """Retorna la ruta del template según el tipo de certificado"""
    templates = {
        "PARTICIPANTE": "app/templates/contancia_pildora_participante.html",
        "PONENTE": "app/templates/contancia_pildora_ponente.html"
    }
    
    if kind not in templates:
        raise ValueError(f"Tipo de certificado no válido: {kind}")
    
    return templates[kind]

def generate_certificate_html_pdf(
    kind: str,
    participant_name: str, 
    course_name: str, 
    course_hours: int,
    course_date: str,
    serial: str,
    qr_token: str,
    course_modality: str = "presencial",
    director_name: str = "Dr. Juan Pérez",
    director_title: str = "Director Académico",
    issue_date: date = None
) -> bytes:
    """
    Genera PDF usando los templates HTML de Jinja2
    """
    try:
        # Obtener template path
        template_path = get_template_path(kind)
        
        # Leer el archivo template
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        # Crear template Jinja2
        template = Template(template_content)
        
        # Preparar fecha de emisión
        if not issue_date:
            issue_date = datetime.now().date()
        
        # Datos para el template
        template_data = {
            'serial': serial,
            'qr_token': qr_token,
            'course_name': course_name,
            'course_hours': course_hours,
            'course_date': course_date,
            'course_modality': course_modality,
            'director_name': director_name,
            'director_title': director_title,
            'issue_day': issue_date.day,
            'issue_month': get_month_name(issue_date.month),
            'issue_year': issue_date.year
        }
        
        # Datos específicos según el tipo
        if kind == "PARTICIPANTE":
            template_data['participant_name'] = participant_name
        elif kind == "PONENTE":
            template_data['instructor_name'] = participant_name
        
        # Renderizar HTML
        html_content = template.render(**template_data)
        
        # Configuración para wkhtmltopdf
        options = {
            'page-size': 'A4',
            'orientation': 'Landscape',
            'margin-top': '20mm',
            'margin-right': '20mm',
            'margin-bottom': '20mm',
            'margin-left': '20mm',
            'encoding': "UTF-8",
            'no-outline': None,
            'enable-local-file-access': None
        }
        
        # Generar PDF
        pdf_bytes = pdfkit.from_string(html_content, False, options=options)
        
        return pdf_bytes
        
    except Exception as e:
        logger.error(f"Error generando PDF HTML: {str(e)}")
        raise

def get_month_name(month: int) -> str:
    """Convierte número de mes a nombre en español"""
    months = {
        1: "enero", 2: "febrero", 3: "marzo", 4: "abril",
        5: "mayo", 6: "junio", 7: "julio", 8: "agosto", 
        9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre"
    }
    return months.get(month, "enero")
