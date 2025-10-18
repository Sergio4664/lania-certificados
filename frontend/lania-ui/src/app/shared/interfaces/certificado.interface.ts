import { Inscripcion } from "./inscripcion.interface";

/**
 * Representa la estructura completa de un Certificado.
 */
export interface Certificado {
  id: number;
  folio: string;
  fecha_emision: string;
  archivo_path: string;
  inscripcion_id?: number;
  docente_id?: number;
  producto_educativo_id: number;
  inscripcion?: Inscripcion; // ✅ CORRECCIÓN: Propiedad para datos anidados
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