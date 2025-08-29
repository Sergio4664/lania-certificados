// src/app/features/teacher/teacher.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

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
export class TeacherService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Headers con Content-Type explícito
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  list(): Observable<DocenteDTO[]> {
    // Usar URL consistente sin barra final
    return this.http.get<DocenteDTO[]>(`${this.apiUrl}/api/admin/docentes`);
  }

  create(docente: CreateDocenteDTO): Observable<DocenteDTO> {
    console.log('Sending teacher data:', docente); // Para debugging
    // Usar URL consistente sin barra final y headers explícitos
    return this.http.post<DocenteDTO>(
      `${this.apiUrl}/api/admin/docentes`, 
      docente, 
      this.httpOptions
    );
  }

  disable(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/api/admin/teachers/${id}`);
  }

  // Legacy methods for backward compatibility
  getDocentes(): Observable<DocenteDTO[]> {
    return this.list();
  }

  createDocente(docente: any): Observable<any> {
    // Transformar el objeto legacy al formato esperado
    const transformedDocente: CreateDocenteDTO = {
      full_name: docente.nombre || docente.full_name,
      email: docente.email,
      password: docente.password || 'default_password'
    };
    return this.create(transformedDocente);
  }
}