import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs'; // Necesitamos throwError y catchError
import { AuthService } from './auth.service';
import { Router } from '@angular/router'; // Necesitamos el Router para verificar la URL

/**
 * Interceptor funcional que añade el token de autenticación JWT y maneja
 * los errores 401/403 (No Autorizado/Prohibido) para forzar el cierre de sesión.
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  // Inyectamos servicios
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  let clonedReq = req;

  // 1. Adjuntar el token si existe
  if (token) {
    clonedReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
  }

  // 2. Manejar la respuesta y los errores
  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      
      // Si el backend rechaza la solicitud por token inválido o expirado
      if (error.status === 401 || error.status === 403) {
        
        // **ACCIÓN CRÍTICA DE SEGURIDAD:**
        // Comprobamos que el error provenga de una ruta protegida.
        // Si estamos en una ruta protegida (ej: /admin/...) y el token falla,
        // significa que el token guardado es inválido o caducó.
        if (router.url.includes('/admin')) {
            console.error('Interceptor: Token inválido/expirado detectado. Redirigiendo a Login.');
            // Forzamos el cierre de sesión, lo cual limpia el token del localStorage y navega a /login.
            authService.logout(); 
        }
      }
      
      // Reenviamos el error para que el componente que hizo la llamada lo maneje (ej: NotificationService)
      return throwError(() => error);
    })
  );
};