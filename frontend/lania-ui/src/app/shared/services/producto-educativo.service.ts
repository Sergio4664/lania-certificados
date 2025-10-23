//Ruta: frontend/lania-ui/src/app/shared/services/producto-educativo.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { ProductoEducativo, ProductoEducativoCreate, ProductoEducativoUpdate } from '@shared/interfaces/producto-educativo.interface';

@Injectable({
  providedIn: 'root'
})
export class ProductoEducativoService {
  private http = inject(HttpClient);
  // ✅ CORRECTION: The base URL for this service
  private baseUrl = `${environment.apiUrl}/admin/productos-educativos`;

  getAll(): Observable<ProductoEducativo[]> {
    return this.http.get<ProductoEducativo[]>(this.baseUrl);
  }

  create(producto: ProductoEducativoCreate): Observable<ProductoEducativo> {
    return this.http.post<ProductoEducativo>(this.baseUrl, producto);
  }

  update(id: number, producto: ProductoEducativoUpdate): Observable<ProductoEducativo> {
    return this.http.put<ProductoEducativo>(`${this.baseUrl}/${id}`, producto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
  
  uploadParticipants(id: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    // --- ⬇️ AQUÍ ESTÁ LA CORRECCIÓN ⬇️ ---
    return this.http.post(`${this.baseUrl}/${id}/upload-participantes`, formData);
  }
}