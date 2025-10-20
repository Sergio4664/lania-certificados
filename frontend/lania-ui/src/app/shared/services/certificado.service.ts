import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Certificado, CertificadoCreate, EmisionMasivaResponse } from '../interfaces/certificado.interface';

@Injectable({
  providedIn: 'root'
})
export class CertificadoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/certificados`;

  /**
   * Obtiene todos los certificados del sistema.
   */
  getAll(): Observable<Certificado[]> {
    return this.http.get<Certificado[]>(this.apiUrl);
  }
  
  /**
   * Crea un nuevo certificado para un participante a través de su inscripción.
   * @param data - El payload que incluye el 'inscripcion_id'.
   */
  createForParticipant(data: CertificadoCreate): Observable<Certificado> {
    return this.http.post<Certificado>(`${this.apiUrl}/participante`, data);
  }

  /**
   * Crea un nuevo certificado para un docente (ponente).
   * @param data - El payload que incluye el 'docente_id'.
   */
  createForDocente(data: CertificadoCreate): Observable<Certificado> {
    return this.http.post<Certificado>(`${this.apiUrl}/docente`, data);
  }

  /**
   * Elimina un certificado por su ID.
   * @param id - El ID del certificado a eliminar.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Solicita al backend que envíe un certificado por correo electrónico.
   * @param certificadoId - El ID del certificado a enviar.
   */
  sendEmail(certificadoId: number): Observable<any> {
    // ✅ --- CORRECCIÓN DE SINTAXIS ---
    return this.http.post(`${this.apiUrl}/enviar/${certificadoId}`, {});
  }

  /**
   * Inicia el proceso de emisión y envío masivo para un producto educativo.
   * @param productoId - El ID del producto educativo.
   */
  emitirYEnviarMasivamente(productoId: number): Observable<EmisionMasivaResponse> {
    // ✅ --- CORRECCIÓN DE SINTAXIS ---
    const url = `${this.apiUrl}/emitir-enviar-masivo/producto/${productoId}`;
    return this.http.post<EmisionMasivaResponse>(url, {});
  }
}