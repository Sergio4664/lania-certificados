# backend/app/services/certificate_service.py
import os
import uuid
# --- ✅ MODIFICACIÓN: Importaciones añadidas ---
from datetime import datetime, date
from typing import Optional, List
# ---
# from fpdf import FPDF # No se usa directamente aquí
from PyPDF2 import PdfReader, PdfWriter
import io
import re
from pathlib import Path
from fastapi import HTTPException

from app.services.qr_service import generate_qr_png
from app.core.config import get_settings

# --- ✅ MODIFICACIÓN: Importar el servicio de PDF ---
from app.services.pdf_service import generate_certificate_pdf

# --- ⬇️ AQUÍ ESTÁ LA CORRECCIÓN ⬇️ ---
# Se importa desde 'producto_educativo', no 'enums'
from app.models.producto_educativo import TipoProductoEnum
# --- ⬆️ FIN DE LA CORRECCIÓN ⬆️ ---


settings = get_settings()


def sanitize_foldername(name: str) -> str:
    """Limpia un string para usarlo como nombre de carpeta seguro."""
    name = re.sub(r'[^\w\s-]', '', name).strip()
    name = re.sub(r'\s+', '_', name)
    return name[:100]


# --- FUNCIÓN MODIFICADA ---
def generate_certificate(
    participant_name: str,
    course_name: str,

    # --- Argumentos cambiados ---
    tipo_producto: TipoProductoEnum, # <-- AÑADIDO
    modalidad: str,              # <-- AÑADIDO

    course_hours: int,

    instructor_name: Optional[str] = None,
    is_docente: bool = False,
    course_date_str: str = "" # Necesario para los docentes
) -> tuple[str, str]:
    """
    Prepara los datos y llama a pdf_service para generar un certificado.
    Lo guarda en una subcarpeta basada en el nombre del curso,
    y devuelve el folio y la ruta.
    """

    # --- 1. Definir rutas y folio ---
    template_path = str(Path("app") / "static" / "Formato constancias.pdf")
    base_output_dir = Path('certificates')

    course_folder_name = sanitize_foldername(course_name)
    output_dir = base_output_dir / course_folder_name
    output_dir.mkdir(parents=True, exist_ok=True)

    folio = f"LANIA-{datetime.now().year}-{str(uuid.uuid4().hex[:8]).upper()}"
    file_path = output_dir / f"{folio}.pdf"

    # --- 2. Preparar datos para pdf_service ---
    entity_type = 'docente' if is_docente else 'participante'

    # Si es un docente, `participant_name` es su nombre, e `instructor_name` es su especialidad (ej: "Dr.")
    docente_specialty = instructor_name if is_docente else None

    # --- 3. Llamar al servicio de PDF ---
    try:
        pdf_bytes = generate_certificate_pdf(
            participant_name=participant_name,
            course_name=course_name,
            hours=course_hours,
            issue_date=datetime.now().date(),
            template_path=template_path,
            serial=folio,
            qr_token=folio, # Usamos el folio para la URL del QR
            course_date=course_date_str, # Para docentes
            entity_type=entity_type,
            tipo_producto=tipo_producto,
            modalidad=modalidad,
            docente_specialty=docente_specialty,
            competencies=None # Esta función no maneja competencias
        )
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail=f"No se encontró la plantilla del certificado en: {template_path}")
    except Exception as e:
        # Importante: Imprimir el error real en la consola del backend
        print(f"Error al generar PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Error al generar el PDF: {e}")

    # --- 4. Guardar los bytes del PDF en el archivo ---
    try:
        with open(file_path, "wb") as output_stream:
            output_stream.write(pdf_bytes)
    except IOError as e:
        print(f"Error al guardar PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Error al guardar el archivo PDF: {e}")

    # --- 5. Devolver folio y ruta ---
    return folio, str(file_path)