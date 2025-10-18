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
   * Crea un nuevo certificado.
   * Este método es flexible y puede ser usado para crear certificados
   * tanto para participantes (a través de inscripción) como para docentes.
   * @param data - El payload para crear el certificado.
   */
  create(data: CertificadoCreate): Observable<Certificado> {
    return this.http.post<Certificado>(this.apiUrl, data);
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
    return this.http.post(`${this.apiUrl}/${certificadoId}/send-email`, {});
  }

  /**
   * Inicia el proceso de emisión y envío masivo para todas las inscripciones
   * de un producto educativo que aún no tengan un certificado.
   * @param productoId - El ID del producto educativo.
   */
  emitirYEnviarMasivamente(productoId: number): Observable<EmisionMasivaResponse> {
    const url = `${this.apiUrl}/producto/${productoId}/emitir-y-enviar-masivamente`;
    return this.http.post<EmisionMasivaResponse>(url, {});
  }
}