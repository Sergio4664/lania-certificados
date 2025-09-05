// src/app/shared/interfaces/docente.interfaces.ts
export interface DocenteDTO {
  id: number;
  full_name: string;
  email: string;
  telefono?: string;
  especialidad?: string;
  is_active: boolean;
  fecha_registro: string;
}

export interface CreateDocenteDTO {
  full_name: string;
  email: string;
  telefono: string; 
  especialidad?: string;
}

export interface UpdateDocenteDTO {
  full_name?: string;
  email?: string;
  telefono?: string;
  especialidad?: string;
  is_active?: boolean;
}