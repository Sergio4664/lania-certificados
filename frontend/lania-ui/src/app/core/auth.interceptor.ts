import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service'; // Asegúrate que la ruta sea correcta

/**
 * Interceptor funcional que añade el token de autenticación JWT a las cabeceras
 * de las solicitudes HTTP salientes.
 */
// Este es el nombre que se debe importar en app.config.ts
export const authTokenInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {

  // Inyectamos el AuthService para poder obtener el token
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Si no hay un token, la solicitud continúa sin modificarse.
  if (!token) {
    // console.log('Interceptor: No token found'); // Descomenta para depurar si es necesario
    return next(req);
  }

  // Si existe un token, clonamos la solicitud para añadir la cabecera 'Authorization'.
  const clonedReq = req.clone({
    headers: req.headers.set('Authorization', `Bearer ${token}`)
  });

  // console.log('Interceptor: Token added', clonedReq.headers.get('Authorization')); // Descomenta para depurar si es necesario
  // Pasamos la solicitud modificada al siguiente manejador en la cadena.
  return next(clonedReq);
};