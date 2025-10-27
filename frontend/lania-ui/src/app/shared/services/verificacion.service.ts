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
  private apiUrl = `${environment.apiUrl}/public`;

  constructor() { }

  // --- CORRECCIÓN 2: Cambia el tipo de retorno aquí ---
  verificarPorFolio(folio: string): Observable<CertificadoPublico> { 
    // Y también cambia el tipo genérico de la petición http
    return this.http.get<CertificadoPublico>(`${this.apiUrl}/verificar/${folio}`);
  }
}