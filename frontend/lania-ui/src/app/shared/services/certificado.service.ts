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
  
  // --- MÉTODOS INDIVIDUALES ---
  emitirConstanciaParticipante(participanteId: number, productoEducativoId: number): Observable<Certificado> {
    return this.http.post<Certificado>(`${this.apiUrl}/participante`, { producto_educativo_id: productoEducativoId, participante_id: participanteId });
  }

  emitirConstanciaDocente(docenteId: number, productoEducativoId: number): Observable<Certificado> {
    return this.http.post<Certificado>(`${this.apiUrl}/docente`, { producto_educativo_id: productoEducativoId, docente_id: docenteId });
  }

  enviarConstanciaParticipante(certificadoId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/enviar/participante/${certificadoId}`, {});
  }

  enviarConstanciaDocente(certificadoId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/enviar/docente/${certificadoId}`, {});
  }

  // --- MÉTODOS MASIVOS ---
  emitirConstanciasParticipantes(productoId: number): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/participantes/producto/${productoId}`, {});
  }

  emitirConstanciasDocentes(productoId: number): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/docentes/producto/${productoId}`, {});
  }

  enviarConstanciasParticipantes(productoId: number): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/enviar/participantes/producto/${productoId}`, {});
  }

  enviarConstanciasDocentes(productoId: number): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/enviar/docentes/producto/${productoId}`, {});
  }
  
  // --- OTROS MÉTODOS ---
  create(data: CertificadoCreate): Observable<Certificado> {
    return this.http.post<Certificado>(this.apiUrl, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}