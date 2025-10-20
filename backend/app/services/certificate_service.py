# backend/app/services/certificate_service.py
from http.client import HTTPException
import os
import uuid
from datetime import datetime
from fpdf import FPDF
from PyPDF2 import PdfReader, PdfWriter
import io

from app.services.qr_service import generate_qr_png
from app.core.config import get_settings

settings = get_settings()

def generate_certificate(
    participant_name: str,
    course_name: str,
    course_type: str,
    course_hours: int,
    # ✅ CORRECCIÓN: Renombrado a instructor_name para mayor claridad
    instructor_name: str = "Docente no asignado", 
    is_docente: bool = False
) -> str:
    """
    Genera un certificado en PDF usando una plantilla y lo guarda en el servidor.
    """
    template_path = os.path.join("app", "static", "Formato constancias.pdf")
    output_dir = 'certificates'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    folio = f"LANIA-{datetime.now().year}-{str(uuid.uuid4().hex[:8]).upper()}"
    verification_url = f"{settings.FRONTEND_URL}/verificacion/{folio}"

    packet = io.BytesIO()
    pdf_text = FPDF('L', 'mm', 'A4')
    pdf_text.add_page()
    pdf_text.set_auto_page_break(auto=False)

    # --- Ajusta las coordenadas (x, y) para que coincidan con tu plantilla ---
    
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

    # ✅ NUEVO: Mostrar el nombre del instructor (si no es el certificado del propio docente)
    if not is_docente and instructor_name:
        pdf_text.set_font('Arial', '', 14)
        pdf_text.set_xy(10, 130) # Ajusta la posición Y
        pdf_text.cell(277, 10, f'Impartido por: {instructor_name}', 0, 1, 'C')
    
    # Folio
    pdf_text.set_font('Arial', 'I', 10)
    pdf_text.set_xy(15, 180)
    pdf_text.cell(100, 10, f'Folio: {folio}', 0, 0, 'L')

    qr_bytes = generate_qr_png(verification_url)
    qr_path_temp = f"temp_qr_{folio}.png"
    with open(qr_path_temp, "wb") as qr_file:
        qr_file.write(qr_bytes)

    if os.path.exists(qr_path_temp):
        pdf_text.image(qr_path_temp, x=240, y=160, w=30)
        os.remove(qr_path_temp)

    pdf_text_bytes = pdf_text.output(dest='S')
    packet.write(pdf_text_bytes)
    packet.seek(0)
    
    new_pdf = PdfReader(packet)
    
    # Manejo de error si no se encuentra la plantilla
    try:
        existing_pdf = PdfReader(open(template_path, "rb"))
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail=f"No se encontró la plantilla del certificado en: {template_path}")

    output = PdfWriter()
    page = existing_pdf.pages[0]
    page.merge_page(new_pdf.pages[0])
    output.add_page(page)

    file_path = os.path.join(output_dir, f"{folio}.pdf")
    with open(file_path, "wb") as output_stream:
        output.write(output_stream)

    return file_path