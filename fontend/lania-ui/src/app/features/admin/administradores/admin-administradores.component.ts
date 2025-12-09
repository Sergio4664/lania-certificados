import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs'; // Necesario para tipar el observable de acción

// Usando tus interfaces y servicios existentes
import { Administrador } from '@shared/interfaces/administrador.interface';
// ✅ Importación de AdministradorService (ahora que el servicio lo exporta bien)
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
    this.adminForm = this.fb.group({
      nombre_completo: ['', [Validators.required, Validators.minLength(3)]],
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
      // ✅ Tipado de 'data' como Administrador[] (Resuelve TS7006)
      next: (data: Administrador[]) => { 
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
      this.f['password'].clearValidators();
      this.f['password'].updateValueAndValidity();
    } else {
      this.isEditing = false;
      this.currentAdminId = null;
      this.f['password'].setValidators([Validators.required, Validators.minLength(8)]);
      this.f['password'].updateValueAndValidity();
    }
  }

  sendResetLink(adminId: number): void {
  const admin = this.administradores.find(a => a.id === adminId);
  const email = admin?.email_institucional;

  if (!email) {
    this.notificationService.showError('No se encontró el email institucional.');
    return;
  }

  this.notificationService.showInfo('Enviando enlace de restablecimiento...');

  this.adminService.sendPasswordResetLink(email).subscribe({
    next: (res) => {
      this.notificationService.showSuccess(res.message);
    },
    error: (err) => {
      this.notificationService.showError(err.error?.detail || 'Error al enviar el enlace.');
    }
  });
}


  onSubmit(): void {
    this.adminForm.markAllAsTouched();

    if (this.isEditing) {
      if (!this.f['password'].value) {
        delete this.adminForm.value.password; 
      }
    }
    
    if (this.adminForm.invalid) {
      this.notificationService.showError('Por favor, rellene todos los campos obligatorios correctamente.', 'Formulario Inválido');
      return;
    }

    // ✅ Tipado de action como Observable (Resuelve TS2571)
    let action: Observable<Administrador | void>;

    if (this.isEditing && this.currentAdminId) {
        action = this.adminService.update(this.currentAdminId, this.adminForm.value);
    } else {
        action = this.adminService.create(this.adminForm.value);
    }

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

  deleteAdmin(admin: Administrador): void {
    // NOTA: Reemplazar el confirm con un componente modal personalizado
    if (confirm(`¿Estás seguro de que quieres eliminar al administrador ${admin.nombre_completo}?`)) {
      this.adminService.delete(admin.id).subscribe({ // ✅ TS2571 resuelto
        next: () => { 
          this.notificationService.showSuccess('Administrador eliminado correctamente.');
          this.loadAdmins(); 
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