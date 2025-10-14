//RUTA: frontend/lania-ui/src/app/core/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
// Asegúrate de que esta interfaz ahora se llame LoginDTO como corregimos antes
import { AuthResponse, CurrentUser, LoginCredentials } from '@shared/interfaces/auth.interface';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  // Claves para el almacenamiento local
  private readonly TOKEN_KEY = 'access_token';
  private readonly USER_KEY = 'current_user';

  /**
   * Realiza el login contra el backend.
   * Envía los datos como FormData, que es lo que espera el endpoint /token de FastAPI.
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const formData = new FormData();
    // El backend espera 'username', no 'email', para el login.
    formData.append('username', credentials.username); 
    formData.append('password', credentials.password);

    return this.http.post<AuthResponse>(`${this.apiUrl}/token`, formData).pipe(
      tap(response => {
        // Si la respuesta es exitosa, guarda el token y la información del usuario
        if (response.access_token && response.user) {
          this.saveAuthData(response.access_token, response.user);
        }
      })
    );
  }

  /**
   * Cierra la sesión del usuario, eliminando los datos de localStorage y redirigiendo al login.
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.router.navigate(['/login']);
  }

  /**
   * Obtiene el token de acceso actual desde localStorage.
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Obtiene la información del usuario actualmente logueado desde localStorage.
   */
  getCurrentUser(): CurrentUser | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    if (!userJson) {
      return null;
    }
    return JSON.parse(userJson) as CurrentUser;
  }

  /**
   * Verifica si el usuario está autenticado revisando la existencia del token.
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Guarda el token y los datos del usuario en localStorage.
   */
  private saveAuthData(token: string, user: CurrentUser): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  // --- MÉTODOS AÑADIDOS ---

  /**
   * Solicita un enlace para restablecer la contraseña.
   * @param email El correo del usuario.
   */
  forgotPassword(email: string): Observable<{ message: string }> {
    // Este endpoint espera un cuerpo JSON, no FormData
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot-password`, { email });
  }

  /**
   * Envía el token y la nueva contraseña para actualizarla.
   * @param token El token recibido en el correo.
   * @param newPassword La nueva contraseña.
   */
  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    // Este endpoint también espera un cuerpo JSON
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, { token, new_password: newPassword });
  }
}