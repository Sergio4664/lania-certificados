export interface ParticipantDTO {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  created_at: string;
  // Agregar campos faltantes para compatibilidad
  telefono?: string;
  documento_identidad?: string;
  is_active?: boolean;
  fecha_registro?: string;
}

export interface CreateParticipantDTO {
  email: string;
  full_name: string;
  phone?: string;
  telefono?: string;
  documento_identidad?: string;
  password?: string;
}

export interface UpdateParticipantDTO {
  email?: string;
  full_name?: string;
  phone?: string;
  telefono?: string;
  documento_identidad?: string;
  is_active?: boolean;
}
