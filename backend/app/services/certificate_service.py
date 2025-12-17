# backend/app/services/certificate_service.py

import uuid
import json
import re
from datetime import date, datetime # Aseguramos la importación de 'date'
from pathlib import Path
from typing import Optional, List

from fastapi import HTTPException
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app import models
from app.services.email_service import send_certificate_email

# Funciones de PDF (AHORA TODAS HTML+CSS+Pyppeteer)
from app.services.pdf_service import (
    generate_certificate_pdf,
    generate_recognition_pdf,
)

from app.models.producto_educativo import TipoProductoEnum

settings = get_settings()


# ============================================================
# LIMPIAR NOMBRE DE CARPETA
# ============================================================
def sanitize_foldername(name: str) -> str:
    name = re.sub(r"[^\w\s-]", "", name).strip()
    name = re.sub(r"\s+", "_", name)
    return name[:100]


# ============================================================
# GENERADOR DE PDF (Constancia o Reconocimiento)
# ============================================================
def generate_certificate(
    participant_name: str,
    course_name: str,
    tipo_producto: TipoProductoEnum,
    modalidad: str,
    course_hours: int,
    # Competencias
    con_competencias: bool,
    competencias_list: Optional[List[str]] = None,
    instructor_name: Optional[str] = None,
    is_docente: bool = False,
    # CORRECCIÓN 1: Usar objetos date en lugar de str
    course_start_date: Optional[date] = None,
    course_end_date: Optional[date] = None,
) -> tuple[str, str]:
    """
    Genera el PDF (tradicional o con competencias) usando pdf_service
    y devuelve (folio, ruta_archivo).
    """

    base_output_dir = Path("certificates")

    course_folder_name = sanitize_foldername(course_name)
    output_dir = base_output_dir / course_folder_name
    output_dir.mkdir(parents=True, exist_ok=True)

    folio = f"LANIA-{datetime.now().year}-{uuid.uuid4().hex[:8].upper()}"
    file_path = output_dir / f"{folio}.pdf"

    entity_type = "docente" if is_docente else "participante"
    docente_specialty = instructor_name if is_docente else None

    try:
        # Fecha de emisión
        issue_date = datetime.now().date()
        pdf_bytes: bytes

        # Reconocimiento de competencias (solo participantes, curso educativo y con lista de competencias)
        if (
            entity_type == "participante"
            and con_competencias
            and tipo_producto == TipoProductoEnum.CURSO_EDUCATIVO
            and competencias_list
        ):
            pdf_bytes = generate_recognition_pdf(
                participant_name=participant_name,
                course_name=course_name,
                hours=course_hours,
                issue_date=issue_date,
                serial=folio,
                qr_token=folio,
                competencies=competencias_list,
            )
        else:
            # Constancia tradicional (participante o docente)
            pdf_bytes = generate_certificate_pdf(
                participant_name=participant_name,
                course_name=course_name,
                hours=course_hours,
                issue_date=issue_date,
                serial=folio,
                qr_token=folio,
                entity_type=entity_type,
                tipo_producto=tipo_producto,
                modalidad=modalidad,
                # CORRECCIÓN 2: Pasar las nuevas fechas como argumentos
                course_start_date=course_start_date, 
                course_end_date=course_end_date,
                # La posición de entity_type, tipo_producto y modalidad se respeta
                # según la corrección de orden de argumentos hecha en pdf_service.py
                docente_specialty=docente_specialty,
            )

    except Exception as e:
        print(f"Error al generar PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Error al generar el PDF: {e}")

    if not pdf_bytes:
        raise HTTPException(
            status_code=500, detail="El generador de PDF no devolvió contenido."
        )

    try:
        with open(file_path, "wb") as f:
            f.write(pdf_bytes)
    except Exception as e:
        print(f"Error al guardar PDF: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error al guardar el archivo PDF: {e}"
        )

    return folio, str(file_path)


# ============================================================
# SERVICIO PRINCIPAL DE CERTIFICADOS
# ============================================================
class CertificateService:
    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------
    # Extraer lista de competencias desde DB
    # ------------------------------------------------------------
    def _parse_competencias(self, producto: models.ProductoEducativo) -> list[str]:
        if not producto.competencias:
            return []
        try:
            raw = json.loads(producto.competencias)
            if isinstance(raw, list):
                return [str(x) for x in raw]
        except Exception:
            return []
        return []

    # ------------------------------------------------------------
    # PROCESO MASIVO COMPLETO
    # ------------------------------------------------------------
    def emitir_y_enviar_masivamente(
        self,
        producto_id: int,
        con_competencias: bool = False,
    ) -> dict:
        # ============================================================
        # 1. Cargar producto
        # ============================================================
        producto: models.ProductoEducativo | None = (
            self.db.query(models.ProductoEducativo)
            .options(
                selectinload(models.ProductoEducativo.inscripciones).selectinload(
                    models.Inscripcion.participante
                ),
                selectinload(models.ProductoEducativo.docentes),
            )
            .filter(models.ProductoEducativo.id == producto_id)
            .first()
        )

        if not producto:
            raise RuntimeError(f"ProductoEducativo id={producto_id} no encontrado")

        competencias_list = (
            self._parse_competencias(producto) if con_competencias else []
        )

        stats = {
            "producto_id": producto_id,
            "producto_nombre": producto.nombre,
            "con_competencias": con_competencias,
            "participantes": {
                "total": len(producto.inscripciones or []),
                "emitidos_nuevos": 0,
                "reenviados": 0,
                "errores": [],
            },
            "docentes": {
                "total": len(producto.docentes or []),
                "emitidos_nuevos": 0,
                "reenviados": 0,
                "errores": [],
            },
        }

        # ============================================================
        # 2. PROCESAR PARTICIPANTES
        # ============================================================
        for inscripcion in producto.inscripciones or []:
            participante = inscripcion.participante
            if not participante:
                stats["participantes"]["errores"].append("Inscripción sin participante.")
                continue

            email = participante.email_personal
            if not email:
                stats["participantes"]["errores"].append(
                    f"Participante {participante.id} sin correo personal."
                )
                continue

            existing = (
                self.db.query(models.Certificado)
                .filter(
                    models.Certificado.inscripcion_id == inscripcion.id,
                    models.Certificado.con_competencias == con_competencias,
                )
                .first()
            )

            certificado = existing

            # ---------------------------------------------------------
            # 2.1 Emitir si no existe
            # ---------------------------------------------------------
            if not existing:
                try:
                    instructor_name = (
                        producto.docentes[0].nombre_completo
                        if producto.docentes
                        else "Equipo LANIA"
                    )

                    folio, path = generate_certificate(
                        participant_name=participante.nombre_completo,
                        course_name=producto.nombre,
                        tipo_producto=producto.tipo_producto,
                        modalidad=producto.modalidad.value
                        if producto.modalidad
                        else "No especificada",
                        course_hours=producto.horas,
                        con_competencias=con_competencias,
                        competencias_list=competencias_list
                        if con_competencias
                        else None,
                        instructor_name=instructor_name,
                        is_docente=False,
                        # No se pasan fechas aquí para participantes
                        # course_start_date=None, 
                        # course_end_date=None,
                    )

                    certificado = models.Certificado(
                        inscripcion_id=inscripcion.id,
                        producto_educativo_id=producto.id,
                        archivo_path=path,
                        folio=folio,
                        fecha_emision=datetime.now(),
                        con_competencias=con_competencias,
                    )

                    self.db.add(certificado)
                    self.db.commit()
                    self.db.refresh(certificado)

                    stats["participantes"]["emitidos_nuevos"] += 1

                except Exception as e:
                    self.db.rollback()
                    stats["participantes"]["errores"].append(
                        f"Error emitiendo para {participante.nombre_completo}: {e}"
                    )
                    continue

            # ---------------------------------------------------------
            # 2.2 Enviar correo
            # ---------------------------------------------------------
            try:
                pdf_bytes = Path(certificado.archivo_path).read_bytes()

                send_certificate_email(
                    recipient_email=email,
                    recipient_name=participante.nombre_completo,
                    course_name=producto.nombre,
                    pdf_content=pdf_bytes,
                    serial=certificado.folio,
                )

                if existing:
                    stats["participantes"]["reenviados"] += 1

            except Exception as e:
                stats["participantes"]["errores"].append(
                    f"Error enviando correo a {participante.nombre_completo}: {e}"
                )

        # ============================================================
        # 3. PROCESAR DOCENTES (solo constancia tradicional)
        # ============================================================
        for docente in producto.docentes or []:
            email = docente.email_institucional or docente.email_personal
            if not email:
                stats["docentes"]["errores"].append(
                    f"Docente {docente.nombre_completo} sin email."
                )
                continue

            existing = (
                self.db.query(models.Certificado)
                .filter(
                    models.Certificado.docente_id == docente.id,
                    models.Certificado.producto_educativo_id == producto.id,
                    models.Certificado.con_competencias == False,
                )
                .first()
            )

            certificado_doc = existing

            # ---------------------------------------------------------
            # 3.1 Emitir si no existe
            # ---------------------------------------------------------
            if not existing:
                try:
                    # CORRECCIÓN 3: Eliminada la lógica de 'course_date_str'

                    folio, path = generate_certificate(
                        participant_name=docente.nombre_completo,
                        course_name=producto.nombre,
                        tipo_producto=producto.tipo_producto,
                        modalidad=producto.modalidad.value
                        if producto.modalidad
                        else "No especificada",
                        course_hours=producto.horas,
                        con_competencias=False,
                        competencias_list=None,
                        instructor_name=docente.especialidad,
                        is_docente=True,
                        # CORRECCIÓN 4: Pasar directamente los objetos date (o None)
                        course_start_date=producto.fecha_inicio,
                        course_end_date=producto.fecha_fin,
                    )

                    certificado_doc = models.Certificado(
                        docente_id=docente.id,
                        producto_educativo_id=producto.id,
                        archivo_path=path,
                        folio=folio,
                        fecha_emision=datetime.now(),
                        con_competencias=False,
                    )

                    self.db.add(certificado_doc)
                    self.db.commit()
                    self.db.refresh(certificado_doc)

                    stats["docentes"]["emitidos_nuevos"] += 1

                except Exception as e:
                    self.db.rollback()
                    stats["docentes"]["errores"].append(
                        f"Error emitiendo constancia a {docente.nombre_completo}: {e}"
                    )
                    continue

            # ---------------------------------------------------------
            # 3.2 Enviar correo
            # ---------------------------------------------------------
            try:
                pdf_bytes = Path(certificado_doc.archivo_path).read_bytes()

                send_certificate_email(
                    recipient_email=email,
                    recipient_name=docente.nombre_completo,
                    course_name=producto.nombre,
                    pdf_content=pdf_bytes,
                    serial=certificado_doc.folio,
                )

                if existing:
                    stats["docentes"]["reenviados"] += 1

            except Exception as e:
                stats["docentes"]["errores"].append(
                    f"Error enviando email a docente {docente.nombre_completo}: {e}"
                )

        # ============================================================
        # 4. RETORNAR RESULTADOS
        # ============================================================
        return stats