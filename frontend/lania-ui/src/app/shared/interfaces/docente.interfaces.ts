// --- 💡 1. IMPORTAR LA INTERFAZ DE CERTIFICADO ---
import { Certificado } from './certificado.interface';

export interface DocenteDTO {
  id: number;
  nombre_completo: string;
  email_institucional: string;
  email_personal: string;
  telefono: string;
  whatsapp: string;
  especialidad: string;
  is_active: boolean;
  fecha_registro: string;

  // --- 💡 2. AÑADIR LA PROPIEDAD QUE FALTABA ---
  // (Esto arregla el error TS2339)
  certificados?: Certificado[];
}

export interface CreateDocenteDTO {
  nombre_completo: string;
  email_institucional: string;
  email_personal: string;
  telefono: string;
  whatsapp: string;
  especialidad: string;
  is_active: boolean;
  fecha_registro: string;
}

export interface UpdateDocenteDTO {
  id: number; // 💡 Corregido de 'd' a 'id'
  nombre_completo?: string; // Hecho opcional
  email_institucional?: string; // Hecho opcional
  email_personal?: string; // Hecho opcional
  telefono?: string; // Hecho opcional
  whatsapp?: string; // Hecho opcional
  especialidad?: string; // Hecho opcional
  is_active?: boolean; // Hecho opcional
}
