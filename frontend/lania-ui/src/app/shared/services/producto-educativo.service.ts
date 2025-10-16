import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Asumiremos que estas interfaces se crearán en /shared/interfaces/producto-educativo.interface.ts
import { ProductoEducativo, ProductoEducativoCreate, ProductoEducativoUpdate } from '@shared/interfaces/producto-educativo.interface';

@Injectable({
  providedIn: 'root'
})
export class ProductoEducativoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/admin/productos-educativos`;

  /**
   * Obtiene una lista de todos los productos educativos.
   */
  getAll(): Observable<ProductoEducativo[]> {
    return this.http.get<ProductoEducativo[]>(this.apiUrl);
  }

  /**
   * Obtiene un producto educativo específico por su ID.
   * @param id - El ID del producto.
   */
  getById(id: number): Observable<ProductoEducativo> {
    return this.http.get<ProductoEducativo>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crea un nuevo producto educativo.
   * @param producto - El objeto con los datos del producto a crear.
   */
  create(producto: ProductoEducativoCreate): Observable<ProductoEducativo> {
    return this.http.post<ProductoEducativo>(this.apiUrl, producto);
  }

  /**
   * Actualiza un producto educativo existente.
   * @param id - El ID del producto a actualizar.
   * @param producto - El objeto con los datos a actualizar.
   */
  update(id: number, producto: ProductoEducativoUpdate): Observable<ProductoEducativo> {
    return this.http.put<ProductoEducativo>(`${this.apiUrl}/${id}`, producto);
  }

  /**
   * Elimina un producto educativo.
   * @param id - El ID del producto a eliminar.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  uploadParticipants(productoId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    
    // Apunta al nuevo endpoint del backend
    return this.http.post(`${this.apiUrl}/${productoId}/upload-participantes`, formData);
  }
  
}
