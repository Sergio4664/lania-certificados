import { Routes } from '@angular/router';
import LoginComponent from './features/auth/login/login.component';
import PublicVerifyComponent from './features/public-verify/public-verify.component';
import { authGuard } from './core/auth.guard';

// Importa los nuevos componentes que vas a crear
import {ForgotPasswordComponent} from '@features/auth/forgot-password/forgot-password.component';
import {ResetPasswordComponent} from '@features/auth/reset-password/reset-password.component';

// Admin
import DashboardLayoutComponent from './features/dashboard/dashboard-layout.component';
import AdminOverviewComponent from './features/dashboard/admin-overview.component';
import { AdminCoursesComponent } from './features/dashboard/admin-courses.component';
import AdminDocentesComponent from './features/dashboard/admin-docentes.component';
import AdminParticipantsComponent from './features/dashboard/admin-participants.component';
import AdminCertificatesComponent from './features/dashboard/admin-certificates.component';
import { AdminUsersComponent } from './features/admin/users/admin-users.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'v/:token', component: PublicVerifyComponent },

  // --- AÑADE LAS NUEVAS RUTAS PÚBLICAS ---
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password/:token', component: ResetPasswordComponent },

  // Ruta principal del dashboard que carga el layout
  {
    path: 'admin',
    component: DashboardLayoutComponent,
    canActivate: [authGuard], // Este guard protege todas las rutas hijas
    children: [
      { path: 'dashboard', component: AdminOverviewComponent },
      { path: 'courses', component: AdminCoursesComponent },
      { path: 'docentes', component: AdminDocentesComponent },
      { path: 'participants', component: AdminParticipantsComponent },
      { path: 'certificates', component: AdminCertificatesComponent },
      { path: 'usuarios', component: AdminUsersComponent},
      // Redirigido a la vista general por defecto
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ] 
  },
  
  // Redirigir a login por defecto si la ruta está vacía
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  // Ruta wildcard para cualquier otra URL no encontrada
  { path: '**', redirectTo: 'login' }
];