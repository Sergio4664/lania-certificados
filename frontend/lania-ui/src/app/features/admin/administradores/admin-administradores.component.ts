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
  isEditing = false;
  currentAdminId: number | null = null;
  isLoading = false;

  constructor() {
    // Tu formulario se mantiene igual, ya que la validación del lado del cliente es correcta.
    this.adminForm = this.fb.group({
      nombre_completo: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      email_institucional: ['', [
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@lania\.edu\.mx$/)
      ]],
      // Al quitar el campo de contraseña del HTML, mantenemos la lógica 
      // de validación solo para la creación (isEditing = false).
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
        this.handleError(err, 'Error al cargar los administradores.');
      }
    });
  }

  toggleForm(admin?: Administrador): void {
    this.adminForm.reset();
    
    if (admin) {
      this.isEditing = true;
      this.currentAdminId = admin.id;
      this.adminForm.patchValue(admin);
      // Al editar, limpiamos los validadores del campo 'password' ya que se ocultó en el HTML
      this.f['password'].clearValidators();
      this.f['password'].updateValueAndValidity();
    } else {
      this.isEditing = false;
      this.currentAdminId = null;
      // Al crear, restauramos los validadores
      this.f['password'].setValidators([Validators.required, Validators.minLength(8)]);
      this.f['password'].updateValueAndValidity();
    }
  }

  // --- NUEVA FUNCIÓN AÑADIDA ---
  sendResetLink(adminId: number): void {
    const admin = this.administradores.find(a => a.id === adminId);
    const email = admin?.email_institucional;

    if (!admin || !email) {
      this.notificationService.showError('Administrador no encontrado o email institucional faltante.');
      return;
    }
    
    // Muestra una confirmación antes de enviar el enlace
    if (!confirm(`¿Desea enviar un enlace de restablecimiento de contraseña al email institucional ${email}?`)) {
        return;
    }

    // Llama al servicio (ASUMIENDO que el AdministradorService tiene el método `sendPasswordResetLink`)
    this.adminService.sendPasswordResetLink(adminId).subscribe({
      next: () => {
        this.notificationService.showSuccess(`Enlace de restablecimiento enviado a ${email}.`);
      },
      error: (err: HttpErrorResponse) => {
        this.handleError(err, `No se pudo enviar el enlace de restablecimiento a ${email}.`);
      }
    });
  }
  // ------------------------------

  onSubmit(): void {
    this.adminForm.markAllAsTouched();

    // Cuando editamos, el campo 'password' puede no tener valor (es opcional)
    if (this.isEditing) {
      // Eliminamos el campo password del valor si está vacío para no enviarlo en el PATCH/PUT
      if (!this.f['password'].value) {
        delete this.adminForm.value.password;
      }
    }
    
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
      error: (err: HttpErrorResponse) => {
        const fallback = `Ocurrió un error al ${this.isEditing ? 'actualizar' : 'crear'} el administrador.`;
        this.handleError(err, fallback);
      }
    });
  }

  deleteAdmin(id: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar este administrador?')) {
      this.adminService.delete(id).subscribe({
        next: () => { 
          this.notificationService.showSuccess('Administrador eliminado correctamente.');
          this.loadAdmins(); // Recargar la lista
        },
        error: (err: HttpErrorResponse) => {
          this.notificationService.showError(err.error?.detail || 'No se pudo eliminar el administrador.');
        }
      });
    }
  }
  
  private handleError(error: HttpErrorResponse, fallbackMessage: string) {
    console.error('Backend Error:', error);
    const userMessage = error.error?.detail || fallbackMessage;
    this.notificationService.showError(userMessage);
  }
}
