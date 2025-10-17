import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Certificado, CertificadoCreate, CertificadoPublic } from '@shared/interfaces/certificado.interface';

// Interfaz para la respuesta de la emisión masiva
export interface BulkIssuanceResponse {
  success: { participante: string; folio: string }[];
  errors: { participante: string; error: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class CertificadoService {
  private http = inject(HttpClient);
  private adminApiUrl = `${environment.apiUrl}/api/admin/certificados`;
  private publicApiUrl = `${environment.apiUrl}/public`;

  /**
   * Obtiene una lista de todos los certificados (solo para admin).
   */
  getAll(): Observable<Certificado[]> {
    return this.http.get<Certificado[]>(this.adminApiUrl);
  }

  /**
   * Crea un nuevo certificado para una inscripción existente.
   */
  create(certificado: CertificadoCreate): Observable<Certificado> {
    return this.http.post<Certificado>(this.adminApiUrl, certificado);
  }

  /**
   * Elimina un certificado por su ID.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminApiUrl}/${id}`);
  }

  /**
   * Llama al endpoint público para verificar un certificado por su folio.
   */
  verifyPublic(folio: string): Observable<CertificadoPublic> {
    return this.http.get<CertificadoPublic>(`${this.publicApiUrl}/verificar/${folio}`);
  }

  /**
   * Solicita al backend que reenvíe un certificado por correo.
   */
  sendEmail(certificadoId: number): Observable<any> {
    return this.http.post(`${this.adminApiUrl}/send-email/${certificadoId}`, {});
  }

  /**
   * Llama al endpoint del backend para la emisión y envío masivo de constancias.
   */
  emitirYEnviarMasivamente(productoId: number): Observable<BulkIssuanceResponse> {
    return this.http.post<BulkIssuanceResponse>(`${this.adminApiUrl}/emitir-masivamente/${productoId}`, {});
  }
}