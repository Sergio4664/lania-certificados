import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { AdminUserService, AdminUser } from '../docentes/admin-user.service'; 
import { NotificationService } from '../../../shared/services/notification.service';

export { AdminUser as UserDTO } 

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-users.component.html',
  styles: [`
    /* ... Tus estilos existentes van aquí ... */
    .module-content h2 { color: #1e293b; margin: 0 0 24px 0; font-size: 28px; font-weight: 600; }
    .module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .primary-btn { display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
    .primary-btn:hover { transform: translateY(-1px); }
    .secondary-btn { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; padding: 12px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
    .secondary-btn:hover { background: #e2e8f0; }
    .form-card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
    .form-card h3 { color: #1e293b; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
    .form-group { display: flex; flex-direction: column; position: relative; }
    .form-group label { color: #374151; font-weight: 600; margin-bottom: 8px; font-size: 14px; }
    .form-group input { padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; transition: border-color 0.2s; }
    .form-group input:focus { outline: none; border-color: #3b82f6; }
    .form-actions { display: flex; gap: 12px; grid-column: 1 / -1; margin-top: 8px; justify-content: flex-end; }
    .data-table { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
    .data-table table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; text-align: left; vertical-align: middle; }
    .data-table th { background: #f8fafc; font-weight: 600; color: #374151; }
    .data-table td { color: #64748b; }
    .data-table tbody tr:hover { background: #f8fafc; }
    .actions-cell { text-align: right; }
    .icon-btn { width: 36px; height: 36px; border: none; border-radius: 50%; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; background: transparent; }
    .icon-btn.delete { color: #ef4444; }
    .icon-btn.delete:hover { background: #fee2e2; }
    .no-data { text-align: center; padding: 32px; color: #9ca3af; }
    .id-tag { background: #eef2ff; color: #4338ca; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 12px; font-weight: 600; }
    .status { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .status-active { background: #dcfce7; color: #16a34a; }
    .status-inactive { background: #fee2e2; color: #b91c1c; }
    .error-text { color: #dc2626; font-size: 12px; margin-top: 4px; }
    .form-group input.ng-invalid.ng-touched { border-color: #ef4444; }
  `]
})
export class AdminUsersComponent implements OnInit {
  users: AdminUser[] = [];
  userForm: FormGroup;
  isLoading = false;
  showForm = false;
  isEditing = false;
  currentUserId: number | null = null;

  constructor(
    private adminUserService: AdminUserService,
    private fb: FormBuilder,
    private notificationService: NotificationService
  ) {
    this.userForm = this.fb.group({
      full_name: ['', Validators.required],
      email: ['', [
        Validators.required, 
        Validators.email, 
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@lania\.edu\.mx$/)
      ]],
      password: ['', Validators.required], // La contraseña ahora es siempre requerida
    });
  }

  // Getters para acceder fácilmente a los controles del formulario en la plantilla
  get fullName(): AbstractControl | null { return this.userForm.get('full_name'); }
  get email(): AbstractControl | null { return this.userForm.get('email'); }
  get password(): AbstractControl | null { return this.userForm.get('password'); }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.adminUserService.getUsers().subscribe({
      next: (data: AdminUser[]) => {
        this.users = data;
        this.isLoading = false;
      },
      error: (err: any) => {
        this.notificationService.showError('Error al cargar los administradores');
        this.isLoading = false;
      }
    });
  }
  
  resetForm() {
    this.isEditing = false;
    this.currentUserId = null;
    this.userForm.reset();
  }
  
  cancelForm() {
    this.showForm = false;
    this.resetForm();
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched(); // Marca todos los campos como "tocados" para mostrar errores
      return;
    }
    
    if (this.isEditing) {
      // Lógica de actualización (no implementada)
    } else {
      this.createUser();
    }
  }

  createUser(): void {
    this.adminUserService.createUser(this.userForm.value).subscribe({
      next: () => {
        this.notificationService.showSuccess('Administrador creado con éxito');
        this.loadUsers();
        this.cancelForm();
      },
      error: (err: any) => this.notificationService.showError(err.error.detail || 'Error al crear administrador')
    });
  }

  deleteUser(id: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar a este administrador?')) {
      this.adminUserService.deleteUser(id).subscribe({
        next: () => {
          this.notificationService.showSuccess('Administrador eliminado con éxito');
          this.loadUsers();
        },
        error: (err: any) => this.notificationService.showError('Error al eliminar administrador')
      });
    }
  }
}