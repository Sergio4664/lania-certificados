import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Administrador, AdministradorCreate, AdministradorUpdate } from '@shared/interfaces/administrador.interface';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdministradorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/administradores`;

  constructor() { }

  /**
   * Obtiene todos los administradores.
   * @returns Observable<Administrador[]>
   */
  getAll(): Observable<Administrador[]> {
    return this.http.get<Administrador[]>(this.apiUrl);
  }

  /**
   * Crea un nuevo administrador.
   * @param adminData Datos del administrador a crear.
   * @returns Observable<Administrador>
   */
  create(adminData: AdministradorCreate): Observable<Administrador> {
    // Al crear, se envía el campo 'password'.
    return this.http.post<Administrador>(this.apiUrl, adminData);
  }

  /**
   * Actualiza un administrador existente.
   * @param id ID del administrador a actualizar.
   * @param adminData Datos a actualizar.
   * @returns Observable<Administrador>
   */
  update(id: number, adminData: AdministradorUpdate): Observable<Administrador> {
    // Al actualizar, el campo 'password' es opcional y se maneja en el backend.
    return this.http.put<Administrador>(`${this.apiUrl}/${id}`, adminData);
  }

  /**
   * Elimina un administrador por ID.
   * @param id ID del administrador a eliminar.
   * @returns Observable<void>
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
  
  /**
   * Envia un enlace de restablecimiento de contraseña al administrador por correo.
   * Este método es llamado desde el dashboard.
   * @param id ID del administrador.
   * @returns Observable<{message: string}>
   */
  sendPasswordResetLink(id: number): Observable<{message: string}> {
    // Asumo que tu backend tiene un endpoint dedicado para esto
    return this.http.post<{message: string}>(`${this.apiUrl}/${id}/send-reset-link`, {});
  }
}