import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Participante, ParticipanteCreate, ParticipanteUpdate } from '@shared/interfaces/participante.interface';

@Injectable({
  providedIn: 'root'
})
export class ParticipanteService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/admin/participantes`;

  getAll(): Observable<Participante[]> {
    return this.http.get<Participante[]>(this.apiUrl);
  }

  getById(id: number): Observable<Participante> {
    return this.http.get<Participante>(`${this.apiUrl}/${id}`);
  }

  create(participante: ParticipanteCreate): Observable<Participante> {
    return this.http.post<Participante>(this.apiUrl, participante);
  }

  update(id: number, participante: ParticipanteUpdate): Observable<Participante> {
    return this.http.put<Participante>(`${this.apiUrl}/${id}`, participante);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}