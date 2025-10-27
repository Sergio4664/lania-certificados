//Ruta: frontend/lania-ui/src/app/core/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '@environments/environment';
import { AuthResponse, CurrentUser, LoginCredentials } from '@shared/interfaces/auth.interface';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  private readonly TOKEN_KEY = 'access_token';
  private readonly USER_KEY = 'current_user';

  /**
   * Realiza el login contra el backend.
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const formData = new FormData();
    formData.append('username', credentials.username); 
    formData.append('password', credentials.password);

    // ✅ CORRECCIÓN: Se añade el prefijo /auth a la URL
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/token`, formData).pipe(
      tap(response => {
        if (response.access_token && response.user) {
          this.saveAuthData(response.access_token, response.user);
        }
      })
    );
  }

  /**
   * Cierra la sesión del usuario.
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.router.navigate(['/login']);
  }

  /**
   * Obtiene el token de acceso actual.
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Obtiene la información del usuario actual.
   */
  getCurrentUser(): CurrentUser | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    if (!userJson) {
      return null;
    }
    return JSON.parse(userJson) as CurrentUser;
  }

  /**
   * Verifica si el usuario está autenticado.
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Guarda el token y los datos del usuario.
   */
  private saveAuthData(token: string, user: CurrentUser): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Solicita un enlace para restablecer la contraseña.
   */
  forgotPassword(email: string): Observable<{ message: string }> {
    // ✅ CORRECCIÓN: Se añade el prefijo /auth a la URL
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  /**
   * Envía el token y la nueva contraseña para actualizarla.
   */
  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    // ✅ CORRECCIÓN: Se añade el prefijo /auth a la URL
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/reset-password`, { token, new_password: newPassword });
  }
}