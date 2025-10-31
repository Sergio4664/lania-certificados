// --- 💡 1. IMPORTAR LA INTERFAZ DE CERTIFICADO ---
import { Certificado } from './certificado.interface';

export interface DocenteDTO {
  id: number;
  nombre_completo: string;
  email_institucional: string;
  email_personal?: string | null; // Hecho opcional
  telefono?: string | null;     // Hecho opcional
  whatsapp?: string | null;     // Hecho opcional
  especialidad?: string | null; // Hecho opcional
  is_active?: boolean;          // Hecho opcional
  fecha_registro?: string;      // Hecho opcional
  
  // --- 💡 2. AÑADIR LA PROPIEDAD QUE FALTABA ---
  // (Esto arregla el error de 'certificados' no existe)
  certificados?: Certificado[];
}

export interface CreateDocenteDTO {
  nombre_completo: string;
  email_institucional: string;
  email_personal?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  especialidad?: string | null;
  is_active?: boolean;
  fecha_registro?: string;
}

export interface UpdateDocenteDTO {
  d: number; // 💡 Debería ser 'id'
  nombre_completo?: string;
  email_institucional?: string;
  email_personal?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  especialidad?: string | null;
  is_active?: boolean;
}