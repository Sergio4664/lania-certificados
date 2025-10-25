import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { CertificadoPublic } from '../interfaces/certificado.interface'; // Reutilizamos la interfaz existente

@Injectable({
  providedIn: 'root'
})
export class VerificacionService {
  private http = inject(HttpClient);
  // URL base para el endpoint público de verificación
  private apiUrl = `${environment.apiUrl}/verify`; 

  /**
   * Verifica un certificado por su folio.
   * Llama al endpoint público del backend.
   * @param folio - El folio del certificado a verificar.
   */
  verificarPorFolio(folio: string): Observable<CertificadoPublic> {
    return this.http.get<CertificadoPublic>(`${this.apiUrl}/${folio}`);
  }
}
