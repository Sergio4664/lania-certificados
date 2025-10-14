import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Interceptor funcional que añade el token de autenticación JWT a las cabeceras
 * de las solicitudes HTTP salientes.
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  // Inyectamos el AuthService para poder obtener el token
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Si no hay un token, la solicitud continúa sin modificarse.
  if (!token) {
    return next(req);
  }

  // Si existe un token, clonamos la solicitud para añadir la cabecera 'Authorization'.
  const clonedReq = req.clone({
    headers: req.headers.set('Authorization', `Bearer ${token}`)
  });

  // Pasamos la solicitud modificada al siguiente manejador en la cadena.
  return next(clonedReq);
};