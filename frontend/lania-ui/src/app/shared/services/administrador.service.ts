import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

// Asumiremos que estas interfaces se crearán en la carpeta /shared/interfaces/
import { Administrador, AdministradorCreate, AdministradorUpdate } from '@shared/interfaces/administrador.interface';
@Injectable({
  providedIn: 'root'
})
export class AdministradorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/admin/administradores`;

  // Obtener todos los administradores
  getAll(): Observable<Administrador[]> {
    return this.http.get<Administrador[]>(this.apiUrl);
  }

  // Obtener un administrador por ID
  getById(id: number): Observable<Administrador> {
    return this.http.get<Administrador>(`${this.apiUrl}/${id}`);
  }

  // Crear un nuevo administrador
  create(admin: AdministradorCreate): Observable<Administrador> {
    return this.http.post<Administrador>(this.apiUrl, admin);
  }

  // Actualizar un administrador
  update(id: number, admin: AdministradorUpdate): Observable<Administrador> {
    return this.http.put<Administrador>(`${this.apiUrl}/${id}`, admin);
  }

  // Eliminar un administrador
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
