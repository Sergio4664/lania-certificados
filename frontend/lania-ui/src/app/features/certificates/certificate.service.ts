// src/app/features/certificates/certificate.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CertificateService {
  private http = inject(HttpClient);
  private base = environment.apiBase;

  // TODO en FastAPI: GET /api/admin/courses/:id/certificates
  listByCourse(courseId: number) {
    return this.http.get<any[]>(`${this.base}/api/admin/courses/${courseId}/certificates`);
  }

  downloadBySerial(serial: string) {
    window.open(`${this.base}/v/serial/${serial}/pdf`, '_blank');
  }
}
