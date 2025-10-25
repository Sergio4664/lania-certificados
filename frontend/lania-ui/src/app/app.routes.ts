import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

// --- Vistas de Autenticación y Públicas ---
// ✅ Imports directos de los componentes
import LoginComponent from './features/auth/login/login.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import VerificacionComponent from './features/verificacion/verificacion.component'; // Importamos el nuevo componente

// --- Layout Principal del Panel de Administración ---
import DashboardLayoutComponent from './features/dashboard/dashboard-layout.component';

// --- Páginas del Panel de Administración ---
import AdminOverviewComponent from './features/dashboard/overview/admin-overview.component';
import AdminProductosEducativosComponent from './features/dashboard/productos-educativos/admin-productos-educativos.component';
import AdminDocentesComponent from './features/dashboard/docentes/admin-docentes.component';
import AdminParticipantsComponent from './features/dashboard/participantes/admin-participantes.component';
import AdminCertificatesComponent from './features/dashboard/certificados/admin-certificados.component';
import AdminAdministradoresComponent from './features/admin/administradores/admin-administradores.component';

export const routes: Routes = [
  // --- Rutas Públicas (no requieren autenticación) ---
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password/:token', component: ResetPasswordComponent },

  // ✅ --- INICIO: NUEVAS RUTAS DE VERIFICACIÓN ---
  { path: 'verificacion/:folio', component: VerificacionComponent }, // Ruta con parámetro :folio
  { path: 'verificacion', component: VerificacionComponent },        // Ruta sin folio (para búsqueda manual)
  // ✅ --- FIN: NUEVAS RUTAS DE VERIFICACIÓN ---


  // --- Rutas Protegidas del Panel de Administración ---
  {
    path: 'dashboard', // Ruta base del dashboard
    component: DashboardLayoutComponent,
    canActivate: [authGuard], // Este guard protege a todas las rutas hijas
    children: [
      { path: 'overview', component: AdminOverviewComponent },
      { path: 'productos-educativos', component: AdminProductosEducativosComponent },
      { path: 'docentes', component: AdminDocentesComponent },
      { path: 'participantes', component: AdminParticipantsComponent },
      { path: 'certificados', component: AdminCertificatesComponent },
      { path: 'administradores', component: AdminAdministradoresComponent },

      // Si el usuario va a '/dashboard', se le redirige a 'overview'
      { path: '', redirectTo: 'overview', pathMatch: 'full' }
    ]
  },

  // --- Redirecciones Globales ---
  // Si la ruta está vacía, redirige al login
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  // Si la ruta no coincide con ninguna anterior, redirige al login
  { path: '**', redirectTo: 'login' }
];