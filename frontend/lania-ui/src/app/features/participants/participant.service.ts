import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ParticipantDTO {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
}

@Injectable({ providedIn: 'root' })
export class ParticipantService {
  private http = inject(HttpClient);
  private base = environment.apiBase;

  // Ya tienes router admin_participants con prefijo /api/admin/participants (CRUD)
  // Ajusta si tu esquema es por curso, p.ej.: /api/admin/courses/:id/participants

  listByCourse(courseId: number) {
    // TODO: crea en FastAPI: GET /api/admin/courses/:id/participants
    return this.http.get<ParticipantDTO[]>(`${this.base}/api/admin/courses/${courseId}/participants`);
  }

  addToCourse(courseId: number, data: {full_name:string; email:string; phone?:string}) {
    // TODO: crea en FastAPI: POST /api/admin/courses/:id/participants
    return this.http.post(`${this.base}/api/admin/courses/${courseId}/participants`, data);
  }

  importExcel(courseId: number, file: File) {
    // TODO: crea en FastAPI: POST /api/admin/courses/:id/participants/import
    const form = new FormData();
    form.append('file', file);
    return this.http.post(`${this.base}/api/admin/courses/${courseId}/participants/import`, form);
  }
}
