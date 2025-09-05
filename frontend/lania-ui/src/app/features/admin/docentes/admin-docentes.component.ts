// src/app/features/admin/docentes/admin-docentes.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Services
import { DocenteService } from '../../docente/docente.service';

// Interfaces
import { DocenteDTO, CreateDocenteDTO } from '../../../shared/interfaces/docente.interfaces';

@Component({
  selector: 'app-admin-docentes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-container">
      <header class="admin-header">
        <h1>Gestión de Docentes</h1>
        <button class="primary-btn" (click)="showForm = !showForm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nuevo Docente
        </button>
      </header>

      <!-- Docente Form -->
      <div *ngIf="showForm" class="form-card">
        <h3>Registrar Docente</h3>
        <form (ngSubmit)="createDocente()" class="form-grid">
          <div class="form-group">
            <label>Nombre Completo *</label>
            <input [(ngModel)]="newDocente.full_name" name="full_name" required>
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input type="email" [(ngModel)]="newDocente.email" name="email" required>
          </div>
          <div class="form-group">
            <label>Teléfono</label>
            <input [(ngModel)]="newDocente.telefono" name="telefono" placeholder="Opcional">
          </div>
          <div class="form-group">
            <label>Especialidad</label>
            <input [(ngModel)]="newDocente.especialidad" name="especialidad" placeholder="Opcional">
          </div>
          <div class="form-actions">
            <button type="button" class="secondary-btn" (click)="showForm = false">Cancelar</button>
            <button type="submit" class="primary-btn">Crear Docente</button>
          </div>
        </form>
      </div>

      <!-- Docentes Table -->
      <div class="data-table">
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
            <tr *ngFor="let docente of docentes">
              <td>{{docente.full_name}}</td>
              <td>{{docente.email}}</td>
              <td>{{docente.telefono || 'N/A'}}</td>
              <td>{{docente.especialidad || 'N/A'}}</td>
              <td>
                <span class="status" [class]="docente.is_active ? 'status-active' : 'status-inactive'">
                  {{docente.is_active ? 'Activo' : 'Inactivo'}}
                </span>
              </td>
              <td>{{docente.fecha_registro | date:'dd/MM/yyyy'}}</td>
              <td>
                <button class="icon-btn delete" 
                        (click)="disableDocente(docente.id)" 
                        [disabled]="!docente.is_active"
                        title="Desactivar docente">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18"></path>
                    <path d="M6 6l12 12"></path>
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .admin-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .admin-header h1 {
      color: #1e293b;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
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
    }

    .data-table {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
    }

    .data-table table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th {
      background: #f8fafc;
      padding: 16px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 1px solid #e2e8f0;
    }

    .data-table td {
      padding: 16px;
      border-bottom: 1px solid #f1f5f9;
      color: #64748b;
    }

    .data-table tbody tr:hover {
      background: #f8fafc;
    }

    .status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-active {
      background: #dcfce7;
      color: #16a34a;
    }

    .status-inactive {
      background: #fecaca;
      color: #dc2626;
    }

    .icon-btn {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .icon-btn.delete {
      background: #fecaca;
      color: #dc2626;
    }

    .icon-btn.delete:hover:not(:disabled) {
      background: #fca5a5;
    }

    .icon-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #f1f5f9 !important;
      color: #9ca3af !important;
    }

    @media (max-width: 768px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
      
      .admin-header {
        flex-direction: column;
        gap: 16px;
        align-items: flex-start;
      }
    }
  `]
})
export default class AdminDocentesComponent implements OnInit {
  private docenteService = inject(DocenteService);
  private router = inject(Router);

  docentes: DocenteDTO[] = [];
  showForm = false;

  newDocente: CreateDocenteDTO = {
    full_name: '',
    email: '',
    telefono: '',
    especialidad: ''
  };

  ngOnInit() {
    this.loadDocentes();
  }

  loadDocentes() {
    this.docenteService.list().subscribe({
      next: (docentes) => {
        this.docentes = docentes;
      },
      error: (error) => {
        console.error('Error loading docentes:', error);
      }
    });
  }

  createDocente() {
    // Validar campos requeridos
    if (!this.newDocente.full_name || !this.newDocente.email) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    this.docenteService.create(this.newDocente).subscribe({
      next: () => {
        this.loadDocentes();
        this.showForm = false;
        this.resetForm();
        alert('Docente creado exitosamente');
      },
      error: (error) => {
        console.error('Error creating docente:', error);
        const errorMessage = error.error?.detail || 'Error desconocido';
        alert('Error al crear docente: ' + errorMessage);
      }
    });
  }

  disableDocente(id: number) {
    if (confirm('¿Está seguro que desea desactivar este docente?')) {
      this.docenteService.disable(id).subscribe({
        next: () => {
          this.loadDocentes();
          alert('Docente desactivado exitosamente');
        },
        error: (error) => {
          console.error('Error disabling docente:', error);
          alert('Error al desactivar docente');
        }
      });
    }
  }

  private resetForm() {
    this.newDocente = {
      full_name: '',
      email: '',
      telefono: '',
      especialidad: ''
    };
  }
}