// Define la estructura de un objeto Participante que se recibe de la API
export interface Participante {
  id: number;
  nombre_completo: string;
  email_personal: string;
  email_institucional?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
}

// Define la estructura para crear un nuevo Participante (sin el id)
export type ParticipanteCreate = Omit<Participante, 'id'>;

// Define la estructura para actualizar un Participante (todos los campos opcionales)
export type ParticipanteUpdate = Partial<ParticipanteCreate>;
