import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';
// ✅ --- CORRECCIÓN: Importamos la interfaz con el nombre correcto ---
import { CertificadoPublic } from '@app/shared/interfaces/certificado.interface'; 

@Injectable({
  providedIn: 'root'
})
export class VerificacionService {

  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/public`; 

  verificarPorFolio(folio: string) {
    // ✅ --- CORRECCIÓN: Usamos el nombre de interfaz correcto ---
    return this.http.get<CertificadoPublic>(`${this.apiUrl}/verificar/${folio}`);
  }

}