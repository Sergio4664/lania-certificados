//Ruta: frontend/lania-ui/src/app/features/dashboard/admin-users.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

// Interfaces para los usuarios (puedes moverlas a un archivo de interfaces si lo prefieres)
export interface UserDTO {
  id: number;
  full_name: string;
  email: string;
  is_active: boolean;
}

export interface CreateUserDTO {
  full_name: string;
  email: string;
  password?: string; // Hacemos el password opcional para la edición
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="module-content">
    <div class="module-header">
      <h2>Gestión de Administradores</h2>
      <button class="primary-btn" (click)="showForm = true; resetForm()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Crear Administrador
      </button>
    </div>

    <div *ngIf="showForm" class="form-card">
      <h3>{{ isEditing ? 'Editar Administrador' : 'Nuevo Administrador' }}</h3>
      <form (ngSubmit)="saveUser()" class="form-grid">
        <div class="form-group">
          <label>Nombre Completo *</label>
          <input type="text" [(ngModel)]="currentUser.full_name" name="full_name" required>
        </div>

        <div class="form-group">
          <label>Correo Electrónico *</label>
          <input type="email" [(ngModel)]="currentUser.email" name="email" required>
        </div>

        <div class="form-group">
          <label>Contraseña {{ isEditing ? '(Opcional: solo si se desea cambiar)' : '*' }}</label>
          <input type="password" [(ngModel)]="currentUser.password" name="password" [required]="!isEditing">
        </div>

        <div class="form-actions">
          <button type="button" class="secondary-btn" (click)="cancelForm()">Cancelar</button>
          <button type="submit" class="primary-btn">{{ isEditing ? 'Guardar Cambios' : 'Crear Usuario' }}</button>
        </div>
      </form>
    </div>

    <div class="data-table">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre Completo</th>
            <th>Email</th>
            <th>Activo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let user of users">
            <td><span class="id-tag">{{ user.id }}</span></td>
            <td>{{ user.full_name }}</td>
            <td>{{ user.email }}</td>
            <td>
              <span class="status" [class]="user.is_active ? 'status-active' : 'status-inactive'">
                {{ user.is_active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="actions-cell">
  <button class="icon-btn edit" (click)="editUser(user)" title="Editar Administrador">
    <svg width="16" height="16" viewBox="0 0 24 24">...</svg>
  </button>
  <button class="icon-btn delete" (click)="deleteUser(user.id)" title="Eliminar Administrador">
    <svg width="16" height="16" viewBox="0 0 24 24">...</svg>
  </button>
  
  <button class="icon-btn reset" (click)="resetPassword(user.email)" title="Restablecer Contraseña">
    <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4a8 8 0 0 0-8 8h3a5 5 0 0 1 5-5v3l4-4l-4-4zm0 16a8 8 0 0 0 8-8h-3a5 5 0 0 1-5 5v-3l-4 4l4 4z"/></svg>
  </button>
</td>
          </tr>
          <tr *ngIf="users.length === 0">
            <td colspan="5" class="no-data">No hay administradores registrados.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  `,
  styles: [`
  .module-content h2 { color: #1e293b; margin: 0 0 24px 0; font-size: 28px; font-weight: 600; }
    .module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .primary-btn { display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: transform 0.2s; }
    .primary-btn:hover { transform: translateY(-1px); }
    .secondary-btn { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; padding: 12px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
    .secondary-btn:hover { background: #e2e8f0; }
    .form-card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
    .form-card h3 { color: #1e293b; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
    .form-group { display: flex; flex-direction: column; }
    .form-group label { color: #374151; font-weight: 600; margin-bottom: 8px; font-size: 14px; }
    .form-group input, .form-group select { padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; transition: border-color 0.2s; }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: #3b82f6; }
    .form-actions { display: flex; gap: 12px; grid-column: 1 / -1; margin-top: 8px; justify-content: flex-end; }
    .data-table table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; text-align: left; vertical-align: middle; }
    .data-table th { background: #f8fafc; font-weight: 600; color: #374151; }
    .data-table td { color: #64748b; }
    .data-table tbody tr:hover { background: #f8fafc; }
    .actions-cell { display: flex; gap: 8px; }
    .icon-btn { width: 36px; height: 36px; border: none; border-radius: 50%; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; background: transparent; }
    .icon-btn.edit { color: #2563eb; }
    .icon-btn.edit:hover { background: #dbeafe; }
    .icon-btn.delete { color: #ef4444; }
    .icon-btn.delete:hover { background: #fee2e2; }
    .no-data { text-align: center; padding: 32px; color: #9ca3af; }
    .id-tag { background: #eef2ff; color: #4338ca; padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 12px; }
    .status { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: capitalize; }
    .status-active { background: #dcfce7; color: #16a34a; }
    .status-inactive { background: #fee2e2; color: #b91c1c; }
  `]
})
export default class AdminUsersComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api/admin/users'; // URL base de la API para usuarios

  users: UserDTO[] = [];
  showForm = false;
  isEditing = false;
  currentUserId: number | null = null;
  currentUser: CreateUserDTO = {
    full_name: '',
    email: '',
    password: ''
  };

  ngOnInit() {
    this.loadUsers();
  }

  getTokenHeaders() {
    const token = localStorage.getItem('access_token');
    return { Authorization: `Bearer ${token}` };
  }

  loadUsers() {
    this.http.get<UserDTO[]>(this.apiUrl, { headers: this.getTokenHeaders() })
      .subscribe(data => {
        this.users = data;
      });
  }

  resetForm() {
    this.isEditing = false;
    this.currentUserId = null;
    this.currentUser = {
      full_name: '',
      email: '',
      password: ''
    };
  }

  cancelForm() {
    this.showForm = false;
    this.resetForm();
  }

  editUser(user: UserDTO) {
    this.isEditing = true;
    this.currentUserId = user.id;
    this.currentUser = {
      full_name: user.full_name,
      email: user.email,
      password: '' // El password se deja en blanco en el formulario de edición
    };
    this.showForm = true;
  }

  saveUser() {
    if (this.isEditing) {
      this.updateUser();
    } else {
      this.createUser();
    }
  }

  createUser() {
    if (!this.currentUser.full_name || !this.currentUser.email || !this.currentUser.password) {
      alert('Por favor, complete todos los campos requeridos.');
      return;
    }
    this.http.post<UserDTO>(this.apiUrl, this.currentUser, { headers: this.getTokenHeaders() })
      .subscribe({
        next: (newUser) => {
          alert('Administrador creado exitosamente.');
          this.users.push(newUser);
          this.cancelForm();
        },
        error: (err) => alert(`Error: ${err.error?.detail || 'No se pudo crear el administrador.'}`)
      });
  }

  updateUser() {
    if (!this.currentUserId) return;
    // Creamos un DTO para la actualización, omitiendo el password si está vacío
    const userToUpdate: Partial<CreateUserDTO> = {
      full_name: this.currentUser.full_name,
      email: this.currentUser.email,
    };
    if (this.currentUser.password) {
      userToUpdate.password = this.currentUser.password;
    }

    this.http.put<UserDTO>(`${this.apiUrl}/${this.currentUserId}`, userToUpdate, { headers: this.getTokenHeaders() })
      .subscribe({
        next: (updatedUser) => {
          alert('Administrador actualizado exitosamente.');
          const index = this.users.findIndex(u => u.id === this.currentUserId);
          if (index !== -1) {
            this.users[index] = updatedUser;
          }
          this.cancelForm();
        },
        error: (err) => alert(`Error: ${err.error?.detail || 'No se pudo actualizar el administrador.'}`)
      });
  }

  deleteUser(id: number) {
    if (confirm('¿Está seguro que desea eliminar este administrador?')) {
      this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getTokenHeaders() })
        .subscribe({
          next: () => {
            alert('Administrador eliminado exitosamente.');
            this.users = this.users.filter(u => u.id !== id);
          },
          error: (err) => alert(`Error: ${err.error?.detail || 'No se pudo eliminar el administrador.'}`)
        });
    }
  }
}