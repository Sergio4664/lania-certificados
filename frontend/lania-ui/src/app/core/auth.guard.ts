import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Un guardia funcional que protege las rutas.
 * Verifica si el usuario está autenticado usando el AuthService.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Revisa si el usuario tiene un token de autenticación válido.
  if (authService.isAuthenticated()) {
    return true; // Si está autenticado, permite el acceso a la ruta.
  }

  // Si no está autenticado, lo redirige a la página de login.
  router.navigate(['/login']);
  return false; // Y bloquea el acceso a la ruta solicitada.
};
