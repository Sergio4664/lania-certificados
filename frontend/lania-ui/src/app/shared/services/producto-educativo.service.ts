//Ruta: frontend/lania-ui/src/app/shared/services/producto-educativo.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

// --- 💡 CORRECCIÓN 1: Importar la interfaz que falta ---
import { 
  ProductoEducativo, 
  ProductoEducativoCreate, 
  ProductoEducativoUpdate, 
  ProductoEducativoWithDetails 
} from '@shared/interfaces/producto-educativo.interface';

@Injectable({
  providedIn: 'root'
})
export class ProductoEducativoService {
  private http = inject(HttpClient);
  // Dejamos la URL base sin la barra al final
  private baseUrl = `${environment.apiUrl}/admin/productos-educativos`;

  getAll(): Observable<ProductoEducativo[]> {
    // --- ✨ CORRECCIÓN DE REDIRECCIÓN (307): Añadimos la barra al final ---
    return this.http.get<ProductoEducativo[]>(`${this.baseUrl}/`);
  }

  // --- 💡 CORRECCIÓN 2: Añadir el método que faltaba ---
  // Este método es llamado por 'admin-certificados.component.ts'
  // (Asegúrate que la ruta '/with-details' coincida con tu endpoint de backend)
  getAllProductosWithDetails(): Observable<ProductoEducativoWithDetails[]> {
    
    // --- ✨ SOLUCIÓN AL PROBLEMA DE CACHÉ ---
    // Añadimos un parámetro 'v' (de "versión") con la fecha actual.
    // Esto hace que la URL sea única en cada petición 
    // (ej: .../with-details?v=123456789)
    // y obliga al navegador a no usar la caché y pedir los datos frescos.
    const params = { v: new Date().getTime() };
    
    return this.http.get<ProductoEducativoWithDetails[]>(`${this.baseUrl}/with-details`, { params });
  }
  // --- FIN DE LA CORRECCIÓN ---

  create(producto: ProductoEducativoCreate): Observable<ProductoEducativo> {
    // --- ✨ CORRECCIÓN DE REDIRECCIÓN (307): Añadimos la barra al final ---
    return this.http.post<ProductoEducativo>(`${this.baseUrl}/`, producto);
  }

  update(id: number, producto: ProductoEducativoUpdate): Observable<ProductoEducativo> {
    // Esta ruta ya es correcta (ej: .../productos-educativos/8)
    return this.http.put<ProductoEducativo>(`${this.baseUrl}/${id}`, producto);
  }

  delete(id: number): Observable<void> {
    // Esta ruta ya es correcta (ej: .../productos-educativos/8)
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
  
  uploadParticipants(id: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    // Esta ruta ya es correcta
    return this.http.post(`${this.baseUrl}/${id}/upload-participantes`, formData);
  }
}