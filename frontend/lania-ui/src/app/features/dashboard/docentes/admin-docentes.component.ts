// frontend/lania-ui/src/app/features/dashboard/docentes/admin-docentes.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

// Interfaces y Servicios
import { DocenteDTO, CreateDocenteDTO, UpdateDocenteDTO } from '@shared/interfaces/docente.interfaces';
import { DocenteService } from '@shared/services/docente.service';
import { NotificationService } from '@app/shared/services/notification.service';

@Component({
  selector: 'app-admin-docentes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-docentes.component.html',
  styleUrls: ['./admin-docentes.component.css']
})
export default class AdminDocentesComponent implements OnInit {
  private docenteService = inject(DocenteService);
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);

  docentes: DocenteDTO[] = [];
  filteredDocentes: DocenteDTO[] = [];
  docenteForm: FormGroup;
  
  showForm = false;
  isEditing = false;
  currentDocenteId: number | null = null;
  searchTerm: string = '';
  isLoading = false;

  constructor() {
    this.docenteForm = this.fb.group({
      nombre_completo: ['', Validators.required],
      especialidad: [''],
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
    this.isLoading = true;
    this.docenteService.getAll().subscribe({
      next: (data) => {
        this.docentes = data;
        this.filteredDocentes = data;
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => this.handleError(err, 'Error al cargar los docentes.')
    });
  }

  filterDocentes() {
    const term = this.searchTerm.toLowerCase();
    this.filteredDocentes = this.docentes.filter(docente =>
      docente.nombre_completo.toLowerCase().includes(term) ||
      docente.especialidad?.toLowerCase().includes(term)
    );
  }

  toggleForm() {
    this.showForm = !this.showForm;
    this.isEditing = false;
    this.currentDocenteId = null;
    this.docenteForm.reset();
  }

  editDocente(docente: DocenteDTO) {
    this.isEditing = true;
    this.currentDocenteId = docente.id;
    this.docenteForm.patchValue(docente);
    this.showForm = true;
  }
  
  deleteDocente(docente: DocenteDTO) {
    if (confirm(`¿Está seguro que desea eliminar a ${docente.nombre_completo}?`)) {
      this.docenteService.delete(docente.id).subscribe({
        next: () => {
          this.notificationService.showSuccess('Docente eliminado exitosamente.');
          this.loadDocentes();
        },
        error: (err: HttpErrorResponse) => this.handleError(err, 'Error al eliminar el docente.')
      });
    }
  }

  onSubmit() {
    if (this.docenteForm.invalid) {
      this.notificationService.showError('Por favor, complete todos los campos requeridos.');
      return;
    }

    const formData = this.docenteForm.value;

    if (this.isEditing && this.currentDocenteId) {
      this.docenteService.update(this.currentDocenteId, formData as UpdateDocenteDTO).subscribe({
        next: () => {
          this.notificationService.showSuccess('Docente actualizado exitosamente.');
          this.loadDocentes();
          this.toggleForm();
        },
        error: (err: HttpErrorResponse) => this.handleError(err, 'Error al actualizar el docente.')
      });
    } else {
      this.docenteService.create(formData as CreateDocenteDTO).subscribe({
        next: () => {
          this.notificationService.showSuccess('Docente creado exitosamente.');
          this.loadDocentes();
          this.toggleForm();
        },
        error: (err: HttpErrorResponse) => this.handleError(err, 'Error al crear el docente.')
      });
    }
  }

  // --- FUNCIÓN DE MANEJO DE ERRORES MEJORADA ---
  private handleError(error: HttpErrorResponse, fallbackMessage: string) {
    console.error('Backend Error:', error);
    let userMessage = fallbackMessage;
    const errorBody = error.error;

    if (errorBody) {
      // Si 'detail' es un string (error de unicidad personalizado desde FastAPI)
      if (typeof errorBody.detail === 'string') {
        userMessage = errorBody.detail;
      } 
      // Si 'detail' es un array (error de validación de Pydantic)
      else if (Array.isArray(errorBody.detail)) {
        // Formateamos el primer error del array para mostrarlo
        const firstError = errorBody.detail[0];
        if (firstError && firstError.msg) {
          const field = firstError.loc[1] || 'campo';
          userMessage = `Error en '${field}': ${firstError.msg}`;
        }
      }
    }
    
    this.notificationService.showError(userMessage);
  }
}