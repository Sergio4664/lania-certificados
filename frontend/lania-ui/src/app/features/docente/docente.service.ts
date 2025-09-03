// src/app/features/docente/docente.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { DocenteDTO, CreateDocenteDTO, UpdateDocenteDTO } from '../../shared/interfaces/docente.interfaces';

// Re-export interfaces for convenience
export { DocenteDTO, CreateDocenteDTO, UpdateDocenteDTO };

@Injectable({
  providedIn: 'root'
})
export class DocenteService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  list(): Observable<DocenteDTO[]> {
    return this.http.get<DocenteDTO[]>(`${this.apiUrl}/api/admin/docentes`);
  }

  create(docente: CreateDocenteDTO): Observable<DocenteDTO> {
    return this.http.post<DocenteDTO>(
      `${this.apiUrl}/api/admin/docentes`, 
      docente, 
      this.httpOptions
    );
  }

  get(id: number): Observable<DocenteDTO> {
    return this.http.get<DocenteDTO>(`${this.apiUrl}/api/admin/docentes/${id}`);
  }

  update(id: number, data: UpdateDocenteDTO): Observable<DocenteDTO> {
    return this.http.put<DocenteDTO>(`${this.apiUrl}/api/admin/docentes/${id}`, data, this.httpOptions);
  }

  disable(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/api/admin/docentes/${id}`);
  }

  // Legacy methods para compatibilidad
  getDocentes(): Observable<DocenteDTO[]> {
    return this.list();
  }

  createDocente(docente: CreateDocenteDTO): Observable<DocenteDTO> {
    return this.create(docente);
  }
}