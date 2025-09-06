// src/app/app.routes.ts
import { Routes } from '@angular/router';
import LoginComponent from './features/auth/login/login.component';
import PublicVerifyComponent from './features/public-verify/public-verify.component';

// Admin
import DashboardLayoutComponent from './features/dashboard/dashboard-layout.component';
import AdminOverviewComponent from './features/dashboard/admin-overview.component';
import { AdminCoursesComponent } from './features/dashboard/admin-courses.component';
import AdminDocentesComponent from './features/dashboard/admin-docentes.component';
import AdminParticipantsComponent from './features/dashboard/admin-participants.component';
import AdminCertificatesComponent from './features/dashboard/admin-certificates.component';


export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {path: 'v/:token', component: PublicVerifyComponent},

  // Ruta principal del dashboard que carga el layout
  {
  path: 'admin',
  component: DashboardLayoutComponent,
  //rutas hijas que renderiza dentro del <router-outlet> del DashboardLayoutComponent
  children: [
    { path: 'dashboard', component: AdminOverviewComponent },
    { path: 'courses', component: AdminCoursesComponent },
    { path: 'docentes', component: AdminDocentesComponent },
    { path: 'participants', component: AdminParticipantsComponent },
    { path: 'certificates', component: AdminCertificatesComponent },
    //Rederigido a la vista general por defecto
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
  ] 
},
  //Redirigir a login por defecto si la ruta esta vacia

  { path: '', pathMatch: 'full', redirectTo: 'login' }
];
