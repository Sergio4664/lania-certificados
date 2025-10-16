import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
      next: (data) => {
        this.administradores = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.notificationService.showError('Error al cargar los administradores.');
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
      error: (err) => this.notificationService.showError(err.error?.detail || 'Ocurrió un error.')
    });
  }

  deleteAdmin(admin: Administrador): void {
    if (confirm(`¿Estás seguro de que quieres eliminar a ${admin.nombre_completo}?`)) {
      this.adminService.delete(admin.id).subscribe({
        next: () => {
          this.notificationService.showSuccess('Administrador eliminado con éxito.');
          this.loadAdmins();
        },
        error: (err) => this.notificationService.showError(err.error?.detail || 'Error al eliminar administrador.')
      });
    }
  }
}