import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations'; // <-- IMPORTANTE: Añadir esto
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { routes } from './app.routes';
import { authTokenInterceptor } from './core/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authTokenInterceptor])),
    provideAnimations(), // <-- Y AÑADIR ESTO AQUÍ
    importProvidersFrom(MatSnackBarModule)
  ]
};

