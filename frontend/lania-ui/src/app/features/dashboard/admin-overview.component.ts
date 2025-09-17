import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { CourseDTO } from '../../shared/interfaces/course.interfaces';
import { ParticipantDTO } from '../../shared/interfaces/participant.interfaces';
import { CertificateDTO } from '../../shared/interfaces/certificate.interfaces';
import { DocenteDTO } from '../../shared/interfaces/docente.interfaces';
import { UserDTO } from '../admin/users/admin-users.component';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="module-content">
  <h2>Panel de Control</h2>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon courses">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
      </div>
      <div class="stat-info">
        <h3>{{courses.length}}</h3>
        <p>Productos Educativos</p>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon participants">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
        </svg>
      </div>
      <div class="stat-info">
        <h3>{{participants.length}}</h3>
        <p>Participantes</p>
      </div>
    </div>
     <div class="stat-card">
      <div class="stat-icon docentes">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="7" r="4"></circle>
          <path d="M5.5 21a7.5 7.5 0 0 1 13 0"></path>
        </svg>
      </div>
      <div class="stat-info">
        <h3>{{docentes.length}}</h3>
        <p>Docentes</p>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon certificates">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14,2 14,8 20,8"></polyline>
        </svg>
      </div>
      <div class="stat-info">
        <h3>{{certificates.length}}</h3>
        <p>Constancias Emitidas</p>
      </div>
    </div>
    <div class="stat-card">
      <div class="stat-icon admins">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3z"></path>
        </svg>
      </div>
      <div class="stat-info">
        <h3>{{users.length}}</h3>
        <p>Administradores</p>
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
.module-content h2 { color: #1e293b; margin: 0 0 24px 0; font-size: 28px; font-weight: 600; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
.stat-card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 16px; }
.stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; }

/* Paleta de colores para las tarjetas */
.stat-icon.courses { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.stat-icon.participants { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.stat-icon.docentes { background: linear-gradient(135deg, #96fbc4 0%, #f9f586 100%); }
.stat-icon.certificates { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.stat-icon.admins { background: linear-gradient(135deg, #f97316 0%, #facc15 100%); } /* Naranja/Amarillo para Admins */

.stat-info h3 { font-size: 32px; font-weight: bold; margin: 0; color: #1e293b; }
.stat-info p { margin: 4px 0 0 0; color: #64748b; font-weight: 500; }
  `]
})
export default class AdminOverviewComponent implements OnInit {
  private http = inject(HttpClient);

  courses: CourseDTO[] = [];
  participants: ParticipantDTO[] = [];
  certificates: CertificateDTO[] = [];
  docentes: DocenteDTO[] = [];
  users: UserDTO[] = []; // 👈 Propiedad añadida
  isLoading = true;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    const token = localStorage.getItem('access_token');
    if (!token) {
      this.isLoading = false;
      return;
    }
    
    const headers = { Authorization: `Bearer ${token}` };

    // Cargar Cursos
    this.http.get<CourseDTO[]>('http://127.0.0.1:8000/api/admin/courses', { headers })
      .subscribe({
        next: data => this.courses = data,
        error: err => console.error('Error cargando cursos', err)
      });

    // Cargar Participantes
    this.http.get<ParticipantDTO[]>('http://127.0.0.1:8000/api/admin/participants', { headers })
      .subscribe({
        next: data => this.participants = data,
        error: err => console.error('Error cargando participantes', err)
      });

    // Cargar Certificados
    this.http.get<CertificateDTO[]>('http://127.0.0.1:8000/api/admin/certificates', { headers })
      .subscribe({
        next: data => this.certificates = data,
        error: err => console.error('Error cargando certificados', err)
      });

    // Cargar Docentes
    this.http.get<DocenteDTO[]>('http://127.0.0.1:8000/api/admin/docentes', { headers })
      .subscribe({
        next: data => this.docentes = data,
        error: err => console.error('Error cargando docentes', err)
      });
      
    // 👇 Cargar Administradores (Petición añadida) 👇
    this.http.get<UserDTO[]>('http://127.0.0.1:8000/api/admin/users', { headers })
      .subscribe({
        next: data => {
          this.users = data;
          this.isLoading = false; // Finaliza la carga aquí
        },
        error: err => {
          console.error('Error cargando admins', err);
          this.isLoading = false;
        }
      });
  }
}