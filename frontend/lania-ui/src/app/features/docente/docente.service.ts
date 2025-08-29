// src/app/features/teacher/teacher.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DocenteDTO {
  id: number;
  full_name: string;
  email: string;
  is_active: boolean;
}

export interface CreateDocenteDTO {
  full_name: string;
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocenteService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  list(): Observable<DocenteDTO[]> {
    return this.http.get<DocenteDTO[]>(`${this.apiUrl}/api/admin/docentes`);
  }

  create(docente: CreateDocenteDTO): Observable<DocenteDTO> {
    return this.http.post<DocenteDTO>(`${this.apiUrl}/api/admin/docentes`, docente);
  }

  disable(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/api/admin/docentes/${id}`);
  }

  // Legacy methods for backward compatibility
  getDocentes(): Observable<DocenteDTO[]> {
    return this.list();
  }

  createDocente(docente: any): Observable<any> {
    return this.create(docente);
  }
}