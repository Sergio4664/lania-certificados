/**
 * Representa la estructura completa de un Certificado,
 * tal como se recibe desde el backend.
 */
export interface Certificado {
  id: number;
  inscripcion_id: number;
  folio: string;
  fecha_emision: string; // YYYY-MM-DD
  url_validacion: string | null;
}

/**
 * Representa los datos necesarios para crear un nuevo Certificado.
 */
export interface CertificadoCreate {
  inscripcion_id: number;
}

/**
 * Representa la información pública de un certificado verificado.
 */
export interface CertificadoPublic {
  folio: string;
  fecha_emision: string;
  nombre_participante: string;
  nombre_producto: string;
  horas: number;
  nombre_docente: string;
}
