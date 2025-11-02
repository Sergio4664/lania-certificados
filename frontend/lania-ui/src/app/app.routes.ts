//ruta: frontend/lania-ui/src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

// --- Vistas de Autenticación y Públicas ---
import LoginComponent from '@features/auth/login/login.component';
import { ForgotPasswordComponent } from '@features/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from '@features/auth/reset-password/reset-password.component';
// Nota: Asumo que tienes un componente PublicVerifyComponent, aunque no se listó en los archivos
// import PublicVerifyComponent from './features/public-verify/public-verify.component';

// --- Layout Principal del Panel de Administración ---
import DashboardLayoutComponent from '@features/dashboard/dashboard-layout.component';

// --- Páginas del Panel de Administración ---
import AdminOverviewComponent from '@features/dashboard/overview/admin-overview.component';
import AdminProductosEducativosComponent from './features/dashboard/productos-educativos/admin-productos-educativos.component';
import AdminDocentesComponent from './features/dashboard/docentes/admin-docentes.component';
import AdminParticipantsComponent from './features/dashboard/participantes/admin-participantes.component';
import AdminCertificatesComponent from './features/dashboard/certificados/admin-certificados.component';
// Corregido: El componente real se llama 'AdminAdministradoresComponent'
import AdminAdministradoresComponent from '@features/admin/administradores/admin-administradores.component';
import VerificacionComponent from './features/verificacion/verificacion.component';
export const routes: Routes = [
  // --- Rutas Públicas (no requieren autenticación) ---
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password/:token', component: ResetPasswordComponent },
 // --- INICIO DE CORRECCIÓN ---
  // 1. Ruta para la búsqueda (Ej: /verificacion/LANIA-XXX)
  { path: 'verificacion/:folio', component: VerificacionComponent },
  // 2. Ruta base para mostrar el buscador (Ej: /verificacion)
  { path: 'verificacion', component: VerificacionComponent },
  // --- FIN DE CORRECCIÓN ---

  // --- Rutas Protegidas del Panel de Administración ---
  {
    path: 'admin',
    component: DashboardLayoutComponent,
    canActivate: [authGuard], // Este guard protege a todas las rutas hijas
    children: [
      { path: 'dashboard', component: AdminOverviewComponent },
      { path: 'productos-educativos', component: AdminProductosEducativosComponent }, // Corregido para coincidir con el nombre real
      { path: 'docentes', component: AdminDocentesComponent },
      { path: 'participantes', component: AdminParticipantsComponent }, // Corregido para coincidir con el nombre real
      { path: 'certificados', component: AdminCertificatesComponent }, // Corregido para coincidir con el nombre real
      { path: 'administradores', component: AdminAdministradoresComponent }, // Corregido para coincidir con el nombre real
      
      // Si el usuario va a '/admin', se le redirige al dashboard
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ] 
  },
  
  // --- Redirecciones Globales ---
  // Si la ruta está vacía, redirige al login
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  
  // Si la ruta no coincide con ninguna anterior, redirige al login
  { path: '**', redirectTo: 'login' }
];
