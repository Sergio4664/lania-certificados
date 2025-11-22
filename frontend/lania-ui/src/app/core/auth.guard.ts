import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('🛡️ AuthGuard ejecutándose para ruta:', state.url);
  
  const isAuth = authService.isAuthenticated();
  console.log('🔐 Usuario autenticado:', isAuth);

  if (isAuth) {
    console.log('✅ Acceso permitido a:', state.url);
    return true;
  }

  console.warn('❌ Acceso denegado, redirigiendo al login desde:', state.url);
  router.navigate(['/login']);
  return false;
};