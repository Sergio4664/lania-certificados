import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Administrador, AdministradorCreate } from '../interfaces/administrador.interface';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdministradorService {
  private http = inject(HttpClient);
  private resourceUrl = `${environment.apiUrl}/admin/administradores/`;

  getAll(): Observable<Administrador[]> {
    return this.http.get<Administrador[]>(this.resourceUrl);
  }

  create(admin: AdministradorCreate): Observable<Administrador> {
    return this.http.post<Administrador>(this.resourceUrl, admin);
  }

  delete(id: number): Observable<{ detail: string }> {
    return this.http.delete<{ detail: string }>(`${this.resourceUrl}${id}`);
  }
}