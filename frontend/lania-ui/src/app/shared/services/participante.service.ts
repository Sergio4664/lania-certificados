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
  private apiUrl = `${environment.apiUrl}/admin/participantes`;

  /**
   * Obtiene la lista de participantes, con opciones de paginación o límite.
   * Si no se especifica 'limit', la API usará su valor por defecto de 15.
   */
  getAll(skip: number = 0, limit?: number): Observable<Participante[]> {
    let params = new HttpParams();
    // Siempre enviar 'skip' (offset)
    params = params.set('skip', skip.toString());
    
    // ✅ Solo agregar 'limit' si se proporciona (si es undefined, FastAPI usa su valor por defecto)
    if (limit !== undefined) {
      params = params.set('limit', limit.toString());
    }
    
    // Incluir los parámetros en la solicitud GET
    return this.http.get<Participante[]>(this.apiUrl, { params });
  }

  create(participante: ParticipanteCreate): Observable<Participante> {
    return this.http.post<Participante>(this.apiUrl, participante);
  }
  
  /**
   * Actualiza un participante existente.
   * @param id El ID del participante a actualizar.
   * @param participante Los datos actualizados.
   */
  update(id: number, participante: ParticipanteUpdate): Observable<Participante> {
    return this.http.put<Participante>(`${this.apiUrl}/${id}`, participante);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}