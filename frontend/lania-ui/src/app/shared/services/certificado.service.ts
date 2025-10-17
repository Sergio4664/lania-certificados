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
  // ✅ CORRECCIÓN: Se añade una barra al final de la URL base para evitar redirecciones.
  private adminApiUrl = `${environment.apiUrl}/api/admin/certificados/`;
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
    // La URL base ya tiene la barra, por lo que la llamada POST es correcta.
    return this.http.post<Certificado>(this.adminApiUrl, certificado);
  }

  /**
   * Elimina un certificado por su ID.
   */
  delete(id: number): Observable<void> {
    // Se construye la URL como: .../certificados/123
    return this.http.delete<void>(`${this.adminApiUrl}${id}`);
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
    // Esta ruta puede necesitar una barra al final dependiendo de tu router.
    // La añadimos por consistencia.
    return this.http.post(`${this.adminApiUrl}send-email/${certificadoId}/`, {});
  }

  /**
   * Llama al endpoint del backend para la emisión y envío masivo de constancias.
   */
  emitirYEnviarMasivamente(productoId: number): Observable<BulkIssuanceResponse> {
    // ✅ CORRECCIÓN: Ruta completa con barra al final para coincidir con el backend.
    return this.http.post<BulkIssuanceResponse>(`${this.adminApiUrl}emitir-masivamente/${productoId}/`, {});
  }
}