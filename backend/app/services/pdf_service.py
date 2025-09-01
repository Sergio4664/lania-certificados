# backend/app/services/pdf_service.py
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from datetime import date

def generate_certificate_pdf(participant_name: str, course_name: str, hours: int, issue_date: date) -> bytes:
    """
    Genera un PDF de certificado usando ReportLab.
    Retorna el contenido en bytes para guardarlo en la BD o como archivo.
    """
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # --- Logo y encabezado ---
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width / 2, height - 3*cm, "LANIA")
    
    c.setFont("Helvetica", 12)
    c.drawCentredString(width / 2, height - 3.8*cm, "Laboratorio Nacional de Informática Avanzada")

    # --- Título principal ---
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(width / 2, height - 5.5*cm, "CONSTANCIA")

    # --- Nombre del participante ---
    c.setFont("Helvetica", 14)
    c.drawCentredString(width / 2, height - 7.5*cm, "Otorgada a:")
    
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(width / 2, height - 8.5*cm, participant_name)

    # --- Texto del curso ---
    c.setFont("Helvetica", 14)
    c.drawCentredString(width / 2, height - 10.5*cm,
        f"Por haber participado satisfactoriamente en el curso:")
    
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2, height - 11.5*cm, f'"{course_name}"')

    c.setFont("Helvetica", 14)
    c.drawCentredString(width / 2, height - 12.5*cm,
        f"Con una duración de {hours} horas académicas.")

    # --- Fecha de emisión ---
    c.setFont("Helvetica-Oblique", 12)
    c.drawCentredString(width / 2, height - 15*cm,
        f"Emitida en Tuxtepec, Oaxaca el {issue_date.strftime('%d de %B de %Y')}")

    # --- Firma ---
    c.setFont("Helvetica", 12)
    c.drawString(4*cm, 5*cm, "____________________________")
    c.drawString(4*cm, 4.5*cm, "Coordinación Académica")
    c.drawString(4*cm, 4*cm, "LANIA")

    # --- Pie de página ---
    c.setFont("Helvetica", 8)
    c.drawCentredString(width / 2, 2*cm, 
        "www.lania.mx - Tuxtepec, Oaxaca, México")

    # Finalizar PDF
    c.showPage()
    c.save()

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes