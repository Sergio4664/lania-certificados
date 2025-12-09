import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

/**
 * Interceptor funcional que añade el token de autenticación JWT y maneja
 * los errores 401/403 (No Autorizado/Prohibido).
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
      if (error.status === 401) {
        console.error(`❌ Error 401 en:`, req.url);
        
        const isLoginRequest = req.url.includes('/auth/token') || req.url.includes('/auth/login');
        
        // Solo hacer logout si NO es una petición de login
        if (!isLoginRequest) {
          console.warn('⚠️ Token inválido/expirado. Cerrando sesión...');
          
          // Hacer logout inmediatamente sin setTimeout
          authService.logout();
        }
      }
      
      // Si es un error 403 (Forbidden), solo significa que el usuario
      // no tiene permisos para ese recurso específico
      if (error.status === 403) {
        console.warn('⚠️ Acceso denegado (403) - Sin permisos para:', req.url);
      }
      
      // Reenviamos el error para que el componente que hizo la llamada lo maneje
      return throwError(() => error);
    })
  );
};