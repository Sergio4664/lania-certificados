import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Define las rutas que son públicamente accesibles (sin autenticación).
 * Cualquier ruta que comience con estos prefijos será permitida.
 */
const PUBLIC_ROUTES = [
  '/login', 
  '/forgot-password', 
  '/reset-password', 
  '/verificacion' // 🎯 CLAVE: Permitir que la verificación pase
];

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot, 
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. Verificar si la ruta actual es pública.
  // state.url es el camino completo, incluyendo query params (ej: /verificacion/LANIA-XXX?q=...)
  // Usamos startsWith() para manejar rutas con parámetros como /verificacion/ABC-123
  const isPublicRoute = PUBLIC_ROUTES.some(publicPath => 
    state.url.startsWith(publicPath)
  );

  // Si la ruta es pública, permitimos el acceso inmediatamente, sin verificar token.
  if (isPublicRoute) {
    // Evita que un usuario autenticado vaya a las páginas de inicio de sesión/recuperación.
    if (authService.isAuthenticated() && 
        (state.url.startsWith('/login') || state.url.startsWith('/forgot-password') || state.url.startsWith('/reset-password'))) {
      // Redirigir al área de administración si ya está autenticado
      return router.createUrlTree(['/admin/dashboard']);
    }
    return true; // Acceso permitido: es una ruta pública
  }

  // 2. Si la ruta NO es pública (es decir, está dentro de '/admin'), requerimos autenticación.
  if (authService.isAuthenticated()) {
    return true; // Permitir acceso al área protegida.
  }

  // 3. Si no está autenticado y no es una ruta pública, redirigir al login.
  return router.createUrlTree(['/login']);
};