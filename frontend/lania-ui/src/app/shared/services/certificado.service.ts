//Ruta: frontend/lania-ui/src/app/shared/services/certificado.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Asumiremos que estas interfaces se crearán en /shared/interfaces/
import { Certificado, CertificadoCreate, CertificadoPublic } from '@shared/interfaces/certificado.interface';

export interface BulkIssuanceResponse {
  success: { participante: string; folio: string }[];
  errors: { participante: string; error: string }[];
}


@Injectable({
  providedIn: 'root'
})
export class CertificadoService {
  private http = inject(HttpClient);
  // Se ajusta la URL para que coincida con la ruta base de los endpoints de certificados en el backend.
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
   * @param certificado - El objeto con los datos del certificado a crear.
   */
  create(certificado: CertificadoCreate): Observable<Certificado> {
    return this.http.post<Certificado>(this.adminApiUrl, certificado);
  }

  /**
   * Elimina un certificado por su ID.
   * @param id - El ID del certificado a eliminar.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminApiUrl}/${id}`);
  }

  /**
   * Llama al endpoint público para verificar un certificado por su folio.
   * @param folio - El folio a verificar.
   */
  verifyPublic(folio: string): Observable<CertificadoPublic> {
    return this.http.get<CertificadoPublic>(`${this.publicApiUrl}/verificar/${folio}`);
  }

  /**
   * Solicita al backend que envíe un certificado por correo.
   * @param certificadoId - El ID del certificado a enviar.
   */
  sendEmail(certificadoId: number): Observable<any> {
    return this.http.post(`${this.adminApiUrl}/send-email/${certificadoId}`, {});
  }

  /**
   * Llama al endpoint del backend para iniciar la emisión y envío masivo de constancias
   * para un producto educativo específico.
   * @param productoId El ID del producto educativo.
   */
  emitirYEnviarMasivamente(productoId: number): Observable<BulkIssuanceResponse> {
    // Este método llama al nuevo endpoint creado en el backend.
    return this.http.post<BulkIssuanceResponse>(`${this.adminApiUrl}/emitir-masivamente/${productoId}`, {});
  }
}