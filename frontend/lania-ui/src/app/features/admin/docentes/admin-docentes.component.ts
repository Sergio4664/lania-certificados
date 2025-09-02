// src/app/features/admin/docentes/admin-docentes.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocenteService } from '../../docente/docente.service';
import { DocenteDTO, CreateDocenteDTO } from '../../../shared/interfaces/docente.interfaces';

@Component({
  standalone: true,
  selector: 'app-admin-docentes',
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Gestión de Docentes</h2>

    <form (ngSubmit)="create()" class="docente-form">
      <div class="form-row">
        <input [(ngModel)]="form.full_name" name="full_name" placeholder="Nombre completo" required />
        <input [(ngModel)]="form.email" name="email" type="email" placeholder="Correo" required />
      </div>
      <div class="form-row">
        <input [(ngModel)]="form.password" name="password" type="password" placeholder="Contraseña" required />
        <input [(ngModel)]="form.telefono" name="telefono" placeholder="Teléfono (opcional)" />
      </div>
      <div class="form-row">
        <input [(ngModel)]="form.especialidad" name="especialidad" placeholder="Especialidad (opcional)" />
        <button type="submit" class="btn-primary">Crear docente</button>
      </div>
    </form>

    <hr />

    <div class="docentes-table">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Especialidad</th>
            <th>Estado</th>
            <th>Fecha Registro</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let d of docentes">
            <td>{{d.full_name}}</td>
            <td>{{d.email}}</td>
            <td>{{d.telefono || 'N/A'}}</td>
            <td>{{d.especialidad || 'N/A'}}</td>
            <td>
              <span class="status" [class]="d.is_active ? 'active' : 'inactive'">
                {{ d.is_active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td>{{d.fecha_registro | date:'dd/MM/yyyy'}}</td>
            <td>
              <button (click)="disable(d.id)" [disabled]="!d.is_active" class="btn-danger">
                Desactivar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    h2 {
      color: #1e293b;
      margin-bottom: 24px;
    }

    .docente-form {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      align-items: center;
    }

    .form-row input {
      flex: 1;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
    }

    .form-row input:focus {
      outline: none;
      border-color: #3b82f6;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
    }

    .btn-primary:hover {
      background: #2563eb;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .btn-danger:hover:not(:disabled) {
      background: #dc2626;
    }

    .btn-danger:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .docentes-table {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      background: #f8fafc;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 1px solid #e5e7eb;
    }

    td {
      padding: 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #6b7280;
    }

    tbody tr:hover {
      background: #f8fafc;
    }

    .status {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .status.active {
      background: #dcfce7;
      color: #16a34a;
    }

    .status.inactive {
      background: #fecaca;
      color: #dc2626;
    }

    hr {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 24px 0;
    }
  `]
})
export default class AdminDocentesComponent implements OnInit {
  private docenteSvc = inject(DocenteService);
  docentes: DocenteDTO[] = [];

  form: CreateDocenteDTO = { 
    full_name: '', 
    email: '', 
    password: '', 
    telefono: '', 
    especialidad: '' 
  };

  ngOnInit() { 
    this.load(); 
  }

  load() {
    this.docenteSvc.list().subscribe({
      next: (rows) => this.docentes = rows,
      error: (error) => {
        console.error('Error loading docentes:', error);
        alert('Error al cargar docentes');
      }
    });
  }

  create() {
    // Validar campos requeridos
    if (!this.form.full_name || !this.form.email || !this.form.password) {
      alert('Por favor complete todos los campos requeridos (nombre, email y contraseña)');
      return;
    }

    this.docenteSvc.create(this.form).subscribe({
      next: () => {
        this.form = { 
          full_name: '', 
          email: '', 
          password: '', 
          telefono: '', 
          especialidad: '' 
        };
        this.load();
        alert('Docente creado exitosamente');
      },
      error: (err) => {
        console.error('Error creating docente:', err);
        const errorMessage = err.error?.detail || 'Error desconocido';
        alert('Error al crear docente: ' + errorMessage);
      }
    });
  }

  disable(id: number) {
    if (confirm('¿Está seguro de que desea desactivar este docente?')) {
      this.docenteSvc.disable(id).subscribe({
        next: () => {
          this.load();
          alert('Docente desactivado exitosamente');
        },
        error: (error) => {
          console.error('Error disabling docente:', error);
          alert('Error al desactivar docente');
        }
      });
    }
  }
}

// src/app/features/admin/courses/admin-course-create.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CourseService } from '../../courses/course.service';
import { DocenteService } from '../../docente/docente.service';
import { DocenteDTO } from '../../../shared/interfaces/docente.interfaces';
import { CreateCourseDTO } from '../../../shared/interfaces/course.interfaces';

@Component({
  standalone: true,
  selector: 'app-admin-course-create',
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Crear Curso</h2>
    
    <form (ngSubmit)="create()" class="course-form">
      <div class="form-row">
        <div class="form-group">
          <label>Código *</label>
          <input [(ngModel)]="courseData.code" name="code" placeholder="Código" required />
        </div>
        <div class="form-group">
          <label>Nombre del curso *</label>
          <input [(ngModel)]="courseData.name" name="name" placeholder="Nombre del curso" required />
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Fecha de inicio *</label>
          <input [(ngModel)]="courseData.start_date" name="start_date" type="date" required />
        </div>
        <div class="form-group">
          <label>Fecha de fin *</label>
          <input [(ngModel)]="courseData.end_date" name="end_date" type="date" required />
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label>Horas *</label>
          <input [(ngModel)]="courseData.hours" name="hours" type="number" min="1" required />
        </div>
      </div>

      <div class="form-group docentes-section">
        <label>Docentes asignados</label>
        <div class="docentes-list">
          <div class="docente-item" *ngFor="let docente of activeDocentes">
            <label>
              <input 
                type="checkbox" 
                [checked]="isDocenteSelected(docente.id)"
                (change)="toggleDocente(docente.id, $event)"
              />
              {{docente.full_name}} ({{docente.email}})
            </label>
          </div>
        </div>
        <div class="selected-docentes" *ngIf="selectedDocenteIds.length > 0">
          <strong>Docentes seleccionados:</strong>
          <div class="selected-tags">
            <span class="docente-tag" *ngFor="let id of selectedDocenteIds">
              {{getDocenteName(id)}}
              <button type="button" (click)="removeDocente(id)" class="remove-btn">×</button>
            </span>
          </div>
        </div>
      </div>

      <button type="submit" class="btn-primary" [disabled]="loading">
        {{loading ? 'Creando...' : 'Crear Curso'}}
      </button>
    </form>

    <div *ngIf="message" class="message" [class.error]="isError">
      {{message}}
    </div>
  `,
  styles: [`
    h2 {
      color: #1e293b;
      margin-bottom: 24px;
    }

    .course-form {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .form-row {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }

    .form-group {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      font-weight: 600;
      color: #374151;
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

    .docentes-section {
      margin: 24px 0;
    }

    .docentes-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 12px;
      margin: 16px 0;
      max-height: 200px;
      overflow-y: auto;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      background: #f9fafb;
    }

    .docente-item {
      display: flex;
      align-items: center;
    }

    .docente-item label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-weight: 500;
      color: #1f2937;
    }

    .docente-item input[type="checkbox"] {
      transform: scale(1.2);
    }

    .selected-docentes {
      margin-top: 16px;
      padding: 16px;
      background: #eff6ff;
      border-radius: 8px;
      border: 1px solid #bfdbfe;
    }

    .selected-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }

    .docente-tag {
      background: #3b82f6;
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .remove-btn {
      background: none;
      border: none;
      color: white;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.2s;
    }

    .remove-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
      width: auto;
      min-width: 150px;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    .btn-primary:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .message {
      margin-top: 16px;
      padding: 12px 16px;
      border-radius: 8px;
      font-weight: 500;
      background: #dcfce7;
      color: #16a34a;
      border: 1px solid #bbf7d0;
    }

    .message.error {
      background: #fecaca;
      color: #dc2626;
      border-color: #fca5a5;
    }

    @media (max-width: 768px) {
      .form-row {
        flex-direction: column;
        gap: 16px;
      }

      .docentes-list {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export default class AdminCourseCreateComponent implements OnInit {
  private courseSvc = inject(CourseService);
  private docenteSvc = inject(DocenteService);

  docentes: DocenteDTO[] = [];
  selectedDocenteIds: number[] = [];
  loading = false;
  message = '';
  isError = false;

  courseData: CreateCourseDTO = {
    code: '',
    name: '',
    start_date: '',
    end_date: '',
    hours: 8,
    created_by: 2, // TODO: Get from auth service
    docente_ids: []
  };

  ngOnInit() {
    this.loadDocentes();
  }

  get activeDocentes(): DocenteDTO[] {
    return this.docentes.filter(d => d.is_active);
  }

  loadDocentes() {
    this.docenteSvc.list().subscribe({
      next: (docentes) => this.docentes = docentes,
      error: (error) => {
        console.error('Error loading docentes:', error);
        this.showMessage('Error al cargar docentes', true);
      }
    });
  }

  isDocenteSelected(docenteId: number): boolean {
    return this.selectedDocenteIds.includes(docenteId);
  }

  toggleDocente(docenteId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedDocenteIds.includes(docenteId)) {
        this.selectedDocenteIds.push(docenteId);
      }
    } else {
      this.selectedDocenteIds = this.selectedDocenteIds.filter(id => id !== docenteId);
    }
  }

  removeDocente(docenteId: number): void {
    this.selectedDocenteIds = this.selectedDocenteIds.filter(id => id !== docenteId);
  }

  getDocenteName(docenteId: number): string {
    const docente = this.docentes.find(d => d.id === docenteId);
    return docente ? docente.full_name : 'Docente no encontrado';
  }

  create() {
    // Validaciones
    if (!this.courseData.code || !this.courseData.name || !this.courseData.start_date || 
        !this.courseData.end_date || !this.courseData.hours) {
      this.showMessage('Por favor complete todos los campos requeridos', true);
      return;
    }

    if (new Date(this.courseData.end_date) <= new Date(this.courseData.start_date)) {
      this.showMessage('La fecha de fin debe ser posterior a la fecha de inicio', true);
      return;
    }

    if (this.courseData.hours <= 0) {
      this.showMessage('Las horas deben ser un número positivo', true);
      return;
    }

    this.loading = true;
    this.message = '';

    // Asignar docentes seleccionados
    this.courseData.docente_ids = [...this.selectedDocenteIds];

    this.courseSvc.create(this.courseData).subscribe({
      next: (course) => {
        console.log('Course created:', course);
        this.showMessage('Curso creado exitosamente', false);
        this.resetForm();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error creating course:', error);
        const errorMessage = error.error?.detail || 'Error desconocido';
        this.showMessage('Error al crear curso: ' + errorMessage, true);
        this.loading = false;
      }
    });
  }

  resetForm() {
    this.courseData = {
      code: '',
      name: '',
      start_date: '',
      end_date: '',
      hours: 8,
      created_by: 2,
      docente_ids: []
    };
    this.selectedDocenteIds = [];
  }

  showMessage(msg: string, error: boolean) {
    this.message = msg;
    this.isError = error;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }
}