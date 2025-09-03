// src/app/features/courses/course.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CourseDTO, CreateCourseDTO, UpdateCourseDTO } from '../../shared/interfaces/course.interfaces';

// Exportar las interfaces para uso externo
export { CourseDTO, CreateCourseDTO, UpdateCourseDTO } from '../../shared/interfaces/course.interfaces';

@Injectable({ providedIn: 'root' })
export class CourseService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  list(): Observable<CourseDTO[]> {
    return this.http.get<CourseDTO[]>(`${this.apiUrl}/api/admin/courses`);
  }

  get(id: number): Observable<CourseDTO> {
    return this.http.get<CourseDTO>(`${this.apiUrl}/api/admin/courses/${id}`);
  }

  create(data: CreateCourseDTO): Observable<CourseDTO> {
    return this.http.post<CourseDTO>(`${this.apiUrl}/api/admin/courses`, data);
  }

  update(id: number, data: UpdateCourseDTO): Observable<CourseDTO> {
    return this.http.put<CourseDTO>(`${this.apiUrl}/api/admin/courses/${id}`, data);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/api/admin/courses/${id}`);
  }

  // Legacy methods
  listCourses(): Observable<CourseDTO[]> {
    return this.list();
  }

  createCourse(data: CreateCourseDTO): Observable<CourseDTO> {
    return this.create(data);
  }

  listMyCourses(): Observable<CourseDTO[]> {
    return this.http.get<CourseDTO[]>(`${this.apiUrl}/api/teacher/my-courses`);
  }

  // Método para asignar docente (si se necesita)
  assignTeacher(courseId: number, docente_id: number): Observable<{message: string}> {
    return this.http.put<{message: string}>(`${this.apiUrl}/api/admin/courses/${courseId}/assign-docente`, { docente_id });
  }
}