// ruta: frontend/lania-ui/src/app/shared/services/certificado.service.ts
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
  // La URL base para todas las operaciones de certificados.
  private apiUrl = `${environment.apiUrl}/admin/certificados`;

  /**
   * Obtiene todos los certificados del sistema.
   */
  getAll(): Observable<Certificado[]> {
    return this.http.get<Certificado[]>(this.apiUrl);
  }
  
  /**
   * Crea un nuevo certificado para un participante (constancia normal).
   * @param data - El payload que incluye el 'inscripcion_id' y 'producto_educativo_id'.
   */
  createForParticipant(data: CertificadoCreate): Observable<Certificado> {
    return this.http.post<Certificado>(`${this.apiUrl}/participante`, data);
  }

  /**
   * Crea un nuevo certificado para un docente (ponente).
   * @param data - El payload que incluye el 'docente_id' y 'producto_educativo_id'.
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
   * @param emailType - El tipo de email al que se enviará ('institucional' o 'personal').
   */
  // ✅ CORRECCIÓN APLICADA AQUÍ
  sendEmail(certificadoId: number, emailType: 'institucional' | 'personal'): Observable<any> {
    const body = { email_type: emailType };
    return this.http.post(`${this.apiUrl}/${certificadoId}/enviar`, body);
  }

  /**
   * Inicia el proceso de emisión y envío masivo para todos los participantes de un producto educativo.
   * @param productoId - El ID del producto educativo.
   */
  emitirYEnviarMasivamente(productoId: number): Observable<EmisionMasivaResponse> {
    // Nota: Asegúrate de que este endpoint exista en tu backend si planeas usarlo.
    const url = `${environment.apiUrl}/admin/certificados/emitir-enviar-masivo/producto/${productoId}`;
    return this.http.post<EmisionMasivaResponse>(url, {});
  }
}