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
   * (Este método puede o no ser usado por el dashboard, 
   * pero lo mantenemos por si es usado en otra parte).
   */
  getAll(): Observable<Certificado[]> {
    // 💡 CORRECCIÓN de sintaxis: this.apiUrl
    return this.http.get<Certificado[]>(this.apiUrl);
  }

  // --- MÉTODOS AÑADIDOS PARA EL DASHBOARD ---
  
  /**
   * Obtiene la lista de certificados específicos de Participantes.
   * (Usado por la primera tabla del dashboard).
   */
  getCertificadosParticipantes(): Observable<Certificado[]> {
    // 💡 CORRECCIÓN de sintaxis: this.apiUrl
    return this.http.get<Certificado[]>(`${this.apiUrl}/participantes`);
  }

  /**
   * Obtiene la lista de certificados específicos de Docentes.
   * (Usado por la segunda tabla del dashboard).
   */
  getCertificadosDocentes(): Observable<Certificado[]> {
    // 💡 CORRECCIÓN de sintaxis: this.apiUrl
    return this.http.get<Certificado[]>(`${this.apiUrl}/docentes`);
  }

  // --- 💡 MÉTODO NUEVO PARA EL BOTÓN "👁️" ---
  /**
   * Obtiene el archivo PDF de un certificado (participante O docente) como un Blob.
   * Llama al endpoint unificado /download/{folio}
   */
  getCertificadoBlob(folio: string): Observable<Blob> {
    // 💡 CORRECCIÓN de sintaxis: this.apiUrl
    return this.http.get(`${this.apiUrl}/download/${folio}`, { responseType: 'blob' });
  }
  
  // --- (Métodos downloadCertificado y downloadCertificadoDocente eliminados) ---

  // --- MÉTODOS ORIGINALES DE GESTIÓN ---

  /**
   * Crea un nuevo certificado para un participante (constancia normal).
   * @param data - El payload que incluye el 'inscripcion_id' y 'producto_educativo_id'.
   */
  createForParticipant(data: CertificadoCreate): Observable<Certificado> {
    // 💡 CORRECCIÓN de sintaxis: this.apiUrl
    return this.http.post<Certificado>(`${this.apiUrl}/participante`, data);
  }

  /**
   * Crea un nuevo certificado para un docente (ponente).
   * @param data - El payload que incluye el 'docente_id' y 'producto_educativo_id'.
   */
  createForDocente(data: CertificadoCreate): Observable<Certificado> {
    // 💡 CORRECCIÓN de sintaxis: this.apiUrl
    return this.http.post<Certificado>(`${this.apiUrl}/docente`, data);
  }

  /**
   * Elimina un certificado por su ID.
   * @param id - El ID del certificado a eliminar.
   */
  delete(id: number): Observable<void> {
    // 💡 CORRECCIÓN de sintaxis: this.apiUrl
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * 💡 CORRECCIÓN PARA ARREGLAR COMPILACIÓN DE 'admin-productos-educativos'
   * Volvemos a aceptar 2 argumentos, aunque el backend solo usa el primero.
   * @param certificadoId - El ID del certificado a enviar.
   * @param emailType - (Ignorado por el backend, pero requerido por 'admin-productos-educativos')
   */
  sendEmail(certificadoId: number, emailType: 'institucional' | 'personal'): Observable<any> {
    // 💡 CORRECCIÓN de sintaxis: this.apiUrl
    // El backend ignora el body, pero lo enviamos vacío para que la llamada POST sea válida.
    return this.http.post(`${this.apiUrl}/${certificadoId}/enviar`, {});
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