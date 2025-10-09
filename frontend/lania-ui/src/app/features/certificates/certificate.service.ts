import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CertificateDTO } from '../../shared/interfaces/certificate.interfaces';

// Interfaz para la solicitud de emisión individual (sin cambios)
export interface CertificateIssueRequest {
  course_id: number;
  entity_id: number; // ID del participante O del docente
  kind: string;
}

// --- CAMBIO 1: Interfaz para el CUERPO de la petición masiva ---
// Define claramente qué datos se envían al backend.
export interface BulkIssuePayload {
  participant_ids: number[];
  docente_ids?: number[]; // Nuevos IDs para docentes
  with_competencies: boolean;
}

// --- CAMBIO 2: Interfaz para la RESPUESTA de la petición masiva ---
// Debe coincidir exactamente con el JSON que devuelve tu backend.
export interface BulkIssueResponse {
  success: { participant_name: string; serial: string }[];
  errors: { id?: number; name?: string; error: string }[];
}

@Injectable({ providedIn: 'root' })
export class CertificateService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/admin/certificates`; // URL base correcta

  list(): Observable<CertificateDTO[]> {
    return this.http.get<CertificateDTO[]>(this.apiUrl);
  }

  issueForParticipant(data: CertificateIssueRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/issue-for-participant`, data);
  }

  issueForDocente(data: CertificateIssueRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/issue-for-docente`, data);
  }

  // --- CAMBIO 3: Método para la emisión masiva CORREGIDO ---
  // Se ajusta la URL, el nombre del método y los parámetros para que sea más claro y funcional.
  issueBulkCertificates(courseId: number, payload: BulkIssuePayload): Observable<BulkIssueResponse> {
    // La URL correcta debe ser: /api/admin/certificates/{courseId}/issue-bulk
    return this.http.post<BulkIssueResponse>(`${this.apiUrl}/${courseId}/issue-bulk`, payload);
  }

  downloadBySerial(serial: string): void {
    window.open(`${environment.apiUrl}/v/serial/${serial}/pdf`, '_blank');
  }

  verifyByToken(token: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/v/t/${token}`);
  }

  listByCourse(courseId: number): Observable<CertificateDTO[]> {
    return this.http.get<CertificateDTO[]>(`${environment.apiUrl}/api/admin/courses/${courseId}/certificates`);
  }
}