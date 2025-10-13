// src/app/shared/interfaces/docente.interfaces.ts
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
  d: number;
  nombre_completo: string;
  email_institucional: string;
  email_personal: string;
  telefono: string;
  whatsapp: string;
  especialidad: string;
  is_active: boolean;
}