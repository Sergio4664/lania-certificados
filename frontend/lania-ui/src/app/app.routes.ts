// src/app/app.routes.ts
import { Routes } from '@angular/router';
import LoginComponent from './features/auth/login/login.component';
import {DashboardComponent} from '@features/dashboard/dashboard.component';
import PublicVerifyComponent from './features/public-verify/public-verify.component';

// Admin
import AdminDocentesComponent from './features/admin/docentes/admin-docentes.component';
import AdminCourseCreateComponent from './features/admin/courses/admin-course-create.component';

// Docente
import MyCoursesComponent from '@features/docente/my-courses.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  // Admin
  { path: 'dashboard', component: DashboardComponent },
  { path: 'admin/docentes', component: AdminDocentesComponent },
  { path: 'admin/cursos/crear', component: AdminCourseCreateComponent },

  // Docente
  { path: 'mis-cursos', component: MyCoursesComponent },

  // Público
  { path: 'v/:token', component: PublicVerifyComponent },

  { path: '', pathMatch: 'full', redirectTo: 'login' }
];
