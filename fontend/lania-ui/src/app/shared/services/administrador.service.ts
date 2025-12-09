import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Administrador, 
  AdministradorCreate, 
  AdministradorUpdate 
} from '@shared/interfaces/administrador.interface';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdministradorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin/administradores/`;

  constructor() {}

  getAll(): Observable<Administrador[]> {
    return this.http.get<Administrador[]>(this.apiUrl);
  }

  create(adminData: AdministradorCreate): Observable<Administrador> {
    return this.http.post<Administrador>(this.apiUrl, adminData);
  }

  update(id: number, adminData: AdministradorUpdate): Observable<Administrador> {
    return this.http.put<Administrador>(`${this.apiUrl}${id}`, adminData);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}`);
  }

  /** ✅ Enviar enlace real de restablecimiento */
  sendPasswordResetLink(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiUrl}/auth/forgot-password`,
      { email }
    );
  }
}
