import { HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Interceptor funcional que añade el token de autenticación a las cabeceras
 * de las peticiones HTTP salientes si el usuario está autenticado.
 */
export const authTokenInterceptor = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Si no hay token, la petición sigue su curso sin modificaciones.
  if (!token) {
    return next(req);
  }

  // Si hay token, se clona la petición y se añade la cabecera de autorización.
  const authReq = req.clone({
    headers: req.headers.set('Authorization', `Bearer ${token}`),
  });

  return next(authReq);
};