// Ruta: frontend/lania-ui/src/app/features/dashboard/participantes/admin-participantes.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
// 🚨 CAMBIO: Importar AbstractControl y ValidatorFn para validadores personalizados
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

  constructor() {
    // 🚨 CAMBIO: Aplicación de validadores personalizados
    this.participanteForm = this.fb.group({
      nombre_completo: ['', Validators.required],
      // Aplicar Validators.email y emailDomainValidator()
      email_personal: ['', [Validators.required, Validators.email, emailDomainValidator()]],
      // Aplicar Validators.email y emailDomainValidator() (es opcional)
      email_institucional: ['', [Validators.email, emailDomainValidator()]],
      // Aplicar phoneNumberValidator()
      telefono: ['', [phoneNumberValidator()]],
      // Aplicar phoneNumberValidator()
      whatsapp: ['', [phoneNumberValidator()]]
    });
  }
  
  // 🚨 CAMBIO: Getter para un acceso más limpio a los controles en el HTML
  get f() { return this.participanteForm.controls; }

  ngOnInit() {
    this.loadParticipants();
  }

  loadParticipants() {
    this.participanteService.getAll().subscribe(data => {
      this.participantes = data; 
      this.filteredParticipants = data;
    });
  }

  filterParticipants(): void {
    const term = this.searchTerm.toLowerCase();
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
   * Elimina un participante mostrando su nombre completo en el mensaje de confirmación.
   * 🚨 CAMBIO: Ahora recibe el objeto 'participante' completo.
   */
  deleteParticipant(participante: Participante): void {
    if (confirm(`¿Estás seguro de que quieres eliminar a ${participante.nombre_completo}?`)) {
      this.participanteService.delete(participante.id).subscribe({
        next: () => {
          this.notificationService.showSuccess('Participante eliminado correctamente.');
          this.loadParticipants(); // Recargar la lista
        },
        error: (err: HttpErrorResponse) => {
          this.handleError(err, 'No se pudo eliminar al participante');
        }
      });
    }
  }

  onSubmit() {
    // 🚨 CAMBIO: Usar la validación de Angular y marcar campos tocados para mostrar errores inline.
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
          this.loadParticipants();
          this.toggleForm();
        },
        error: (err: HttpErrorResponse) => this.handleError(err, 'Error al actualizar el participante.')
      });
    } else {
      this.participanteService.create(formData).subscribe({
        next: () => {
          this.notificationService.showSuccess('Participante creado exitosamente.');
          this.loadParticipants();
          this.toggleForm();
        },
        error: (err: HttpErrorResponse) => this.handleError(err, 'Error al crear el participante.')
      });
    }
  }

  // 🚨 CAMBIO: Manejo de errores más detallado para errores de validación que se cuelen del backend
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