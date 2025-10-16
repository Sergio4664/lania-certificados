import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Participante, ParticipanteCreate } from '../interfaces/participante.interface';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ParticipanteService {
  private http = inject(HttpClient);
  private resourceUrl = `${environment.apiUrl}/admin/participantes/`;

  getAll(): Observable<Participante[]> {
    return this.http.get<Participante[]>(this.resourceUrl);
  }

  create(participante: ParticipanteCreate): Observable<Participante> {
    return this.http.post<Participante>(this.resourceUrl, participante);
  }

  delete(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.resourceUrl}${id}`);
  }
}