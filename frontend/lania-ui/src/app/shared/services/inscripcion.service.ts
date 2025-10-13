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
  private apiUrl = `${environment.apiUrl}/api/admin/inscripciones`;

  /**
   * Obtiene una lista de todas las inscripciones.
   * NOTA: Este endpoint debe existir en el backend. Si no, necesitaríamos un método
   * como getByProductoId para cargar las inscripciones por producto.
   */
  getAll(): Observable<Inscripcion[]> {
    // Por ahora, asumimos que un endpoint general es necesario.
    // Si no lo tienes, puedes cambiar esto para que llame a `getByProductoId` donde sea necesario.
    // O podrías tener un endpoint en el backend que devuelva todas las inscripciones.
    // Por simplicidad para el componente de certificados, agregaremos un endpoint / en el backend router.
    // Lo más probable es que tu router `admin_inscripciones` no tenga un GET a `/`. 
    // Por favor, añade uno que devuelva todas las inscripciones.
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

    return this.http.post<any>(`${this.apiUrl}/producto/${productoId}/upload-participantes/`, formData);
  }
}
