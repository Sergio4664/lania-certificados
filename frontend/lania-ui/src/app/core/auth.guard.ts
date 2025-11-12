import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Un guardia funcional que protege las rutas de administración.
 * Verifica si el usuario está autenticado usando el AuthService.
 * * Si el usuario no tiene una sesión activa (es decir, no hay token 
 * o el token no es reconocido por el servicio), se le redirige 
 * inmediatamente a la página de login.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // CORRECCIÓN: Usamos isAuthenticated() que existe en AuthService.
  if (authService.isAuthenticated()) {
    return true; // Si está autenticado, permite el acceso a la ruta.
  }

  // Si no está autenticado, lo redirige a la página de login y bloquea la navegación.
  router.navigate(['/login']);
  return false; 
};