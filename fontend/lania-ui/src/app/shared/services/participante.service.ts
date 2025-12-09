// Ruta: frontend/lania-ui/src/app/shared/services/participante.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http'; // ✅ Importar HttpParams
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Participante, ParticipanteCreate, ParticipanteUpdate } from '@shared/interfaces/participante.interface';

@Injectable({
  providedIn: 'root'
})
export class ParticipanteService {
  private http = inject(HttpClient);
  // ✅ CORRECCIÓN CLAVE: Se añade la barra final '/' para evitar 404
  private apiUrl = `${environment.apiUrl}/admin/participantes/`; 

  /**
   * Obtiene la lista de participantes, con opciones de paginación o límite.
   * Llama a: /api/v1/admin/participantes/?skip=0
   */
  getAll(skip: number = 0, limit?: number): Observable<Participante[]> {
    let params = new HttpParams();
    // Siempre enviar 'skip' (offset)
    params = params.set('skip', skip.toString());
    
    // ✅ Solo agregar 'limit' si se proporciona 
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }
    
    // Incluir los parámetros en la solicitud GET (usa this.apiUrl que termina en /)
    return this.http.get<Participante[]>(this.apiUrl, { params });
  }

  create(participante: ParticipanteCreate): Observable<Participante> {
    // Llama a: /api/v1/admin/participantes/
    return this.http.post<Participante>(this.apiUrl, participante);
  }
  
  /**
   * Actualiza un participante existente.
   * Llama a: /api/v1/admin/participantes/{id}
   */
  update(id: number, participante: ParticipanteUpdate): Observable<Participante> {
    // ✅ CORRECCIÓN DE RUTA: Se concatena el ID directamente, ya que apiUrl termina en /
    return this.http.put<Participante>(`${this.apiUrl}${id}`, participante);
  }

  /**
   * Elimina un participante por ID.
   * Llama a: /api/v1/admin/participantes/{id}
   */
  delete(id: number): Observable<void> {
    // ✅ CORRECCIÓN DE RUTA: Se concatena el ID directamente, ya que apiUrl termina en /
    return this.http.delete<void>(`${this.apiUrl}${id}`);
  }
}