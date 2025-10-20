//Ruta: frontend/lania-ui/src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
// --- CORRECCIÓN DE LA IMPORTACIÓN ---
// Se importa el interceptor funcional con el nombre correcto.
import { authTokenInterceptor } from './core/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    
    // --- CORRECCIÓN DEL REGISTRO ---
    // Se registra el 'authTokenInterceptor' funcional.
    // Esto asegura que cada petición HTTP incluya el token de autenticación.
    provideHttpClient(
      withInterceptors([authTokenInterceptor])
    ),
  ]
};