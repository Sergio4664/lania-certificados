// frontend/lania-ui/src/app/features/admin/users/admin-users.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminUserService, AdminUser } from '../docentes/admin-user.service'; // Asegúrate que la ruta sea correcta
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-users.component.html',
})
export class AdminUsersComponent implements OnInit {
  users: AdminUser[] = [];
  userForm: FormGroup;
  isLoading = false;

  constructor(
    private adminUserService: AdminUserService,
    private fb: FormBuilder,
    private notificationService: NotificationService
  ) {
    this.userForm = this.fb.group({
      full_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.adminUserService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.notificationService.showError('Error al cargar los administradores');
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      return;
    }
    this.adminUserService.createUser(this.userForm.value).subscribe({
      next: () => {
        this.notificationService.showSuccess('Administrador creado con éxito');
        this.loadUsers();
        this.userForm.reset();
      },
      error: (err) => this.notificationService.showError(err.error.detail || 'Error al crear administrador')
    });
  }

  deleteUser(id: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar a este administrador?')) {
      this.adminUserService.deleteUser(id).subscribe({
        next: () => {
          this.notificationService.showSuccess('Administrador eliminado con éxito');
          this.loadUsers();
        },
        error: (err) => this.notificationService.showError('Error al eliminar administrador')
      });
    }
  }
}