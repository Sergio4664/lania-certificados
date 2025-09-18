// frontend/lania-ui/src/app/features/dashboard/admin-certificates.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CertificateDTO, CreateCertificateDTO } from '../../shared/interfaces/certificate.interfaces';
import { CourseDTO } from '../../shared/interfaces/course.interfaces';
import { ParticipantDTO } from '../../shared/interfaces/participant.interfaces';
import { DocenteDTO } from '../../shared/interfaces/docente.interfaces'; // Importar DocenteDTO

//Interfaz simple para unificar las opciones del menu desplegable
interface RecipientOption {
  id: number,
  full_name: string
}

@Component({
  selector: 'app-admin-certificates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="module-content">
    <div class="module-header">
      <h2>Gestión de Constancias</h2>
       <div class="header-actions">
        <div class="search-container">
          <input type="text" [(ngModel)]="searchTerm" (input)="filterCertificates()" placeholder="Buscar por serial o participante...">
        </div>
        <button class="primary-btn" (click)="showForm = true; resetForm()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Emitir Constancia
      </button>
      </div>
    </div>

    <div *ngIf="showForm" class="form-card">
      <h3>Emitir Nueva Constancia</h3>
      <form (ngSubmit)="issueCertificate()" class="form-grid">
        <div class="form-group">
          <label>Producto Educativo *</label>
          <select [(ngModel)]="newCertificate.course_id" name="course_id" (change)="updateCertificateKind()" required>
            <option [ngValue]="null" disabled>Seleccione el producto educativo...</option>
            <option *ngFor="let course of courses" [value]="course.id">
              {{ course.name }} ({{ course.code }})
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>Destinatario *</label>
          <select [(ngModel)]="selectedRecipientType" name="recipient_type" (change)="onRecipientTypeChange()">
            <option value="participant">Participante</option>
            <option value="docente">Docente (Ponente)</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>{{ selectedRecipientType === 'participant' ? 'Participante' : 'Docente' }} *</label>
          <select [(ngModel)]="newCertificate.participant_id" name="participant_id" required>
            <option [ngValue]="null" disabled>Seleccionar...</option>
            <option *ngFor="let person of (selectedRecipientType === 'participant' ? participantOptions : docenteOptions)" [value]="person.id">
              {{ person.full_name }}
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Tipo de Constancia (Automático)</label>
          <input type="text" [value]="getKindDisplayName(newCertificate.kind)" name="kind_display" disabled class="form-control-disabled">
        </div>

        <div class="form-actions">
          <button type="button" class="secondary-btn" (click)="cancelForm()">Cancelar</button>
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
          <tr *ngFor="let cert of filteredCertificates">
            <td><span class="serial-tag">{{ cert.serial }}</span></td>
            <td>{{ cert.participant_name }}</td>
            <td>{{ cert.course_name }}</td>
            <td><span class="badge" [class]="'type-' + cert.kind.toLowerCase()">{{ cert.kind.replace('_', ' ') }}</span></td>
            <td><span class="status" [class]="'status-' + cert.status.toLowerCase()">{{ cert.status.replace('_', ' ') }}</span></td>
            <td>{{ cert.issued_at ? (cert.issued_at | date:'dd/MM/yyyy HH:mm') : 'N/A' }}</td>
            <td class="actions-cell">
              <button class="icon-btn download" 
                      *ngIf="cert.status === 'LISTO_PARA_DESCARGAR'"
                      (click)="downloadCertificate(cert.serial)"
                      title="Ver / Descargar PDF">
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M5 20h14v-2H5v2zm14-9h-4V3H9v8H5l7 7 7-7z"/></svg>
              </button>
              <button class="icon-btn delete" 
                      (click)="deleteCertificate(cert.id)"
                      title="Eliminar Constancia">
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
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
 .module-content h2 { color: #1e293b; margin: 0 0 24px 0; font-size: 28px; font-weight: 600; }
    .module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .primary-btn { display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
    .primary-btn:hover { transform: translateY(-1px); }
    .secondary-btn { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; padding: 12px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
    .secondary-btn:hover { background: #e2e8f0; }
    .form-card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
    .form-card h3 { color: #1e293b; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
    .form-group { display: flex; flex-direction: column; }
    .form-group label { color: #374151; font-weight: 600; margin-bottom: 8px; font-size: 14px; }
    .form-group input, .form-group select { padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; transition: border-color 0.2s; }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: #3b82f6; }
    .form-actions { display: flex; gap: 12px; grid-column: 1 / -1; margin-top: 8px; justify-content: flex-end; }
    .data-table table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; text-align: left; vertical-align: middle; }
    .data-table th { background: #f8fafc; font-weight: 600; color: #374151; }
    .data-table td { color: #64748b; }
    .data-table tbody tr:hover { background: #f8fafc; }
    .actions-cell { display: flex; gap: 8px; }
    .icon-btn { width: 36px; height: 36px; border: none; border-radius: 50%; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; background: transparent; }
    .icon-btn.download { color: #16a34a; }
    .icon-btn.download:hover { background: #dcfce7; }
    .icon-btn.delete { color: #ef4444; }
    .icon-btn.delete:hover { background: #fee2e2; }
    .no-data { text-align: center; padding: 32px; color: #9ca3af; }
    .serial-tag { background: #eef2ff; color: #4338ca; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 12px; }
    .badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
    .status { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
    .type-pildora_participante, .type-inyeccion_participante { background: #dbeafe; color: #2563eb; }
    .type-pildora_ponente, .type-inyeccion_ponente { background: #fef3c7; color: #d97706; }
    .type-aprobacion { background: #dcfce7; color: #16a34a; }
    .type-asistencia { background: #e0e7ff; color: #4338ca; }
    .status-listo_para_descargar { background: #dcfce7; color: #16a34a; }
    .status-en_proceso { background: #fef3c7; color: #d97706; }
    .form-control-disabled { background-color: #f3f4f6; cursor: not-allowed; color: #6b7280; }
    .search-container {
      position: relative;
    }

    .search-container input {
      padding: 10px 10px 10px 35px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      width: 250px;
      transition: all 0.2s;
    }
  `]
})
export default class AdminCertificatesComponent implements OnInit {
  private http = inject(HttpClient);


  certificates: CertificateDTO[] = [];
  filteredCertificates: CertificateDTO[] = [];
  courses: CourseDTO[] = [];
 
  //Listas originales con los DTOs completos
  private participants: ParticipantDTO[] = [];
  private docentes: DocenteDTO[] = []; 

  //Correción: Listas simplificadas solo para el formulario
  participantOptions: RecipientOption[] = [];
  docenteOptions: RecipientOption[] = [];
  
  showForm = false;
  newCertificate!: CreateCertificateDTO;
  selectedRecipientType: 'participant' | 'docente' = 'participant';
  searchTerm: string = '';

  constructor() {
    this.resetForm();
  }

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };
    
    this.http.get<CertificateDTO[]>('http://127.0.0.1:8000/api/admin/certificates', { headers })
      .subscribe(data => {
        this.certificates = data;
        this.filteredCertificates = data;
      });
    
    this.http.get<CourseDTO[]>('http://127.0.0.1:8000/api/admin/courses', { headers })
      .subscribe(data => this.courses = data);

    //Mapear los datos a las listas de opciones simplificadas
    this.http.get<ParticipantDTO[]>('http://127.0.0.1:8000/api/admin/participants', { headers })
      .subscribe(data => {
        this.participants = data;
        this.participantOptions = data.map(p => ({ id: p.id, full_name: p.full_name }));
      });
    
    this.http.get<DocenteDTO[]>('http://127.0.0.1:8000/api/admin/docentes', { headers })
      .subscribe(data => {
        this.docentes = data;
        this.docenteOptions = data.map(d => ({ id: d.id, full_name: d.full_name }));
      });
  }

  filterCertificates(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredCertificates = this.certificates.filter(cert => 
      cert.serial.toLowerCase().includes(term) || 
      cert.participant_name.toLowerCase().includes(term)
    );
  }

  resetForm() {
    this.newCertificate = {
      course_id: '',
      participant_id: '',
      kind: 'PILDORA_PARTICIPANTE'
    };
    this.selectedRecipientType = 'participant';
  }

  cancelForm() {
    this.showForm = false;
    this.resetForm();
  }

  onRecipientTypeChange() {
    this.newCertificate.participant_id = '';
    this.updateCertificateKind();
  }

   updateCertificateKind() {
    if (!this.newCertificate.course_id) return;
    
    const course = this.courses.find(c => c.id == this.newCertificate.course_id);
    if (!course) return;

    const isParticipant = this.selectedRecipientType === 'participant';

    switch (course.course_type) {
      case 'PILDORA_EDUCATIVA':
        this.newCertificate.kind = isParticipant ? 'PILDORA_PARTICIPANTE' : 'PILDORA_PONENTE';
        break;
      case 'INYECCION_EDUCATIVA':
        this.newCertificate.kind = isParticipant ? 'INYECCION_PARTICIPANTE' : 'INYECCION_PONENTE';
        break;
      case 'CURSO_EDUCATIVO':
        this.newCertificate.kind = isParticipant ? 'CURSO_PARTICIPANTE' : 'CURSO_PONENTE'; // Ejemplo de lógica para cursos
        break;
    }
  }

  getKindDisplayName(kind: string): string {
    const names: { [key: string]: string } = {
      'PILDORA_PARTICIPANTE': 'Píldora (Participante)',
      'PILDORA_PONENTE': 'Píldora (Ponente)',
      'INYECCION_PARTICIPANTE': 'Inyección (Participante)',
      'INYECCION_PONENTE': 'Inyección (Ponente)',
      'CURSO_PARTICIPANTE': 'Curso (Participante)',
      'CURSO_PONENTE': 'Curso (Ponente)',
    };
    return names[kind] || 'Seleccione opciones';
  }

  issueCertificate() {
    if (!this.newCertificate.course_id || !this.newCertificate.participant_id) {
      alert('Por favor, seleccione un curso y un participante.');
      return;
    }

    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.post<CertificateDTO>('http://127.0.0.1:8000/api/admin/certificates/issue', this.newCertificate, { headers })
      .subscribe({
        next: (newCert) => {
          alert(`Constancia emitida con estado: ${newCert.status.replace(/_/g, ' ')}.`);
          this.loadInitialData;
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
  
  deleteCertificate(id: number) {
    if (confirm('¿Está seguro que desea eliminar esta constancia? Esta acción no se puede deshacer.')) {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      this.http.delete(`http://127.0.0.1:8000/api/admin/certificates/${id}`, { headers })
        .subscribe({
          next: () => {
            alert('Constancia eliminada exitosamente.');
            this.certificates = this.certificates.filter(c => c.id !== id);
          },
          error: (err) => {
            console.error('Error al eliminar constancia:', err);
            alert(`Error: ${err.error?.detail || 'No se pudo eliminar la constancia.'}`);
          }
        });
    }
  }
}