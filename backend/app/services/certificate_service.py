# backend/app/services/certificate_service.py
import os
import uuid
from datetime import datetime, date
from typing import Optional, List
from PyPDF2 import PdfReader, PdfWriter
import io
import re
from pathlib import Path
from fastapi import HTTPException

from app.services.qr_service import generate_qr_png
from app.core.config import get_settings

# --- ✅ 1. IMPORTAR AMBAS FUNCIONES DE PDF ---
from app.services.pdf_service import (
    generate_certificate_pdf, 
    generate_recognition_pdf # <-- Importar la nueva función
)

from app.models.producto_educativo import TipoProductoEnum

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
    tipo_producto: TipoProductoEnum,
    modalidad: str,
    course_hours: int,

    # --- ✅ 2. AÑADIR ARGUMENTOS DE COMPETENCIAS ---
    con_competencias: bool,
    competencias_list: Optional[List[str]] = None,
    # ---

    instructor_name: Optional[str] = None,
    is_docente: bool = False,
    course_date_str: str = ""
) -> tuple[str, str]:
    """
    Decide qué tipo de PDF generar (Constancia o Reconocimiento),
    lo genera y lo guarda.
    """

    # --- 1. Definir rutas y folio (Sin cambios) ---
    template_path = str(Path("app") / "static" / "Formato constancias.pdf")
    base_output_dir = Path('certificates')

    course_folder_name = sanitize_foldername(course_name)
    output_dir = base_output_dir / course_folder_name
    output_dir.mkdir(parents=True, exist_ok=True)

    folio = f"LANIA-{datetime.now().year}-{str(uuid.uuid4().hex[:8]).upper()}"
    file_path = output_dir / f"{folio}.pdf"

    # --- 2. Preparar datos (Sin cambios) ---
    entity_type = 'docente' if is_docente else 'participante'
    docente_specialty = instructor_name if is_docente else None

    # --- ✅ 3. LÓGICA DE DECISIÓN (EL CAMBIO PRINCIPAL) ---
    try:
        pdf_bytes = b"" # Inicializar variable
        
        # CASO 1: Es un participante de un CURSO y se marcó "con_competencias"
        if (entity_type == 'participante' and 
            con_competencias and 
            tipo_producto == TipoProductoEnum.CURSO_EDUCATIVO and 
            competencias_list):
            
            # --- Llamar al servicio de RECONOCIMIENTO ---
            pdf_bytes = generate_recognition_pdf(
                participant_name=participant_name,
                course_name=course_name,
                hours=course_hours,
                issue_date=datetime.now().date(),
                template_path=template_path,
                serial=folio,
                qr_token=folio,
                competencies=competencias_list # <-- Pasa la lista
            )
        
        # CASO 2: Es un docente O una constancia normal (sin competencias)
        else:
            
            # --- Llamar al servicio de CONSTANCIA (el que ya tenías) ---
            pdf_bytes = generate_certificate_pdf(
                participant_name=participant_name,
                course_name=course_name,
                hours=course_hours,
                issue_date=datetime.now().date(),
                template_path=template_path,
                serial=folio,
                qr_token=folio,
                course_date=course_date_str,
                entity_type=entity_type,
                tipo_producto=tipo_producto,
                modalidad=modalidad,
                docente_specialty=docente_specialty
            )

    except FileNotFoundError:
        raise HTTPException(status_code=500, detail=f"No se encontró la plantilla del certificado en: {template_path}")
    except Exception as e:
        print(f"Error al generar PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Error al generar el PDF: {e}")

    # --- 4. Guardar los bytes del PDF (Sin cambios) ---
    try:
        with open(file_path, "wb") as output_stream:
            output_stream.write(pdf_bytes)
    except IOError as e:
        print(f"Error al guardar PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Error al guardar el archivo PDF: {e}")

    # --- 5. Devolver folio y ruta (Sin cambios) ---
    return folio, str(file_path)