import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

// Interfaces y Servicios actualizados
import { DocenteDTO } from '@shared/interfaces/docente.interfaces'
import { DocenteService } from '@shared/services/docente.service';

@Component({
  selector: 'app-admin-docentes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="container">
      <header class="header">
        <h1>Gestión de Docentes</h1>
        <button class="primary-btn" (click)="toggleForm()">
          {{ showForm ? 'Cancelar' : 'Nuevo Docente' }}
        </button>
      </header>

      <div *ngIf="showForm" class="form-card">
        <h3>{{ isEditing ? 'Editar' : 'Registrar' }} Docente</h3>
        <form [formGroup]="docenteForm" (ngSubmit)="onSubmit()">
          
          <div class="form-group">
            <label for="nombre_completo">Nombre Completo *</label>
            <input id="nombre_completo" formControlName="nombre_completo" required>
          </div>

          <div class="form-group">
            <label for="email_institucional">Email Institucional *</label>
            <input id="email_institucional" type="email" formControlName="email_institucional" required>
          </div>

          <div class="form-group">
            <label for="email_personal">Email Personal</label>
            <input id="email_personal" type="email" formControlName="email_personal">
          </div>

          <div class="form-group">
            <label for="telefono">Teléfono</label>
            <input id="telefono" formControlName="telefono">
          </div>

          <div class="form-group">
            <label for="whatsapp">WhatsApp</label>
            <input id="whatsapp" formControlName="whatsapp">
          </div>

          <div class="form-actions">
            <button type="button" class="secondary-btn" (click)="toggleForm()">Cancelar</button>
            <button type="submit" class="primary-btn" [disabled]="docenteForm.invalid">
              {{ isEditing ? 'Actualizar' : 'Crear' }}
            </button>
          </div>
        </form>
      </div>

      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th>Nombre Completo</th>
              <th>Email Institucional</th>
              <th>Email Personal</th>
              <th>Contacto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let docente of docentes">
              <td>{{ docente.nombre_completo }}</td>
              <td>{{ docente.email_institucional }}</td>
              <td>{{ docente.email_personal || 'N/A' }}</td>
              <td>
                <div class="contact-info">
                  <span *ngIf="docente.telefono">Tel: {{ docente.telefono }}</span>
                  <span *ngIf="docente.whatsapp">WA: {{ docente.whatsapp }}</span>
                </div>
              </td>
              <td class="actions">
                <button class="icon-btn edit" (click)="editDocente(docente)" title="Editar">✏️</button>
                <button class="icon-btn delete" (click)="deleteDocente(docente)" title="Eliminar">🗑️</button>
              </td>
            </tr>
             <tr *ngIf="docentes.length === 0">
              <td colspan="5">No hay docentes registrados.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  // Los estilos se pueden mover a un archivo .css separado
  styles: [ `
    :host { display: block; padding: 2rem; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .form-card { background: #fff; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-bottom: 2rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: .5rem; font-weight: 600; }
    .form-group input { width: 100%; padding: .75rem; border: 1px solid #ccc; border-radius: 4px; }
    .form-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
    .data-table table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: .75rem; border-bottom: 1px solid #eee; text-align: left; }
    .data-table th { background-color: #f9f9f9; }
    .actions { display: flex; gap: .5rem; }
    .contact-info { display: flex; flex-direction: column; }
    .primary-btn, .secondary-btn, .icon-btn { border: none; padding: .75rem 1.5rem; border-radius: 4px; cursor: pointer; }
    .primary-btn { background-color: #3f51b5; color: white; }
    .secondary-btn { background-color: #f0f0f0; }
    .icon-btn { padding: .5rem; line-height: 1; }
    .edit { background-color: #ffc107; }
    .delete { background-color: #f44336; color: white; }
  `]
})
export default class AdminDocentesComponent implements OnInit {
  private docenteService = inject(DocenteService);
  private fb = inject(FormBuilder);

  docentes: DocenteDTO[] = [];
  showForm = false;
  isEditing = false;
  currentDocenteId: number | null = null;
  docenteForm: FormGroup;

  constructor() {
    this.docenteForm = this.fb.group({
      nombre_completo: ['', Validators.required],
      email_institucional: ['', [Validators.required, Validators.email]],
      email_personal: ['', [Validators.email]],
      telefono: [''],
      whatsapp: ['']
    });
  }

  ngOnInit() {
    this.loadDocentes();
  }

  loadDocentes() {
    this.docenteService.getAll().subscribe(data => {
      this.docentes = data;
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
    this.isEditing = false;
    this.docenteForm.reset();
    this.currentDocenteId = null;
  }
  
  editDocente(docente: DocenteDTO) {
    this.isEditing = true;
    this.currentDocenteId = docente.id;
    this.showForm = true;
    this.docenteForm.patchValue(docente);
  }

  deleteDocente(docente: DocenteDTO) {
    if (confirm(`¿Está seguro que desea eliminar a ${docente.nombre_completo}?`)) {
      this.docenteService.delete(docente.id).subscribe(() => {
        this.loadDocentes();
        alert('Docente eliminado exitosamente.');
      });
    }
  }

  onSubmit() {
    if (this.docenteForm.invalid) return;

    if (this.isEditing && this.currentDocenteId) {
      // Lógica de Actualización
      this.docenteService.update(this.currentDocenteId, this.docenteForm.value).subscribe(() => {
        this.loadDocentes();
        this.toggleForm();
        alert('Docente actualizado exitosamente.');
      });
    } else {
      // Lógica de Creación
      this.docenteService.create(this.docenteForm.value).subscribe(() => {
        this.loadDocentes();
        this.toggleForm();
        alert('Docente creado exitosamente.');
      });
    }
  }
}