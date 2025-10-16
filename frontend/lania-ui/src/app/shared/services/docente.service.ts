import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

// Importaremos estas interfaces, que definiremos en el siguiente paso.
import { DocenteDTO, CreateDocenteDTO, UpdateDocenteDTO } from '@shared/interfaces/docente.interfaces';

@Injectable({
  providedIn: 'root'
})
export class DocenteService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/docentes`;

  // Obtener todos los docentes
  getAll(): Observable<DocenteDTO[]> {
    return this.http.get<DocenteDTO[]>(this.apiUrl);
  }

  // Obtener un docente por ID
  getById(id: number): Observable<DocenteDTO> {
    return this.http.get<DocenteDTO>(`${this.apiUrl}/${id}`);
  }

  // Crear un nuevo docente (ya no lleva contraseña)
  create(docente: CreateDocenteDTO): Observable<DocenteDTO> {
    return this.http.post<DocenteDTO>(this.apiUrl, docente);
  }

  // Actualizar un docente
  update(id: number, docente: UpdateDocenteDTO): Observable<DocenteDTO> {
    return this.http.put<DocenteDTO>(`${this.apiUrl}/${id}`, docente);
  }

  // Eliminar un docente
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}