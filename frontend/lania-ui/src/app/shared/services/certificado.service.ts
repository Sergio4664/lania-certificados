//Ruta: frontend/lania-ui/src/app/shared/services/certificado.service.ts
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
   * (Usado por el modal de 'Productos Educativos' para refrescar su lista).
   */
  getAll(): Observable<Certificado[]> {
    // ✅ CORRECCIÓN: Añadir parámetros "cache-busting" para evitar caché del navegador
    const params = { v: new Date().getTime().toString() };
    return this.http.get<Certificado[]>(this.apiUrl, { params });
  }

  // --- MÉTODOS AÑADIDOS PARA EL DASHBOARD ---
  
  /**
   * Obtiene la lista de certificados específicos de Participantes.
   * (Usado por la primera tabla del dashboard).
   */
  getCertificadosParticipantes(): Observable<Certificado[]> {
    // ✅ CORRECCIÓN: Añadir parámetros "cache-busting"
    const params = { v: new Date().getTime().toString() };
    return this.http.get<Certificado[]>(`${this.apiUrl}/participantes`, { params });
  }

  /**
   * Obtiene la lista de certificados específicos de Docentes.
   * (Usado por la segunda tabla del dashboard).
   */
  getCertificadosDocentes(): Observable<Certificado[]> {
    // ✅ CORRECCIÓN: Añadir parámetros "cache-busting"
    const params = { v: new Date().getTime().toString() };
    return this.http.get<Certificado[]>(`${this.apiUrl}/docentes`, { params });
  }

  // --- MÉTODO NUEVO PARA EL BOTÓN "👁️" ---
  /**
   * Obtiene el archivo PDF de un certificado (participante O docente) como un Blob.
   * Llama al endpoint unificado /download/{folio}
   */
  getCertificadoBlob(folio: string): Observable<Blob> {
    // Este no necesita "cache-buster" porque el folio es único
    return this.http.get(`${this.apiUrl}/download/${folio}`, { responseType: 'blob' });
  }
  
  // --- MÉTODOS ORIGINALES DE GESTIÓN ---

  /**
   * Crea un nuevo certificado para un participante.
   * @param data - El payload que incluye el 'inscripcion_id' y 'con_competencias'.
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
   * Reenvía un certificado por email.
   * @param certificadoId - El ID del certificado a enviar.
   * @param emailType - El tipo de email al que se enviará (personal o institucional).
   */
  sendEmail(certificadoId: number, emailType: 'institucional' | 'personal'): Observable<any> {
    // El backend determina el email correcto basado en el tipo de certificado (docente/participante).
    // El argumento emailType se mantiene por compatibilidad, pero el backend podría no usarlo.
    return this.http.post(`${this.apiUrl}/${certificadoId}/enviar`, { email_type: emailType });
  }

  /**
   * Inicia el proceso de emisión y envío masivo para todos los participantes de un producto educativo.
   * @param productoId - El ID del producto educativo.
   */
  emitirYEnviarMasivamente(productoId: number): Observable<EmisionMasivaResponse> {
    const url = `${environment.apiUrl}/admin/certificados/emitir-enviar-masivo/producto/${productoId}`;
    return this.http.post<EmisionMasivaResponse>(url, {});
  }
}