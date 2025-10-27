import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { CertificadoPublico } from '@app/shared/interfaces/verificacion.interface';

@Injectable({
  providedIn: 'root'
})
export class VerificacionService {

  private http = inject(HttpClient);
  // Usa la URL de la API definida en tu archivo de environment
  private apiUrl = `${environment.apiUrl}/public`; // Ruta base para las APIs públicas

  /**
   * Método público para verificar un certificado por su folio.
   * No requiere autenticación.
   * @param folio El folio del certificado a verificar.
   * @returns Observable con los datos públicos del certificado.
   */
  verificarPorFolio(folio: string) {
    // Llama al endpoint: /api/public/verificar/FOLIO-BUSCADO
    return this.http.get<CertificadoPublico>(`${this.apiUrl}/verificar/${folio}`);
  }

}