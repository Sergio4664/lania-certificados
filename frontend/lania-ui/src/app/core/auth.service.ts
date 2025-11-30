import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http'; // 🚨 IMPORTAR HttpHeaders
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
    
    // 🚨 PASO 1: Serializar los datos al formato URLSearchParams
    const body = new URLSearchParams();
    body.set('username', credentials.username);
    body.set('password', credentials.password);
    
    // 🚨 PASO 2: Definir el Content-Type requerido por FastAPI (OAuth2)
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    // 🚨 PASO 3: Enviar la petición POST con el formato y headers correctos
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/auth/token`, // URL es correcta: /auth/token
      body.toString(),              // Enviar el body serializado como string
      { headers }                   // Adjuntar los headers
    ).pipe(
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
    console.log('🔓 Cerrando sesión...');
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
   * VERSIÓN SIMPLIFICADA: Solo verifica que exista el token
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    const hasToken = !!token;
    
    console.log('🔐 Verificando autenticación:', {
      tieneToken: hasToken,
      token: token ? `${token.substring(0, 20)}...` : 'null'
    });
    
    return hasToken;
  }

  /**
   * Guarda el token y los datos del usuario.
   */
  private saveAuthData(token: string, user: CurrentUser): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    console.log('💾 Token guardado exitosamente');
  }

  /**
   * Solicita un enlace para restablecer la contraseña.
   */
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  /**
   * Envía el token y la nueva contraseña para actualizarla.
   */
  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/reset-password`, { token, new_password: newPassword });
  }
}