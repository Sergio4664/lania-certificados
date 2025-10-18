import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Administrador, AdministradorCreate, AdministradorUpdate } from '@shared/interfaces/administrador.interface';

@Injectable({
  providedIn: 'root'
})
export class AdministradorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/administradores`;

  getAll(): Observable<Administrador[]> {
    return this.http.get<Administrador[]>(this.apiUrl);
  }

  create(admin: AdministradorCreate): Observable<Administrador> {
    return this.http.post<Administrador>(this.apiUrl, admin);
  }

  /**
   * Actualiza un administrador existente.
   * @param id El ID del administrador a actualizar.
   * @param admin Los datos actualizados.
   */
  update(id: number, admin: AdministradorUpdate): Observable<Administrador> {
    return this.http.put<Administrador>(`${this.apiUrl}/${id}`, admin);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}