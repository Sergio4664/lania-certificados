// frontend/lania-ui/src/app/features/admin/docentes/admin-user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Definimos la interfaz para el usuario administrador
export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
}

// Interfaz para la creación de un nuevo usuario
export interface NewAdminUser {
  email: string;
  full_name: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminUserService {
  private apiUrl = `${environment.apiUrl}/api/admin/users`;

  constructor(private http: HttpClient) { }

  // Obtener todos los administradores
  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(this.apiUrl);
  }

  // Crear un nuevo administrador
  createUser(user: NewAdminUser): Observable<AdminUser> {
    return this.http.post<AdminUser>(this.apiUrl, user);
  }

  // Eliminar un administrador
  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}