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

  constructor(){ }


  /**
   * Muestra una notificación de éxito.
   * Puedes reemplazar el alert() con tu librería de notificaciones preferida.
   * @param message El mensaje a mostrar.
   */
  showSuccess(message: string): void {
    // Ejemplo simple con alert. ¡Puedes mejorarlo!
    alert(`Éxito: ${message}`);
  }

  /**
   * Muestra una notificación de error.
   * Puedes reemplazar el alert() con tu librería de notificaciones preferida.
   * @param message El mensaje a mostrar.
   */
  showError(message: string): void {
    // Ejemplo simple con alert. ¡Puedes mejorarlo!
    console.error(message); // También es útil registrar el error en la consola
    alert(`Error: ${message}`);
  }

}
