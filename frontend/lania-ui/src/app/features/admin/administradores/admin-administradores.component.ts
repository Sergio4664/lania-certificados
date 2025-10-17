//Ruta: frontend/lania-ui/src/app/features/admin/administradores/admin-administradores.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

// Usando tus interfaces y servicios existentes
import { Administrador } from '@shared/interfaces/administrador.interface';
import { AdministradorService } from '@shared/services/administrador.service';
import { NotificationService } from '@shared/services/notification.service';

@Component({
  selector: 'app-admin-administradores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-administradores.component.html',
  styleUrls: ['./admin-administradores.component.css']
})
export default class AdminAdministradoresComponent implements OnInit {
  private adminService = inject(AdministradorService);
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);

  administradores: Administrador[] = [];
  adminForm: FormGroup;
  showForm = false;
  isEditing = false;
  currentAdminId: number | null = null;
  isLoading = false;

  constructor() {
    // Tu formulario se mantiene igual, ya que la validación del lado del cliente es correcta.
    this.adminForm = this.fb.group({
      nombre_completo: ['', [Validators.required, Validators.minLength(3)]],
      // NOTA: El backend parece no usar este campo 'email', solo 'email_institucional'.
      // Lo mantenemos para no romper tu formulario actual, pero considera si es necesario.
      email: ['', [Validators.required, Validators.email]],
      email_institucional: ['', [
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@lania\.edu\.mx$/)
      ]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      telefono: ['', [
        Validators.required,
        Validators.pattern(/^(\d{10}|\d{12})$/)
      ]],
      whatsapp: ['', [
        Validators.required,
        Validators.pattern(/^(\d{10}|\d{12})$/)
      ]]
    });
  }

  ngOnInit(): void {
    this.loadAdmins();
  }

  get f() { return this.adminForm.controls; }

  loadAdmins(): void {
    this.isLoading = true;
    this.adminService.getAll().subscribe({
      next: (data) => {
        this.administradores = data;
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        // --- CORRECCIÓN: Usar la función centralizada para errores ---
        this.handleError(err, 'Error al cargar los administradores.');
      }
    });
  }

  toggleForm(admin?: Administrador): void {
    this.showForm = !this.showForm;
    this.adminForm.reset();
    
    if (admin) {
      this.isEditing = true;
      this.currentAdminId = admin.id;
      this.adminForm.patchValue(admin);
      this.f['password'].clearValidators();
      this.f['password'].updateValueAndValidity();
    } else {
      this.isEditing = false;
      this.currentAdminId = null;
      this.f['password'].setValidators([Validators.required, Validators.minLength(8)]);
      this.f['password'].updateValueAndValidity();
    }
  }

  onSubmit(): void {
    this.adminForm.markAllAsTouched();

    if (this.adminForm.invalid) {
      this.notificationService.showError('Por favor, rellene todos los campos obligatorios correctamente.', 'Formulario Inválido');
      return;
    }

    const action = this.isEditing && this.currentAdminId
      ? this.adminService.update(this.currentAdminId, this.adminForm.value)
      : this.adminService.create(this.adminForm.value);

    action.subscribe({
      next: () => {
        this.notificationService.showSuccess(`Administrador ${this.isEditing ? 'actualizado' : 'creado'} con éxito.`);
        this.loadAdmins();
        this.toggleForm();
      },
      // --- CORRECCIÓN: Usar la función centralizada para errores ---
      error: (err: HttpErrorResponse) => {
        const fallback = `Ocurrió un error al ${this.isEditing ? 'actualizar' : 'crear'} el administrador.`;
        this.handleError(err, fallback);
      }
    });
  }

  deleteAdmin(id: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar este administrador?')) {
      this.adminService.delete(id).subscribe({
        next: () => { // La respuesta aquí es 'void' (vacía)
          // FIX: Reemplaza response.detail por un mensaje de texto.
          this.notificationService.showSuccess('Administrador eliminado correctamente.');
          this.loadAdmins(); // Recargar la lista
        },
        error: (err: HttpErrorResponse) => {
          this.notificationService.showError(err.error?.detail || 'No se pudo eliminar el administrador.');
        }
      });
    }
  }
  
  // --- FUNCIÓN CENTRALIZADA Y MEJORADA PARA MANEJAR TODOS LOS ERRORES ---
  private handleError(error: HttpErrorResponse, fallbackMessage: string) {
    console.error('Backend Error:', error);
    const userMessage = error.error?.detail || fallbackMessage;
    this.notificationService.showError(userMessage);
  }
}