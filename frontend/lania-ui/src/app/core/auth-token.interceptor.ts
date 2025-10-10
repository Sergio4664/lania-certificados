import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '@environments/environment';
// Asegúrate de que tu interfaz se llame LoginDTO o adáptalo si usas 'User'
import { LoginDTO, TokenDTO } from '@shared/interfaces/auth.interface'; 

// Función interceptor (nuevo estilo Angular 15+)
export const authTokenInterceptor = (req: HttpRequest<unknown>, next: any) => {
  const token = localStorage.getItem('access_token');
  
  if (token) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(authReq);
  }
  
  return next(req);
};

// Servicio de autenticación
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  login(credentials: LoginDTO): Observable<TokenDTO> {
    // Tu endpoint de login es /auth/login, no /auth/token
    // Y espera un JSON, no FormData
    return this.http.post<TokenDTO>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        if (response.access_token) {
          localStorage.setItem('access_token', response.access_token);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // --- MÉTODOS NUEVOS PARA RESTABLECER CONTRASEÑA ---

  /**
   * Solicita un enlace para restablecer la contraseña para el correo electrónico proporcionado.
   * @param email - El correo del usuario.
   */
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  /**
   * Restablece la contraseña utilizando un token y la nueva contraseña.
   * @param token - El token recibido en el correo.
   * @param password - La nueva contraseña.
   */
  resetPassword(token: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/reset-password/${token}`, { password });
  }
}

// Interceptor clase (estilo anterior, por compatibilidad)
@Injectable()
export class AuthTokenInterceptorClass implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('access_token');
    
    if (token) {
      const authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(authReq);
    }
    
    return next.handle(req);
  }
}