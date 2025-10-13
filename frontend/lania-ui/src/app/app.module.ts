//ruta: frontend/lania-ui/src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';   // Para [(ngModel)]
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';

// Componentes principales
import { AppComponent } from './app.component';
import {DashboardComponent} from '@features/dashboard/dashboard.component';
import { DocenteComponent } from './features/docente/docente.component';
import { CourseComponent } from '@features/courses/course.service';
import { ParticipantComponent } from '@features/participants/participant.service';

// Definir rutas
const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'docentes', component: DocenteComponent },
  { path: 'courses', component: CourseComponent },
  { path: 'participants', component: ParticipantComponent },
];

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    DocenteComponent,
    CourseComponent,
    ParticipantComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    RouterModule.forRoot(routes)
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
