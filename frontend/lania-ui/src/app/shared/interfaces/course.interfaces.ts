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
  code?: string;
  name?: string;
  start_date?: string;
  end_date?: string;
  hours?: number;
  docente_ids?: number[];
}
