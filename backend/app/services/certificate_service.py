# backend/app/services/certificate_service.py
import os
import uuid
from datetime import datetime
from fpdf import FPDF
from app.services.qr_service import generate_qr_png
from app.core.config import get_settings

# Cargar la configuración aquí
settings = get_settings()

# ✅ --- FUNCIÓN CORREGIDA ---
# 1. Se añade 'course_hours' para manejar la duración del curso.
# 2. Se añade 'instructor_name' para los certificados de participantes.
def generate_certificate(
    participant_name: str,
    course_name: str,
    course_type: str,
    course_hours: int,
    instructor_name: str = "Docente no asignado", # Valor por defecto
    is_docente: bool = False
) -> str:
    """
    Genera un certificado en PDF para un participante o docente y lo guarda en el servidor.
    """
    pdf = FPDF('L', 'mm', 'A4')
    pdf.add_page()
    pdf.set_auto_page_break(auto=False)

    pdf.set_font('Arial', 'B', 24)
    pdf.cell(0, 30, 'CONSTANCIA', 0, 1, 'C')
    pdf.ln(10)

    pdf.set_font('Arial', '', 16)
    otorga_a = "Al Docente:" if is_docente else "Al Participante:"
    pdf.cell(0, 10, otorga_a, 0, 1, 'C')
    
    pdf.set_font('Arial', 'B', 20)
    pdf.cell(0, 20, participant_name.upper(), 0, 1, 'C')
    
    pdf.set_font('Arial', '', 16)
    accion = "impartir" if is_docente else "cursar y aprobar"
    # La variable 'course_type' ahora es un texto (ej. "Curso") y no causará error.
    pdf.multi_cell(0, 10, f'Por {accion} el {course_type.replace("_", " ").title()} "{course_name}".', 0, 'C')
    
    # ✅ --- LÍNEA AÑADIDA ---
    # Se muestra la duración del curso usando el nuevo parámetro 'course_hours'.
    if course_hours and course_hours > 0:
        pdf.multi_cell(0, 10, f'Con una duración de {course_hours} horas.', 0, 'C')
    
    pdf.ln(15)

    fecha_emision = datetime.now().strftime("%d de %B de %Y")
    pdf.set_font('Arial', '', 12)
    pdf.cell(0, 10, f'Xalapa, Veracruz a {fecha_emision}', 0, 1, 'C')
    pdf.ln(20)

    folio = f"LANIA-{datetime.now().year}-{str(uuid.uuid4().hex[:8]).upper()}"
    pdf.set_font('Arial', 'I', 10)
    pdf.cell(0, 10, f'Folio: {folio}', 0, 0, 'L')
    
    # --- Lógica de QR ---
    verification_url = f"{settings.FRONTEND_URL}/verificacion/{folio}"
    qr_bytes = generate_qr_png(verification_url)
    
    # Guardar los bytes en un archivo temporal para que FPDF pueda usarlo
    qr_path = f"temp_qr_{folio}.png"
    with open(qr_path, "wb") as qr_file:
        qr_file.write(qr_bytes)
        
    if os.path.exists(qr_path):
        pdf.image(qr_path, x=240, y=160, w=30)
        os.remove(qr_path)

    output_dir = 'certificates'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    file_path = os.path.join(output_dir, f"{folio}.pdf")
    pdf.output(file_path)
    
    return file_path