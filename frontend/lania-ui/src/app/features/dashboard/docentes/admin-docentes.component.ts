// frontend/lania-ui/src/app/features/dashboard/docentes/admin-docentes.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// 🚨 CAMBIO: Importar AbstractControl y ValidatorFn
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidatorFn } from '@angular/forms'; 
import { HttpErrorResponse } from '@angular/common/http';

// Interfaces y Servicios
import { DocenteDTO, CreateDocenteDTO, UpdateDocenteDTO } from '@shared/interfaces/docente.interfaces';
import { DocenteService } from '@shared/services/docente.service';
import { NotificationService } from '@app/shared/services/notification.service';


// -------------------------------------------------------------
// V A L I D A D O R E S   P E R S O N A L I Z A D O S
// -------------------------------------------------------------

// Dominios permitidos (replicando la lógica del backend)
const ALLOWED_EMAIL_DOMAINS = [
    '@gmail.com',
    '@hotmail.com',
    '@outlook.com',
    '@lania.edu.mx',
    // Añada aquí otros dominios si es necesario
];

/**
 * Validador para verificar que el correo electrónico pertenezca a un dominio permitido.
 */
function emailDomainValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
        const email = control.value as string;
        if (!email) {
            return null; // Permitir nulos/vacíos si no es requerido
        }
        
        // Verificar si el correo termina con alguno de los dominios permitidos
        const domainValid = ALLOWED_EMAIL_DOMAINS.some(domain => 
            email.toLowerCase().endsWith(domain)
        );

        return domainValid ? null : { 'forbiddenDomain': { value: email } };
    };
}

/**
 * Validador para la longitud del teléfono (mín. 10, máx. 14 dígitos).
 */
function phoneNumberValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
        const value = control.value as string;
        if (!value) {
            return null; // Permitir nulos/vacíos
        }

        // Limpiar el número de cualquier carácter no numérico (como en el backend)
        const cleanedNumber = value.replace(/[^0-9]/g, '');
        const length = cleanedNumber.length;

        if (length > 0 && length < 10) {
            return { 'minlength': { requiredLength: 10, actualLength: length } };
        }
        if (length > 14) {
            return { 'maxlength': { requiredLength: 14, actualLength: length } };
        }
        
        return null;
    };
}


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

  // 🚨 CAMBIO: Aplicación de validadores personalizados en la construcción del formulario
  constructor() {
    this.docenteForm = this.fb.group({
      nombre_completo: ['', Validators.required],
      especialidad: [''],
      // Aplicar Validators.email y emailDomainValidator()
      email_institucional: ['', [Validators.required, Validators.email, emailDomainValidator()]],
      // Aplicar Validators.email y emailDomainValidator() (es opcional, por lo que solo se aplica si tiene valor)
      email_personal: ['', [Validators.email, emailDomainValidator()]], 
      // Aplicar phoneNumberValidator()
      telefono: ['', [phoneNumberValidator()]], 
      // Aplicar phoneNumberValidator()
      whatsapp: ['', [phoneNumberValidator()]] 
    });
  }
  
  // 🚨 CAMBIO: Getter para un acceso más limpio a los controles en el HTML
  get f() { return this.docenteForm.controls; }

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
    // 🚨 CAMBIO: Ahora, si el formulario es inválido debido a los nuevos validadores, se detiene aquí.
    if (this.docenteForm.invalid) {
      this.notificationService.showError('Por favor, corrija los errores en el formulario antes de enviar.');
      // Opcional: Marcar todos los campos como "touched" para mostrar los errores inmediatamente
      this.docenteForm.markAllAsTouched();
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
        // Los errores de backend (como unicidad) todavía se manejan aquí y se muestran en el snackbar
        error: (err: HttpErrorResponse) => this.handleError(err, 'Error al crear el docente.')
      });
    }
  }

  // --- FUNCIÓN DE MANEJO DE ERRORES MEJORADA (Se mantiene para errores de backend) ---
  private handleError(error: HttpErrorResponse, fallbackMessage: string) {
    console.error('Backend Error:', error);
    let userMessage = fallbackMessage;
    const errorBody = error.error;

    if (errorBody) {
      // Si 'detail' es un string (error de unicidad personalizado desde FastAPI)
      if (typeof errorBody.detail === 'string') {
        userMessage = errorBody.detail;
      } 
      // Si 'detail' es un array (error de validación de Pydantic para errores que pasaron el frontend)
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