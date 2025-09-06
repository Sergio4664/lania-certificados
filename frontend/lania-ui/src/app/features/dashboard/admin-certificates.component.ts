// frontend/lania-ui/src/app/features/dashboard/admin-certificates.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CertificateDTO, CreateCertificateDTO } from '../../shared/interfaces/certificate.interfaces';
import { CourseDTO } from '../../shared/interfaces/course.interfaces';
import { ParticipantDTO } from '../../shared/interfaces/participant.interfaces';

@Component({
  selector: 'app-admin-certificates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="module-content">
  <div class="module-header">
    <h2>Gestión de Constancias</h2>
    <button class="primary-btn" (click)="showForm = !showForm">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Emitir Constancia
    </button>
  </div>

  <div *ngIf="showForm" class="form-card">
    <h3>Emitir Nueva Constancia</h3>
    <form (ngSubmit)="issueCertificate()" class="form-grid">
      <div class="form-group">
        <label>Curso *</label>
        <select [(ngModel)]="newCertificate.course_id" name="course_id" required>
          <option [ngValue]="null" disabled>Seleccione el producto educativo...</option>
          <option *ngFor="let course of courses" [value]="course.id">
            {{ course.name }} ({{ course.code }})
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>Participante *</label>
        <select [(ngModel)]="newCertificate.participant_id" name="participant_id" required>
          <option [ngValue]="null" disabled>Seleccionar participante...</option>
          <option *ngFor="let p of participants" [value]="p.id">
            {{ p.full_name }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>Tipo de Constancia *</label>
        <select [(ngModel)]="newCertificate.kind" name="kind" required>
          <option value="PILDORA_PARTICIPANTE">Píldora (Participante)</option>
          <option value="PILDORA_PONENTE">Píldora (Ponente)</option>
          <option value="APROBACION">Aprobación (Curso)</option>
          <option value="ASISTENCIA">Asistencia (Curso)</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="secondary-btn" (click)="showForm = false; resetForm()">Cancelar</button>
        <button type="submit" class="primary-btn">Emitir</button>
      </div>
    </form>
  </div>

  <div class="data-table">
    <table>
      <thead>
        <tr>
          <th>Serial</th>
          <th>Participante</th>
          <th>Nombre del Producto Educativo</th>
          <th>Tipo</th>
          <th>Estado</th>
          <th>Fecha de Emisión</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let cert of certificates">
          <td><span class="serial-tag">{{ cert.serial }}</span></td>
          <td>{{ cert.participant_name }}</td>
          <td>{{ cert.course_name }}</td>
          <td><span class="badge" [ngClass]="'type-' + cert.kind.toLowerCase()">{{ cert.kind.replace('_', ' ') }}</span></td>
          <td><span class="status" [ngClass]="'status-' + cert.status.toLowerCase()">{{ cert.status.replace('_', ' ') }}</span></td>
          <td>{{ cert.issued_at ? (cert.issued_at | date:'dd/MM/yyyy HH:mm') : 'N/A' }}</td>
          <td>
            <button class="icon-btn download" 
                    *ngIf="cert.status === 'LISTO_PARA_DESCARGAR'"
                    (click)="downloadCertificate(cert.serial)"
                    title="Descargar PDF">
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M5 20h14v-2H5v2zm14-9h-4V3H9v8H5l7 7 7-7z"/></svg>
            </button>
          </td>
        </tr>
        <tr *ngIf="certificates.length === 0">
          <td colspan="7" class="no-data">No se han emitido constancias.</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

 `,
  styles: [`
  .module-content h2 {
  color: #1e293b;
  margin: 0 0 24px 0;
  font-size: 28px;
  font-weight: 600;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.primary-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.primary-btn:hover {
  transform: translateY(-1px);
}

.secondary-btn {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.secondary-btn:hover {
  background: #e2e8f0;
}

.form-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.form-card h3 {
  color: #1e293b;
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  color: #374151;
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
}

.form-group input {
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
}

.form-actions {
  display: flex;
  gap: 12px;
  grid-column: 1 / -1;
  margin-top: 8px;
  align-items: flex-end;
}

.data-table table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th, .data-table td {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  text-align: left;
  vertical-align: middle;
}

.data-table th {
  background: #f8fafc;
  font-weight: 600;
  color: #374151;
}

.data-table td {
  color: #64748b;
}

.data-table tbody tr:hover {
  background: #f8fafc;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  margin: 0 4px;
  background: transparent;
}

.icon-btn.edit { color: #d97706; }
.icon-btn.edit:hover { background: #fef3c7; }
.icon-btn.delete { color: #dc2626; }
.icon-btn.delete:hover { background: #fecaca; }

.no-data {
  text-align: center;
  padding: 32px;
  color: #9ca3af;
}

  `]
})
export default class AdminCertificatesComponent implements OnInit {
  private http = inject(HttpClient);

  certificates: CertificateDTO[] = [];
  courses: CourseDTO[] = [];
  participants: ParticipantDTO[] = [];
  
  showForm = false;
  newCertificate!: CreateCertificateDTO;

  constructor() {
    this.resetForm();
  }

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };
    
    // Cargar todos los datos necesarios en paralelo
    this.http.get<CertificateDTO[]>('http://127.0.0.1:8000/api/admin/certificates', { headers })
      .subscribe(data => this.certificates = data);
    
    this.http.get<CourseDTO[]>('http://127.0.0.1:8000/api/admin/courses', { headers })
      .subscribe(data => this.courses = data);

    this.http.get<ParticipantDTO[]>('http://127.0.0.1:8000/api/admin/participants', { headers })
      .subscribe(data => this.participants = data);
  }

  resetForm() {
    this.newCertificate = {
      course_id: '',
      participant_id: '',
      kind: 'PARTICIPANTE' // Valor por defecto
    };
  }

  cancelForm() {
    this.showForm = false;
    this.resetForm();
  }

  issueCertificate() {
    if (!this.newCertificate.course_id || !this.newCertificate.participant_id) {
      alert('Por favor, seleccione un curso y un participante.');
      return;
    }

    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.post('http://127.0.0.1:8000/api/admin/certificates/issue', this.newCertificate, { headers })
      .subscribe({
        next: () => {
          alert('Constancia emitida exitosamente.');
          this.loadInitialData();
          this.cancelForm();
        },
        error: (err) => {
          console.error('Error al emitir la constancia:', err);
          alert(`Error: ${err.error?.detail || 'No se pudo emitir la constancia.'}`);
        }
      });
  }

  downloadCertificate(serial: string) {
    if (!serial) return;
    window.open(`http://127.0.0.1:8000/v/serial/${serial}/pdf`, '_blank');
  }

  // Helper para formatear el estado de la constancia para mostrarlo en la UI
  formatStatus(status: string): string {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  // Helper para aplicar clases CSS basadas en el estado
  getStatusClass(status: string): string {
    return status.toLowerCase().replace(/_/g, '-');
  }
}