// src/app/features/dashboard/admin-docentes.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DocenteDTO, CreateDocenteDTO, UpdateDocenteDTO } from '../../shared/interfaces/docente.interfaces';

@Component({
  selector: 'app-admin-docentes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-container">
      <header class="admin-header">
        <h1>Gestión de Docentes</h1>
        <div class="header-actions">
          <div class="search-container">
            <input type="text" [(ngModel)]="searchTerm" (input)="filterDocentes()" placeholder="Buscar por nombre...">
            <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <button class="primary-btn" (click)="showForm = true; editingDocente = null; resetForm()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Nuevo Docente
          </button>
        </div>
      </header>

      <div *ngIf="showForm" class="form-card">
        <h3>{{ editingDocente ? 'Editar Docente' : 'Registrar Docente' }}</h3>
        <form (ngSubmit)="editingDocente ? updateDocente() : createDocente()" class="form-grid">
          <div class="form-group">
            <label>Nombre Completo *</label>
            <input [(ngModel)]="docenteForm.full_name" name="full_name" required>
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input type="email" [(ngModel)]="docenteForm.email" name="email" required>
          </div>
          <div class="form-group">
            <label>Teléfono</label>
            <input [(ngModel)]="docenteForm.telefono" name="telefono" placeholder="Obligatorio">
          </div>
          <div class="form-group">
            <label>Especialidad</label>
            <input [(ngModel)]="docenteForm.especialidad" name="especialidad" placeholder="Opcional">
          </div>
          <div class="form-actions">
            <button type="button" class="secondary-btn" (click)="cancelForm()">Cancelar</button>
            <button type="submit" class="primary-btn">{{ editingDocente ? 'Actualizar' : 'Crear' }} Docente</button>
          </div>
        </form>
      </div>

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
            <tr *ngFor="let docente of filteredDocentes">
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
                <button class="icon-btn edit" (click)="editDocente(docente)" title="Editar Docente">
                  <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </button>
                <button class="icon-btn delete" (click)="deleteDocente(docente.id)" title="Eliminar Docente">
                  <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
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

    .header-actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }

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
    
    .search-container input:focus {
      border-color: #667eea;
      outline: none;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: #9ca3af;
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
    
    .data-table td:last-child {
      display: flex;
      gap: 8px;
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
    
    .icon-btn.edit {
      background: #fef3c7;
      color: #d97706;
    }
    
    .icon-btn.edit:hover {
      background: #fde68a;
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
  private http = inject(HttpClient);

  docentes: DocenteDTO[] = [];
  filteredDocentes: DocenteDTO[] = [];
  showForm = false;
  editingDocente: DocenteDTO | null = null;
  docenteForm!: CreateDocenteDTO;
  searchTerm: string = '';

  constructor() {
    this.resetForm();
  }

  ngOnInit() {
    this.loadDocentes();
  }

  loadDocentes() {
    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<DocenteDTO[]>('http://127.0.0.1:8000/api/admin/docentes', { headers })
      .subscribe(data => {
        this.docentes = data;
        this.filteredDocentes = data;
      });
  }

  filterDocentes() {
    if (!this.searchTerm) {
      this.filteredDocentes = this.docentes;
      return;
    }
    this.filteredDocentes = this.docentes.filter(docente =>
      docente.full_name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  resetForm() {
    this.docenteForm = {
      full_name: '',
      email: '',
      telefono: '',
      especialidad: ''
    };
  }
  
  cancelForm() {
    this.showForm = false;
    this.editingDocente = null;
    this.resetForm();
  }

  createDocente() {
    if (!this.docenteForm.full_name || !this.docenteForm.email || !this.docenteForm.telefono) {
      alert('Por favor complete todos los campos requeridos.');
      return;
    }
    if (!this.docenteForm.email.endsWith('@lania.edu.mx')) {
        alert('El correo debe tener el dominio @lania.edu.mx');
        return;
    }

    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.post('http://127.0.0.1:8000/api/admin/docentes', this.docenteForm, { headers })
      .subscribe({
        next: () => {
          alert('Docente creado exitosamente');
          this.loadDocentes();
          this.cancelForm();
        },
        error: (err) => {
          console.error('Error al crear docente:', err);
          alert(`Error al crear docente: ${err.error?.detail || 'Error desconocido'}`);
        }
      });
  }

  editDocente(docente: DocenteDTO) {
    this.editingDocente = docente;
    this.docenteForm = {
      full_name: docente.full_name,
      email: docente.email,
      telefono: docente.telefono || '',
      especialidad: docente.especialidad || ''
    };
    this.showForm = true;
  }

  updateDocente() {
    if (!this.editingDocente) return;

    if (!this.docenteForm.full_name || !this.docenteForm.email || !this.docenteForm.telefono) {
      alert('Por favor complete todos los campos requeridos.');
      return;
    }
    if (!this.docenteForm.email.endsWith('@lania.edu.mx')) {
        alert('El correo debe tener el dominio @lania.edu.mx');
        return;
    }

    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };
    
    const updateData: UpdateDocenteDTO = { ...this.docenteForm };

    this.http.put(`http://127.0.0.1:8000/api/admin/docentes/${this.editingDocente.id}`, updateData, { headers })
      .subscribe({
        next: () => {
          alert('Docente actualizado exitosamente');
          this.loadDocentes();
          this.cancelForm();
        },
        error: (err) => {
          console.error('Error al actualizar docente:', err);
          alert(`Error al actualizar docente: ${err.error?.detail || 'Error desconocido'}`);
        }
      });
  }

  deleteDocente(id: number) {
    if (confirm('¿Está seguro que desea eliminar este docente? Esta acción no se puede deshacer.')) {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      this.http.delete(`http://127.0.0.1:8000/api/admin/docentes/${id}`, { headers })
        .subscribe({
          next: () => {
            alert('Docente eliminado exitosamente');
            this.loadDocentes();
          },
          error: (err) => {
            console.error('Error eliminando docente:', err);
            alert(`Error al eliminar docente: ${err.error?.detail || 'Error desconocido'}`);
          }
        });
    }
  }
}