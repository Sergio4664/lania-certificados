import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Importaremos las interfaces que definiremos a continuación
import { Inscripcion, InscripcionCreate } from '@shared/interfaces/inscripcion.interface';

@Injectable({
  providedIn: 'root'
})
export class InscripcionService {
  private http = inject(HttpClient);
  
  // ✅ CORRECCIÓN AQUÍ: Se añadió el prefijo '/api' a la URL.
  private apiUrl = `${environment.apiUrl}/api/admin/inscripciones`;

  /**
   * Obtiene una lista de todas las inscripciones.
   */
  getAll(): Observable<Inscripcion[]> {
    return this.http.get<Inscripcion[]>(this.apiUrl);
  }

  /**
   * Obtiene las inscripciones para un producto educativo específico.
   * @param productoId - ID del producto educativo.
   */
  getByProductoId(productoId: number): Observable<Inscripcion[]> {
    return this.http.get<Inscripcion[]>(`${this.apiUrl}/producto/${productoId}`);
  }

  /**
   * Crea una nueva inscripción.
   * @param inscripcion - Datos de la nueva inscripción.
   */
  create(inscripcion: InscripcionCreate): Observable<Inscripcion> {
    return this.http.post<Inscripcion>(this.apiUrl, inscripcion);
  }

  /**
   * Elimina una inscripción por su ID.
   * @param id - ID de la inscripción a eliminar.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Sube un archivo de participantes para inscribirlos masivamente en un producto.
   * @param productoId - ID del producto donde se inscribirán.
   * @param file - El archivo (CSV o Excel) con los datos de los participantes.
   */
  uploadAndEnroll(productoId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    // Nota: Asegúrate de que esta ruta coincida con la de tu backend para subir archivos.
    // La hemos dejado como estaba, pero si tienes problemas, es posible que también necesite el prefijo /api.
    return this.http.post<any>(`${this.apiUrl}/producto/${productoId}/upload-participantes/`, formData);
  }
}