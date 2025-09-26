import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CertificateDTO } from '../../shared/interfaces/certificate.interfaces';

// --- CAMBIO 1: Interfaz unificada para la solicitud ---
// Esta interfaz reemplaza a CreateCertificateDTO y CreateDocenteCertificateDTO.
export interface CertificateIssueRequest {
  course_id: number;
  entity_id: number; // ID del participante O del docente
  kind: string;
}

// Interfaz para la respuesta del endpoint masivo (sin cambios)
export interface BulkIssueResponse {
  issued: number;
  skipped: number;
  errors: string[];
  message: string;
}

@Injectable({ providedIn: 'root' })
export class CertificateService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/admin/certificates`; // URL base para los certificados

  list(): Observable<CertificateDTO[]> {
    return this.http.get<CertificateDTO[]>(this.apiUrl);
  }

  // --- CAMBIO 2: Función para participantes actualizada ---
  // Se renombró de 'issue' a 'issueForParticipant' y usa la nueva URL e interfaz.
  issueForParticipant(data: CertificateIssueRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/issue-for-participant`, data);
  }

  // --- CAMBIO 3: Función para docentes actualizada ---
  // Ahora usa la nueva interfaz unificada.
  issueForDocente(data: CertificateIssueRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/issue-for-docente`, data);
  }

  // Método para la emisión masiva (sin cambios funcionales)
  issueBulk(courseId: number, participantIds: number[], docenteIds: number[], withCompetencies: boolean): Observable<BulkIssueResponse> {
    const payload = {
      participant_ids: participantIds,
      with_competencies: withCompetencies,
    };
    // Apunta a la URL correcta del curso, no a la de certificados
    return this.http.post<BulkIssueResponse>(`${environment.apiUrl}/api/admin/courses/${courseId}/issue-bulk-certificates`, payload);
  }

  downloadBySerial(serial: string): void {
    window.open(`${environment.apiUrl}/v/serial/${serial}/pdf`, '_blank');
  }

  verifyByToken(token: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/v/t/${token}`);
  }

  // Legacy methods (sin cambios)
  listByCourse(courseId: number): Observable<CertificateDTO[]> {
    return this.http.get<CertificateDTO[]>(`${environment.apiUrl}/api/admin/courses/${courseId}/certificates`);
  }
}
