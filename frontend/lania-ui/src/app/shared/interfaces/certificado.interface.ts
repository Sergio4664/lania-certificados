/**
 * Representa la estructura completa de un Certificado,
 * tal como se recibe desde el backend.
 */
export interface Certificado {
  id: number;
  folio: string;
  fecha_emision: string;
  archivo_path: string;
  inscripcion_id?: number; // Es opcional porque puede estar ligado a un docente
  docente_id?: number; // Añadido para certificados de docentes
  producto_educativo_id: number; // Añadido para referencia
}

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
