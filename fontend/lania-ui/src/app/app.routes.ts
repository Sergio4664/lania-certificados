import { Routes } from '@angular/router';
import { authGuard } from '@core/auth.guard';

// --- Vistas de Autenticación ---
import { LoginComponent } from '@features/auth/login/login.component';
import { ForgotPasswordComponent } from '@features/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from '@features/auth/reset-password/reset-password.component';

// --- Verificación (default export)
import VerificacionComponent from './features/verificacion/verificacion.component';

// --- Dashboard Layout (default export)
import DashboardLayoutComponent from '@features/dashboard/dashboard-layout.component';

// --- Páginas del Panel (default exports)
import AdminOverviewComponent from '@features/dashboard/overview/admin-overview.component';
import { AdminProductosEducativosComponent } from '@features/dashboard/productos-educativos/admin-productos-educativos.component';
import AdminDocentesComponent from './features/dashboard/docentes/admin-docentes.component';
import AdminParticipantsComponent from './features/dashboard/participantes/admin-participantes.component';
import AdminCertificatesComponent from './features/dashboard/certificados/admin-certificados.component';
import AdminAdministradoresComponent from '@features/admin/administradores/admin-administradores.component';

export const routes: Routes = [
  // --- Rutas Públicas ---
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },

  // --- Verificación ---
  { path: 'verificacion/:folio', component: VerificacionComponent },
  { path: 'verificacion', component: VerificacionComponent },

  // --- Rutas del Panel ---
  {
    path: 'admin',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: AdminOverviewComponent },
      { path: 'productos-educativos', component: AdminProductosEducativosComponent },
      { path: 'docentes', component: AdminDocentesComponent },
      { path: 'participantes', component: AdminParticipantsComponent },
      { path: 'certificados', component: AdminCertificatesComponent },
      { path: 'administradores', component: AdminAdministradoresComponent },

      { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
    ]
  },

  // --- Global ---
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' }
];
