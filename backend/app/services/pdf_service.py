# app/services/pdf_service.py
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from datetime import date

def generate_certificate_pdf(participant_name: str, course_name: str, hours: int, issue_date: date) -> bytes:
    """
    Genera un PDF de constancia simple usando ReportLab.
    Retorna el contenido en bytes para guardarlo en la BD o como archivo.
    """

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # --- Título principal ---
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(width / 2, height - 4*cm, "CONSTANCIA")

    # --- Nombre del participante ---
    c.setFont("Helvetica", 14)
    c.drawCentredString(width / 2, height - 6*cm, "Otorgada a:")
    
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(width / 2, height - 7*cm, participant_name)

    # --- Texto del curso ---
    c.setFont("Helvetica", 14)
    c.drawCentredString(width / 2, height - 9*cm,
        f"Por haber participado en el curso: \"{course_name}\"")

    c.drawCentredString(width / 2, height - 10*cm,
        f"Con una duración de {hours} horas.")

    # --- Fecha de emisión ---
    c.setFont("Helvetica-Oblique", 12)
    c.drawCentredString(width / 2, height - 13*cm,
        f"Emitida en Tuxtepec, Oaxaca a {issue_date.strftime('%d/%m/%Y')}")

    # --- Firma (ejemplo simple) ---
    c.setFont("Helvetica", 12)
    c.drawString(3*cm, 4*cm, "______________________")
    c.drawString(3*cm, 3.5*cm, "Coordinador del curso")

    # Finalizar PDF
    c.showPage()
    c.save()

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
