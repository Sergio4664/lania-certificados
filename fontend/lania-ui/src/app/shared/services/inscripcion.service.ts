import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

// Importaremos las interfaces que definiremos a continuación
import { Inscripcion, InscripcionCreate } from '@shared/interfaces/inscripcion.interface';

@Injectable({
  providedIn: 'root'
})
export class InscripcionService {
  private http = inject(HttpClient);
  
  // ✅ CORRECCIÓN CLAVE: Se añade la barra final '/' para evitar el error 404.
  // La ruta base es ahora: /api/v1/admin/inscripciones/
  private apiUrl = `${environment.apiUrl}/admin/inscripciones/`;

  /**
   * Obtiene una lista de todas las inscripciones.
   * Llama a: /api/v1/admin/inscripciones/
   */
  getAll(): Observable<Inscripcion[]> {
    return this.http.get<Inscripcion[]>(this.apiUrl);
  }

  /**
   * Obtiene las inscripciones para un producto educativo específico.
   * Llama a: /api/v1/admin/inscripciones/producto/{productoId}
   * @param productoId - ID del producto educativo.
   */
  getByProductoId(productoId: number): Observable<Inscripcion[]> {
    // ❌ CORREGIDO: Se eliminó la barra inicial '/' para evitar la doble barra.
    return this.http.get<Inscripcion[]>(`${this.apiUrl}producto/${productoId}`);
  }

  /**
   * Crea una nueva inscripción.
   * Llama a: /api/v1/admin/inscripciones/
   * @param inscripcion - Datos de la nueva inscripción.
   */
  create(inscripcion: InscripcionCreate): Observable<Inscripcion> {
    return this.http.post<Inscripcion>(this.apiUrl, inscripcion);
  }

  /**
   * Elimina una inscripción por su ID.
   * Llama a: /api/v1/admin/inscripciones/{id}
   * @param id - ID de la inscripción a eliminar.
   */
  delete(id: number): Observable<void> {
    // ❌ CORREGIDO: Se eliminó la barra inicial '/' para evitar la doble barra.
    return this.http.delete<void>(`${this.apiUrl}${id}`);
  }

  /**
   * Sube un archivo de participantes para inscribirlos masivamente en un producto.
   * Llama a: /api/v1/admin/inscripciones/producto/{productoId}/upload-participantes/
   * @param productoId - ID del producto donde se inscribirán.
   * @param file - El archivo (CSV o Excel) con los datos de los participantes.
   */
  uploadAndEnroll(productoId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    // ❌ CORREGIDO: Se eliminaron las barras innecesarias y se añadió la barra final si la API la requiere.
    return this.http.post<any>(`${this.apiUrl}producto/${productoId}/upload-participantes`, formData);
  }
}