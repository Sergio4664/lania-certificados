// Ruta: frontend/lania-ui/src/app/features/dashboard/participantes/admin-participantes.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidatorFn } from '@angular/forms'; 
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

// Interfaces y Servicios actualizados y centralizados
import { Participante } from '@shared/interfaces/participante.interface';
import { ParticipanteService } from '@shared/services/participante.service';
import { NotificationService } from '@app/shared/services/notification.service';

// -------------------------------------------------------------
// V A L I D A D O R E S   P E R S O N A L I Z A D O S
// -------------------------------------------------------------

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

        // Limpiar el número de cualquier carácter no numérico
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

// -------------------------------------------------------------
// C O M P O N E N T E
// -------------------------------------------------------------
@Component({
  selector: 'app-admin-participantes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-participantes.component.html',
  styleUrls: ['./admin-participantes.component.css']
})
export default class AdminParticipantesComponent implements OnInit {
  private participanteService = inject(ParticipanteService);
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);

  participantes: Participante[] = [];
  filteredParticipants: Participante[] = [];
  participanteForm: FormGroup;
  
  showForm = false;
  isEditing = false;
  currentParticipantId: number | null = null;
  searchTerm: string = '';
  isLoading = false;

  // ✅ PROPIEDADES DE PAGINACIÓN
  readonly PARTICIPANTES_LIMIT = 15;
  skip = 0; // Offset (registro inicial a buscar)
  hasMoreParticipants = false; // Controla el botón Siguiente


  constructor() {
    this.participanteForm = this.fb.group({
      nombre_completo: ['', Validators.required],
      email_personal: ['', [Validators.required, Validators.email, emailDomainValidator()]],
      email_institucional: ['', [Validators.email, emailDomainValidator()]],
      telefono: ['', [phoneNumberValidator()]],
      whatsapp: ['', [phoneNumberValidator()]]
    });
  }
  
  get f() { return this.participanteForm.controls; }

  ngOnInit() {
    this.loadParticipants();
  }

  // 🔄 FUNCIÓN MODIFICADA: Implementa paginación con skip y limit + 1
  loadParticipants() {
    this.isLoading = true;
    
    // Solicitamos LIMIT + 1 (16 registros) para saber si hay una página siguiente
    const requestLimit = this.PARTICIPANTES_LIMIT + 1;

    // ✅ Pasar skip y el límite de solicitud al servicio
    this.participanteService.getAll(this.skip, requestLimit).subscribe({
        next: (data) => {
            // Verificar si hay más de 15 para saber si habilitar 'Siguiente'
            this.hasMoreParticipants = data.length > this.PARTICIPANTES_LIMIT;

            // Recortar la lista para mostrar solo los 15 elementos de la página actual
            const currentBatch = data.slice(0, this.PARTICIPANTES_LIMIT);

            this.participantes = currentBatch; 
            this.filterParticipants();
            this.isLoading = false;
        },
        error: (err: HttpErrorResponse) => {
            this.isLoading = false;
            this.handleError(err, 'Error al cargar participantes');
        }
    });
  }
  
  // ✅ NUEVA FUNCIÓN: Siguiente página
  nextPageParticipants(): void {
    this.skip += this.PARTICIPANTES_LIMIT;
    this.loadParticipants();
  }
  
  // ✅ NUEVA FUNCIÓN: Página anterior
  prevPageParticipants(): void {
    // Asegurar que skip nunca sea menor que 0
    this.skip = Math.max(0, this.skip - this.PARTICIPANTES_LIMIT);
    this.loadParticipants();
  }


  filterParticipants(): void {
    const term = this.searchTerm.toLowerCase();
    // NOTA: El filtro se aplica sobre la página actual de 15 registros.
    this.filteredParticipants = this.participantes.filter(p =>
      p.nombre_completo.toLowerCase().includes(term) ||
      (p.telefono && p.telefono.includes(term)) ||
      p.email_personal.toLowerCase().includes(term)
    );
  }

  toggleForm() {
    this.showForm = !this.showForm;
    this.isEditing = false;
    this.currentParticipantId = null;
    this.participanteForm.reset();
  }

  editParticipant(participante: Participante) {
    this.isEditing = true;
    this.currentParticipantId = participante.id;
    this.participanteForm.patchValue(participante);
    this.showForm = true;
  }

  /**
   * Elimina un participante...
   */
  deleteParticipant(participante: Participante): void {
    if (confirm(`¿Estás seguro de que quieres eliminar a ${participante.nombre_completo}?`)) {
      this.participanteService.delete(participante.id).subscribe({
        next: () => {
          this.notificationService.showSuccess('Participante eliminado correctamente.');
          // ✅ Resetear la paginación a la primera página y recargar
          this.skip = 0; 
          this.loadParticipants(); // Recargar la lista
        },
        error: (err: HttpErrorResponse) => {
          this.handleError(err, 'No se pudo eliminar al participante');
        }
      });
    }
  }

  onSubmit() {
    if (this.participanteForm.invalid) {
      this.notificationService.showError('Por favor, corrija los errores en el formulario antes de enviar.');
      this.participanteForm.markAllAsTouched();
      return;
    }

    const formData = this.participanteForm.value;

    if (this.isEditing && this.currentParticipantId) {
      this.participanteService.update(this.currentParticipantId, formData).subscribe({
        next: () => {
          this.notificationService.showSuccess('Participante actualizado exitosamente.');
          // ✅ Resetear la paginación a la primera página y recargar
          this.skip = 0;
          this.loadParticipants();
          this.toggleForm();
        },
        error: (err: HttpErrorResponse) => this.handleError(err, 'Error al actualizar el participante.')
      });
    } else {
      this.participanteService.create(formData).subscribe({
        next: () => {
          this.notificationService.showSuccess('Participante creado exitosamente.');
          // ✅ Resetear la paginación a la primera página y recargar
          this.skip = 0;
          this.loadParticipants();
          this.toggleForm();
        },
        error: (err: HttpErrorResponse) => this.handleError(err, 'Error al crear el participante.')
      });
    }
  }

  private handleError(error: HttpErrorResponse, fallbackMessage: string) {
    console.error('Backend Error:', error);
    let userMessage = fallbackMessage;
    const errorBody = error.error;

    if (errorBody) {
        if (typeof errorBody.detail === 'string') {
            userMessage = errorBody.detail;
        } else if (Array.isArray(errorBody.detail)) {
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