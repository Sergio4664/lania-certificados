import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private base = environment.apiBase;

  // TODO en FastAPI: POST /api/notifications/email
  sendEmail(payload: {to:string; subject:string; html:string}) {
    return this.http.post(`${this.base}/api/notifications/email`, payload);
  }

  // TODO en FastAPI: POST /api/notifications/whatsapp
  sendWhatsApp(payload: {to:string; message:string}) {
    return this.http.post(`${this.base}/api/notifications/whatsapp`, payload);
  }
}
