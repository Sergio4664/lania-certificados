import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

// 🚨 La exportación DEBE coincidir con la importación en app.routes.ts
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  } else {
    // Si no está autenticado, redirigir al login
    router.navigate(['/login']);
    return false;
  }
};

// Si el compilador insiste en que no hay exportación AuthGuard, significa que en algún punto
// intentaron exportarlo así. Mantenemos el nombre correcto: authGuard.