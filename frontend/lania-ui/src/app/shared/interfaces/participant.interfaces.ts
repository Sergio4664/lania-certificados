export interface ParticipantDTO {
  id: number;
  personal_email: string;
  institutional_email: string;
  full_name: string;
  created_at: string;
  telefono: string;
  whatsapp: string;
  is_active: boolean;
  fecha_registro: string;
}

export interface CreateParticipantDTO {
  personal_email: string;
  full_name: string;
  telefono: string;
  institutional_email: string;
  whatsapp: string;
  password?: string;
}

export interface UpdateParticipantDTO {
  personal_email?: string;
  institutional_email?: string;
  full_name?: string;
  telefono?: string;
  whatsapp?: string;
  is_active?: boolean;
}
