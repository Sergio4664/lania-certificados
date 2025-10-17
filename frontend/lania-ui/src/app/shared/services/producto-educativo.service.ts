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
  // ✅ CORRECCIÓN: Se añadió el prefijo /api a la URL.
  private apiUrl = `${environment.apiUrl}/api/admin/productos-educativos`;

  getAll(): Observable<ProductoEducativo[]> {
    return this.http.get<ProductoEducativo[]>(this.apiUrl);
  }

  create(producto: ProductoEducativoCreate): Observable<ProductoEducativo> {
    return this.http.post<ProductoEducativo>(this.apiUrl, producto);
  }

  update(id: number, producto: ProductoEducativoUpdate): Observable<ProductoEducativo> {
    return this.http.put<ProductoEducativo>(`${this.apiUrl}/${id}`, producto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
  
  uploadParticipants(id: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/${id}/upload-participants`, formData);
  }
}