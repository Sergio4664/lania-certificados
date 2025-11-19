import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

/**
 * Interceptor funcional que añade el token de autenticación JWT y maneja
 * los errores 401/403 (No Autorizado/Prohibido) para forzar el cierre de sesión.
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
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
        console.error(`❌ Error ${error.status}: ${error.message}`);
        console.error('URL afectada:', req.url);
        console.error('Ruta actual:', router.url);
        
        // **MEJORA CRÍTICA:**
        // Solo hacer logout si:
        // 1. Estamos en una ruta protegida (/admin)
        // 2. Y el error es específicamente de autenticación (no un error de permisos)
        // 3. Y NO es una petición de login
        
        const isProtectedRoute = router.url.includes('/admin');
        const isLoginRequest = req.url.includes('/auth/token') || req.url.includes('/auth/login');
        const isAuthenticationError = error.status === 401;
        
        if (isProtectedRoute && isAuthenticationError && !isLoginRequest) {
          console.warn('⚠️ Token inválido/expirado detectado. Cerrando sesión...');
          
          // Pequeño delay para permitir que los logs se muestren
          setTimeout(() => {
            authService.logout();
          }, 100);
        }
        
        // Si es un error 403 (Forbidden), solo significa que el usuario
        // no tiene permisos para ese recurso específico, pero no cerramos sesión
        if (error.status === 403) {
          console.warn('⚠️ Acceso denegado (403) - El usuario no tiene permisos para este recurso');
        }
      }
      
      // Reenviamos el error para que el componente que hizo la llamada lo maneje
      return throwError(() => error);
    })
  );
};