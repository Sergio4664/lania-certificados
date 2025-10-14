import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';

// --- CORRECCIÓN DE LA RUTA DE IMPORTACIÓN ---
// Ahora importamos el interceptor desde su propio archivo.
import { authTokenInterceptor } from '@app/core/auth.interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // Usamos el interceptor funcional con el nuevo sistema de `provideHttpClient`
    provideHttpClient(withInterceptors([authTokenInterceptor])),
    provideAnimationsAsync()
  ]
};
