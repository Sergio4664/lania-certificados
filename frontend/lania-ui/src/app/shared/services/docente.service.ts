import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { DocenteDTO, CreateDocenteDTO, UpdateDocenteDTO } from '@shared/interfaces/docente.interfaces';

@Injectable({
  providedIn: 'root'
})
export class DocenteService {
  private http = inject(HttpClient);
  // ✅ CORRECCIÓN: Se añadió el prefijo /api a la URL.
  private apiUrl = `${environment.apiUrl}/admin/docentes/`;

  getAll(): Observable<DocenteDTO[]> {
    return this.http.get<DocenteDTO[]>(this.apiUrl);
  }

  create(docente: CreateDocenteDTO): Observable<DocenteDTO> {
    return this.http.post<DocenteDTO>(this.apiUrl, docente);
  }

  update(id: number, docente: UpdateDocenteDTO): Observable<DocenteDTO> {
    return this.http.put<DocenteDTO>(`${this.apiUrl}/${id}`, docente);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}