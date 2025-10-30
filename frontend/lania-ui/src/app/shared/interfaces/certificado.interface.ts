import { Inscripcion } from "./inscripcion.interface";
import { DocenteDTO } from "./docente.interfaces";
// --- 💡 1. IMPORTAR LA INTERFAZ DE PRODUCTO EDUCATIVO ---
// (Asumo que la ruta a tu interfaz de producto es esta)
import { ProductoEducativo } from "./producto-educativo.interface"; 

/**
 * Representa la estructura completa de un Certificado recuperado desde la API.
 */
export interface Certificado {
  id: number;
  folio: string;
  fecha_emision: string;
  archivo_path: string;
  producto_educativo_id: number;
  
  // Relaciones (pueden ser opcionales dependiendo del contexto)
  inscripcion_id?: number;
  docente_id?: number;
  
  // Datos anidados para facilitar el acceso en la UI
  inscripcion?: Inscripcion;
  docente?: DocenteDTO;
  // --- 💡 2. AÑADIR LA PROPIEDAD QUE FALTA ---
  // Esta línea arregla el error de compilación en el HTML
  producto_educativo?: ProductoEducativo; 

  // --- ⬇️ AQUÍ ESTÁ LA CORRECCIÓN ⬇️ ---
  /** Indica si este certificado fue emitido con competencias. */
  con_competencias: boolean;
}

/**
 * Define el payload necesario para crear un nuevo certificado.
 * Es flexible para soportar la creación basada en una inscripción o en un docente.
 */
export interface CertificadoCreate {
  inscripcion_id?: number;
  docente_id?: number;
  producto_educativo_id?: number; // Requerido si se especifica docente_id
  con_competencias?: boolean;     // Opcional para emitir con o sin competencias
}

/**
 * Define la estructura de la respuesta del endpoint de emisión masiva.
 */
export interface EmisionMasivaResponse {
  success: { inscripcion_id: number; folio: string }[];
  errors: { inscripcion_id: number; error: string }[];
}

/**
 * Representa la información pública de un certificado para la página de verificación.
 */
export interface CertificadoPublic {
  folio: string;
  fecha_emision: string;
  nombre_participante: string;
  nombre_producto: string;
  horas: number;
  nombre_docente: string;
}