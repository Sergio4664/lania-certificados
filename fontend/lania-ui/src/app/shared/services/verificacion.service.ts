//Ruta: frontend/lania-ui/src/app/shared/services/verificacion.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

// --- CORRECCIÓN 1: Importa la interfaz correcta ("...Publico" con "o") ---
import { CertificadoPublico } from '@app/shared/interfaces/verificacion.interface';

@Injectable({
  providedIn: 'root'
})
export class VerificacionService {

  private http = inject(HttpClient);
  // Se asume que environment.apiUrl es '/api/v1' o la URL completa del backend
  private apiUrl = `${environment.apiUrl}/public`; 

  constructor() { }

  /**
   * Llama al endpoint de la API para verificar los datos públicos del certificado.
   * @param folio El folio de verificación del certificado.
   * @returns Un Observable que emite los datos del certificado o un error 404.
   */
  verificarPorFolio(folio: string): Observable<CertificadoPublico> { 
    // URL: /api/v1/public/verificar/{folio}
    return this.http.get<CertificadoPublico>(`${this.apiUrl}/verificar/${folio}`);
  }

    /**
     * Obtiene el archivo PDF de un certificado a través de su folio de verificación.
     * @param folio El folio de verificación del certificado.
     * @returns Un Observable que emite un Blob (el archivo PDF).
     */
    getCertificadoPdf(folio: string): Observable<Blob> {
        // URL: /api/v1/public/certificado/{folio}/pdf
        return this.http.get(`${this.apiUrl}/certificado/${folio}/pdf`, {
            responseType: 'blob' 
        });
    }
}