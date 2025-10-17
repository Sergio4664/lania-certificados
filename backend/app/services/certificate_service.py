# backend/app/services/certificate_service.py

import os
from fpdf import FPDF
from datetime import datetime
import uuid
from app.services.qr_service import create_qr_code

# ✅ RENOMBRADA: La función ahora se llama 'generate_certificate'
def generate_certificate(participant_name: str, course_name: str, course_type: str, is_docente: bool = False) -> str:
    """
    Genera un certificado en PDF para un participante o docente y lo guarda en el servidor.
    """
    # Crear un PDF
    pdf = FPDF('L', 'mm', 'A4')
    pdf.add_page()
    pdf.set_auto_page_break(auto=False)

    # Añadir plantilla de fondo (si la tienes)
    # pdf.image('path/to/template.png', 0, 0, 297, 210)

    # Título del certificado
    pdf.set_font('Arial', 'B', 24)
    pdf.cell(0, 30, 'CONSTANCIA DE PARTICIPACIÓN', 0, 1, 'C')
    pdf.ln(10)

    # Cuerpo del texto
    pdf.set_font('Arial', '', 16)
    otorga_a = "al docente:" if is_docente else "al participante:"
    pdf.cell(0, 10, f'Se otorga la presente constancia {otorga_a}', 0, 1, 'C')
    
    pdf.set_font('Arial', 'B', 20)
    pdf.cell(0, 20, participant_name.upper(), 0, 1, 'C')
    
    pdf.set_font('Arial', '', 16)
    tipo_texto = "impartido" if is_docente else "cursado y aprobado"
    pdf.multi_cell(0, 10, f'Por haber {tipo_texto} el {course_type.replace("_", " ").title()} "{course_name}".', 0, 'C')
    pdf.ln(15)

    # Fecha
    pdf.set_font('Arial', '', 12)
    fecha_emision = datetime.now().strftime("%d de %B de %Y")
    pdf.cell(0, 10, f'Xalapa, Veracruz a {fecha_emision}', 0, 1, 'C')
    pdf.ln(20)

    # Folio único
    folio = f"LANIA-{datetime.now().year}-{str(uuid.uuid4().hex[:8]).upper()}"
    pdf.set_font('Arial', 'I', 10)
    pdf.cell(0, 10, f'Folio: {folio}', 0, 0, 'L')
    
    # Generar QR
    qr_path = create_qr_code(folio)
    if qr_path:
        pdf.image(qr_path, x=240, y=160, w=30)
        os.remove(qr_path) # Limpiar el archivo QR temporal

    # Guardar el archivo
    output_dir = 'certificates'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    file_path = os.path.join(output_dir, f"{folio}.pdf")
    pdf.output(file_path)
    
    return file_path