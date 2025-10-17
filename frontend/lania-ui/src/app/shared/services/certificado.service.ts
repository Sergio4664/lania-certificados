// frontend/lania-ui/src/app/shared/services/certificado.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Certificado, CertificadoCreate } from '../interfaces/certificado.interface';

@Injectable({
  providedIn: 'root'
})
export class CertificadoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/admin/certificados`;

  getAll(): Observable<Certificado[]> {
    return this.http.get<Certificado[]>(this.apiUrl);
  }

  create(data: CertificadoCreate): Observable<Certificado> {
    return this.http.post<Certificado>(this.apiUrl, data);
  }

  createForDocente(productoId: number, docenteId: number): Observable<Certificado> {
    return this.http.post<Certificado>(`${this.apiUrl}/docente`, { producto_educativo_id: productoId, docente_id: docenteId });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  sendEmail(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/enviar/${id}`, {});
  }

  // Métodos para emisión individual que ya teníamos
  emitirConstanciaParticipante(participanteId: number, productoEducativoId: number): Observable<Certificado> {
    return this.http.post<Certificado>(`${this.apiUrl}/participante`, { producto_educativo_id: productoEducativoId, participante_id: participanteId });
  }

  emitirConstanciaDocente(docenteId: number, productoEducativoId: number): Observable<Certificado> {
    return this.http.post<Certificado>(`${this.apiUrl}/docente`, { producto_educativo_id: productoEducativoId, docente_id: docenteId });
  }

  // Nuevos métodos para emisión masiva
  emitirYEnviarMasivamente(productoId: number): Observable<{ success: any[], errors: any[] }> {
    return this.http.post<{ success: any[], errors: any[] }>(`${this.apiUrl}/emitir-enviar-masivo/participantes/${productoId}`, {});
  }
  
  emitirYEnviarMasivamenteDocentes(productoId: number): Observable<{ success: any[], errors: any[] }> {
    return this.http.post<{ success: any[], errors: any[] }>(`${this.apiUrl}/emitir-enviar-masivo/docentes/${productoId}`, {});
  }
}