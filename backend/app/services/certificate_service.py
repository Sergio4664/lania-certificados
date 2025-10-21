# backend/app/services/certificate_service.py
import os
import uuid
from datetime import datetime
from fpdf import FPDF
from PyPDF2 import PdfReader, PdfWriter
import io
import re
from pathlib import Path
from fastapi import HTTPException

from app.services.qr_service import generate_qr_png
from app.core.config import get_settings

# ❌ LÍNEA ELIMINADA: from app.services.certificate_service import generate_certificate

settings = get_settings()


def sanitize_foldername(name: str) -> str:
    """Limpia un string para usarlo como nombre de carpeta seguro."""
    name = re.sub(r'[^\w\s-]', '', name).strip()
    name = re.sub(r'\s+', '_', name)
    return name[:100]


def generate_certificate(
    participant_name: str,
    course_name: str,
    course_type: str,
    course_hours: int,
    instructor_name: str = "Docente no asignado",
    is_docente: bool = False
) -> tuple[str, str]:
    """
    Genera un certificado en PDF, lo guarda en una subcarpeta
    basada en el nombre del curso, y devuelve el folio y la ruta.
    """
    template_path = Path("app") / "static" / "Formato constancias.pdf"
    base_output_dir = Path('certificates')

    course_folder_name = sanitize_foldername(course_name)
    output_dir = base_output_dir / course_folder_name
    output_dir.mkdir(parents=True, exist_ok=True)

    folio = f"LANIA-{datetime.now().year}-{str(uuid.uuid4().hex[:8]).upper()}"
    verification_url = f"{settings.FRONTEND_URL}/verificacion/{folio}"
    file_path = output_dir / f"{folio}.pdf"

    packet = io.BytesIO()
    pdf_text = FPDF('L', 'mm', 'A4')
    pdf_text.add_page()
    pdf_text.set_auto_page_break(auto=False)

    # Nombre del participante/docente
    pdf_text.set_font('Arial', 'B', 20)
    pdf_text.set_xy(10, 80)
    pdf_text.cell(277, 10, participant_name.upper(), 0, 1, 'C')

    # Texto principal de la constancia
    pdf_text.set_font('Arial', '', 16)
    accion = "impartir" if is_docente else "cursar y aprobar"
    texto_principal = f'Por {accion} el {course_type.replace("_", " ").title()} "{course_name}".'
    pdf_text.set_xy(10, 100)
    pdf_text.multi_cell(277, 10, texto_principal, 0, 'C')

    # Horas del curso
    if course_hours and course_hours > 0:
        pdf_text.set_font('Arial', '', 14)
        pdf_text.set_xy(10, 120)
        pdf_text.cell(277, 10, f'Con una duración de {course_hours} horas.', 0, 1, 'C')

    # Nombre del instructor
    if not is_docente and instructor_name:
        pdf_text.set_font('Arial', '', 14)
        pdf_text.set_xy(10, 130)
        pdf_text.cell(277, 10, f'Impartido por: {instructor_name}', 0, 1, 'C')

    # Folio
    pdf_text.set_font('Arial', 'I', 10)
    pdf_text.set_xy(15, 180)
    pdf_text.cell(100, 10, f'Folio: {folio}', 0, 0, 'L')

    # Generar y añadir QR
    qr_bytes = generate_qr_png(verification_url)
    qr_path_temp = f"temp_qr_{folio}.png"
    with open(qr_path_temp, "wb") as qr_file:
        qr_file.write(qr_bytes)

    if os.path.exists(qr_path_temp):
        try:
             pdf_text.image(qr_path_temp, x=240, y=160, w=30)
        finally:
             if os.path.exists(qr_path_temp):
                 os.remove(qr_path_temp)

    pdf_text_bytes = pdf_text.output(dest='S')
    packet.write(pdf_text_bytes)
    packet.seek(0)

    new_pdf = PdfReader(packet)

    try:
        existing_pdf = PdfReader(open(template_path, "rb"))
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail=f"No se encontró la plantilla del certificado en: {template_path}")

    output = PdfWriter()
    page = existing_pdf.pages[0]
    page.merge_page(new_pdf.pages[0])
    output.add_page(page)

    with open(file_path, "wb") as output_stream:
        output.write(output_stream)

    return folio, str(file_path)