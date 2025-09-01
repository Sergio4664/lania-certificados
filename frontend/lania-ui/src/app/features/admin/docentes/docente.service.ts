// src/app/features/admin/docentes/docente.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { DocenteDTO, CreateDocenteDTO } from '../../../shared/interfaces/docente.interfaces';

@Injectable({
  providedIn: 'root'
})
export class DocenteService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Headers con Content-Type explícito
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  list(): Observable<DocenteDTO[]> {
    return this.http.get<DocenteDTO[]>(`${this.apiUrl}/api/admin/docentes`);
  }

  create(docente: CreateDocenteDTO): Observable<DocenteDTO> {
    console.log('Sending docente data:', docente);
    // Asegurar que todos los campos requeridos estén presentes
    if (!docente.password) {
      throw new Error('Password is required');
    }
    return this.http.post<DocenteDTO>(
      `${this.apiUrl}/api/admin/docentes`, 
      docente, 
      this.httpOptions
    );
  }

  disable(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/api/admin/docentes/${id}`);
  }

  // Legacy methods for backward compatibility
  getDocentes(): Observable<DocenteDTO[]> {
    return this.list();
  }

  createDocente(docente: any): Observable<any> {
    // Transformar el objeto legacy al formato esperado
    const transformedDocente: CreateDocenteDTO = {
      full_name: docente.full_name,
      email: docente.email,
      password: docente.password || 'default_password',
      telefono: docente.telefono,
      especialidad: docente.especialidad
    };
    return this.create(transformedDocente);
  }
}