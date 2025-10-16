import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Asumiremos que estas interfaces se crearán en /shared/interfaces/
import { Certificado, CertificadoCreate, CertificadoPublic } from '@shared/interfaces/certificado.interface';

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
    // --- CORRECCIÓN AQUÍ ---
    // Se añadió la diagonal (/) antes del ID del certificado.
    return this.http.post(`${this.adminApiUrl}/send-email/${certificadoId}`, {});
  }
}