//ruta: frontend/lania-ui/src/app/features/dashboard/docentes/admin-docentes.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

// Interfaces y Servicios actualizados y centralizados
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
      especialidad: [''], // Campo opcional
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
      error: () => {
        this.notificationService.showError('Error al cargar los docentes.');
        this.isLoading = false;
      }
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
        error: (err) => this.notificationService.showError(err.error?.detail || 'Error al eliminar el docente.')
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
        
        error: (err) => this.notificationService.showError(err.error?.detail || 'Error al actualizar el docente.')
      });
    } else {
      this.docenteService.create(formData as CreateDocenteDTO).subscribe({
        next: () => {
          this.notificationService.showSuccess('Docente creado exitosamente.');
          this.loadDocentes();
          this.toggleForm();
        },
        error: (err) => this.notificationService.showError(err.error?.detail || 'Error al crear el docente.')
      });
    }
  }
}