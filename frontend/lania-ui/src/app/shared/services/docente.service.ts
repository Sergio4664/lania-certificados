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
  
  // --- ✨ CORRECCIÓN AQUÍ ---
  // Se añadió la barra (/) al final para evitar redirecciones 307
  private apiUrl = `${environment.apiUrl}/admin/docentes/`;

  getAll(): Observable<DocenteDTO[]> {
    // Esto ahora llamará a ".../admin/docentes/" (correcto)
    return this.http.get<DocenteDTO[]>(this.apiUrl);
  }

  create(docente: CreateDocenteDTO): Observable<DocenteDTO> {
    // Esto ahora llamará a ".../admin/docentes/" (correcto)
    return this.http.post<DocenteDTO>(this.apiUrl, docente);
  }

  update(id: number, docente: UpdateDocenteDTO): Observable<DocenteDTO> {
    // Esto llamará a ".../admin/docentes/1" (lo cual es correcto)
    return this.http.put<DocenteDTO>(`${this.apiUrl}${id}`, docente);
  }

  delete(id: number): Observable<void> {
    // Esto llamará a ".../admin/docentes/1" (lo cual es correcto)
    return this.http.delete<void>(`${this.apiUrl}${id}`);
  }
}