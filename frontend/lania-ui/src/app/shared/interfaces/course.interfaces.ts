// src/app/shared/interfaces/course.interfaces.ts
export interface DocenteInfo {
  id: number;
  especialidad: string;
  full_name: string;
  institutional_email: string;
}

export interface CourseDTO {
  id: number;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  hours: number;
  created_by: number;
  competencies?: string;
  docentes?: DocenteInfo[];
  course_type: 'PILDORA_EDUCATIVA' | 'INYECCION_EDUCATIVA' | 'CURSO_EDUCATIVO';
  modality: 'REMOTA' | 'PRESENCIAL' | 'HIBRIDA';
}

export interface CreateCourseDTO {
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  hours: number;
  competencies?: string;
  created_by: number;
  docente_ids?: number[];
  course_type?: 'PILDORA_EDUCATIVA' | 'INYECCION_EDUCATIVA' | 'CURSO_EDUCATIVO';
  modality?: 'REMOTA' | 'PRESENCIAL' | 'HIBRIDA';
}

export interface UpdateCourseDTO {
  code?: string;
  name?: string;
  start_date?: string;
  end_date?: string;
  hours?: number;
  competencies?: string;
  docente_ids?: number[];
  course_type?: 'PILDORA_EDUCATIVA' | 'INYECCION_EDUCATIVA' | 'CURSO_EDUCATIVO';
  modality?: 'REMOTA' | 'PRESENCIAL' | 'HIBRIDA';
}