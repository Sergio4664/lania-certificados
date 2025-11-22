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
    try {
      return JSON.parse(userJson) as CurrentUser;
    } catch (e) {
      console.error("Error al parsear CurrentUser:", e);
      return null;
    }
  }

  /**
   * Verifica si el usuario está autenticado, comprobando que el token exista y no esté expirado.
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    
    if (!token) {
      console.warn('⚠️ No hay token en localStorage. Redirigiendo a login.');
      this.logout(); // Asegurarse de limpiar por si acaso
      return false;
    }

    // Verificar si el token es un JWT válido y no está expirado
    try {
      const payload = this.decodeToken(token);
      
      if (!payload || !payload.exp) {
        console.warn('⚠️ Token no tiene formato JWT válido o le falta el campo "exp". Redirigiendo a login.');
        this.logout();
        return false;
      }

      // Los tokens JWT usan tiempo Unix (segundos), Date() usa milisegundos
      const expirationDate = new Date(payload.exp * 1000); 
      const now = new Date();
      
      // Margen de 5 minutos antes de considerar el token expirado.
      // Esto ayuda a renovar el token antes de que expire si el backend lo soporta, 
      // o a redirigir al usuario antes de que una petición falle.
      const bufferTime = 5 * 60 * 1000; // 5 minutos en milisegundos
      const isExpired = now.getTime() > (expirationDate.getTime() - bufferTime);

      if (isExpired) {
        console.warn('⚠️ Token expirado o a punto de expirar. Redirigiendo a login.');
        this.logout(); // Limpiar token expirado y redirigir
        return false;
      }

      console.log('✅ Token válido hasta:', expirationDate.toLocaleString());
      return true;
      
    } catch (error) {
      console.error('❌ Error al verificar/decodificar token:', error);
      this.logout(); // Limpiar y redirigir ante error de formato
      return false;
    }
  }

  /**
   * Decodifica un token JWT y retorna el payload.
   * Utiliza la implementación nativa atob() para evitar dependencias.
   */
  private decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      // Un JWT válido debe tener 3 partes: Header.Payload.Signature
      if (parts.length !== 3) {
        return null;
      }
      
      const payload = parts[1];
      // Reemplazar caracteres no estándar de base64url por base64 estándar
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      
      // Decodificar Base64
      const decoded = atob(base64);

      // JSON.parse(decoded) puede fallar si la codificación no es correcta
      return JSON.parse(decoded);
    } catch (error) {
      // Un token mal formado o una decodificación fallida resultará en un error
      console.error('Error decodificando token:', error);
      return null;
    }
  }

  /**
   * Guarda el token y los datos del usuario.
   */
  private saveAuthData(token: string, user: CurrentUser): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    console.log('💾 Token y usuario guardados exitosamente.');
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