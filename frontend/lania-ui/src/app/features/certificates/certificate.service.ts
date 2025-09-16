// src/app/features/certificates/certificate.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CertificateDTO, CreateCertificateDTO } from '../../shared/interfaces/certificate.interfaces';

//Interfaz para la respuesta del endpoint masivo
export interface BulkIssueResponse {
  issued: number;
  skipped: number;
  errors: string[];
  message: string;
}

@Injectable({ providedIn: 'root' })
export class CertificateService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl; // Cambiar de apiBase a apiUrl

  list(): Observable<CertificateDTO[]> {
    return this.http.get<CertificateDTO[]>(`${this.apiUrl}/api/admin/certificates`);
  }

  issue(data: CreateCertificateDTO): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/admin/certificates/issue`, data);
  }

  //Método para le emisión masiva
  issueBulk(courseId: number, participantIds: number[], withCompetencies: boolean): Observable<BulkIssueResponse> {
    const payload = {
      participant_ids: participantIds,
      with_competencies: withCompetencies
    };
    return this.http.post<BulkIssueResponse>(`${this.apiUrl}/api/admin/courses/${courseId}/issue-bulk-certificates`, payload);
  }

  downloadBySerial(serial: string): void {
    window.open(`${this.apiUrl}/v/serial/${serial}/pdf`, '_blank');
  }

  verifyByToken(token: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/v/t/${token}`);
  }

  // Legacy methods
  listByCourse(courseId: number): Observable<CertificateDTO[]> {
    return this.http.get<CertificateDTO[]>(`${this.apiUrl}/api/admin/courses/${courseId}/certificates`);
  }
}
