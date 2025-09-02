// src/app/shared/interfaces/docente.interfaces.ts
export interface DocenteDTO {
  id: number;
  full_name: string;
  email: string;
  is_active: boolean;
  telefono?: string;
  especialidad?: string;
  fecha_registro: string;
}

export interface CreateDocenteDTO {
  full_name: string;
  email: string;
  password: string;
  telefono?: string;
  especialidad?: string;
}

export interface UpdateDocenteDTO {
  full_name?: string;
  email?: string;
  telefono?: string;
  especialidad?: string;
  is_active?: boolean;
}

// src/app/shared/interfaces/course.interfaces.ts
export interface DocenteInfo {
  id: number;
  full_name: string;
  email: string;
}

export interface CourseDTO {
  id: number;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  hours: number;
  created_by: number;
  docentes?: DocenteInfo[];
}

export interface CreateCourseDTO {
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  hours: number;
  created_by: number;
  docente_ids?: number[];
}

export interface UpdateCourseDTO {
  name?: string;
  start_date?: string;
  end_date?: string;
  hours?: number;
  docente_ids?: number[];
}

// src/app/shared/interfaces/participant.interfaces.ts
export interface ParticipantDTO {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  created_at: string;
}

export interface CreateParticipantDTO {
  email: string;
  full_name: string;
  phone?: string;
}

export interface UpdateParticipantDTO {
  email?: string;
  full_name?: string;
  phone?: string;
}

// src/app/shared/interfaces/certificate.interfaces.ts
export interface CertificateDTO {
  id: number;
  serial: string;
  kind: string;
  status: string;
  course_name: string;
  participant_name: string;
  issued_at?: string;
}

export interface CreateCertificateDTO {
  course_id: number;
  participant_id: number;
  kind: string;
}

// src/app/shared/interfaces/auth.interfaces.ts
export interface LoginDTO {
  email: string;
  password: string;
}

export interface TokenDTO {
  access_token: string;
  token_type?: string;
}