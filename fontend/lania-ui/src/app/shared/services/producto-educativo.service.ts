import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

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

    // Prefijo correcto para los endpoints protegidos
    private baseUrl = `${environment.apiUrl}/admin/productos-educativos/`;

    // ================================
    // CRUD
    // ================================

    getAll(): Observable<ProductoEducativo[]> {
        return this.http.get<ProductoEducativo[]>(this.baseUrl);
    }

    getAllProductosWithDetails(): Observable<ProductoEducativoWithDetails[]> {
        const params = { v: new Date().getTime() };
        return this.http.get<ProductoEducativoWithDetails[]>(`${this.baseUrl}with-details`, { params });
    }

    getById(id: number): Observable<ProductoEducativoWithDetails> {
        const params = { v: new Date().getTime() };
        return this.http.get<ProductoEducativoWithDetails>(`${this.baseUrl}${id}`, { params });
    }

    create(producto: ProductoEducativoCreate): Observable<ProductoEducativo> {
        return this.http.post<ProductoEducativo>(this.baseUrl, producto);
    }

    update(id: number, producto: ProductoEducativoUpdate): Observable<ProductoEducativo> {
        return this.http.put<ProductoEducativo>(`${this.baseUrl}${id}`, producto);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}${id}`);
    }

    // ================================
    // ARCHIVOS (PROTEGIDOS)
    // ================================
    
    uploadParticipants(id: number, file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post(`${this.baseUrl}${id}/upload-participantes`, formData);
    }

    // ================================
    // DESCARGA DE PLANTILLA (NO REQUIERE TOKEN)
    // ================================

    downloadTemplate(): Observable<Blob> {
        return this.http.get(
            `${environment.apiUrl}/public/plantilla-participantes`,
            {
                responseType: 'blob'
            }
        );
    }
}
