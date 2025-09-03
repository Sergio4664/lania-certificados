// src/app/features/certificates/certificate.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CertificateDTO, CreateCertificateDTO } from '../../shared/interfaces/certificate.interfaces';

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
