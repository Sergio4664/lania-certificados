import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// --- Se usan las interfaces que tú proporcionaste ---
import { ParticipantDTO, CreateParticipantDTO, UpdateParticipantDTO } from '@app/shared/interfaces/participant.interfaces';

@Injectable({ providedIn: 'root' })
export class ParticipantService {
  private http = inject(HttpClient);
  // Se corrige la URL base y se añade la barra al final
  private apiUrl = `${environment.apiUrl}/api/admin/participants/`;

  /**
   * Obtiene la lista completa de todos los participantes.
   */
  getParticipants(): Observable<ParticipantDTO[]> {
    return this.http.get<ParticipantDTO[]>(this.apiUrl);
  }

  /**
   * Obtiene un participante por su ID.
   * @param id - El ID del participante a buscar.
   */
  getParticipantById(id: number): Observable<ParticipantDTO> {
    return this.http.get<ParticipantDTO>(`${this.apiUrl}${id}`);
  }

  /**
   * Crea un nuevo participante.
   * @param participantData - Los datos del nuevo participante.
   */
  createParticipant(participantData: CreateParticipantDTO): Observable<ParticipantDTO> {
    return this.http.post<ParticipantDTO>(this.apiUrl, participantData);
  }

  /**
   * Actualiza un participante existente.
   * @param id - El ID del participante a actualizar.
   * @param participantData - Los datos a modificar.
   */
  updateParticipant(id: number, participantData: UpdateParticipantDTO): Observable<ParticipantDTO> {
    return this.http.put<ParticipantDTO>(`${this.apiUrl}${id}`, participantData);
  }

  /**
   * Elimina un participante por su ID.
   * @param id - El ID del participante a eliminar.
   */
  deleteParticipant(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}`);
  }

  // --- MÉTODOS RELACIONADOS A CURSOS ---

  /**
   * Obtiene la lista de participantes inscritos en un curso específico.
   * @param courseId - El ID del curso.
   */
  listByCourse(courseId: number): Observable<ParticipantDTO[]> {
    // Apunta al endpoint correcto para obtener participantes de un curso
    return this.http.get<ParticipantDTO[]>(`${environment.apiUrl}/api/admin/courses/${courseId}/participants`);
  }

  /**
   * Sube un archivo (Excel/CSV) para inscribir participantes masivamente a un curso.
   * @param courseId - El ID del curso.
   * @param file - El archivo a subir.
   */
  importFromFile(courseId: number, file: File): Observable<ParticipantDTO[]> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    // Apunta al endpoint correcto para la importación
    return this.http.post<ParticipantDTO[]>(`${environment.apiUrl}/api/admin/courses/${courseId}/upload-participants/`, formData);
  }
}