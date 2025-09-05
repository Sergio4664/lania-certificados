// frontend/lania-ui/src/app/features/dashboard/admin-participants.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ParticipantDTO, CreateParticipantDTO, UpdateParticipantDTO } from '../../shared/interfaces/participant.interfaces';

@Component({
  selector: 'app-admin-participants',
  standalone: true,
   template: `
  <div class="module-content">
  <div class="module-header">
    <h2>Gestión de Participantes</h2>
    <button class="primary-btn" (click)="showForm = true; editingParticipant = null; resetForm()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Nuevo Participante
    </button>
  </div>

  <div *ngIf="showForm" class="form-card">
    <h3>{{ editingParticipant ? 'Editar Participante' : 'Registrar Nuevo Participante' }}</h3>
    <form (ngSubmit)="editingParticipant ? updateParticipant() : createParticipant()" class="form-grid">
      <div class="form-group">
        <label>Nombre Completo *</label>
        <input [(ngModel)]="participantForm.full_name" name="full_name" required>
      </div>
      <div class="form-group">
        <label>Email *</label>
        <input type="email" [(ngModel)]="participantForm.email" name="email" required>
      </div>
      <div class="form-group">
        <label>Teléfono</label>
        <input [(ngModel)]="participantForm.phone" name="phone" placeholder="Opcional">
      </div>
      <div class="form-actions">
        <button type="button" class="secondary-btn" (click)="cancelForm()">Cancelar</button>
        <button type="submit" class="primary-btn">{{ editingParticipant ? 'Actualizar' : 'Crear' }}</button>
      </div>
    </form>
  </div>

  <div class="data-table">
    <table>
      <thead>
        <tr>
          <th>Nombre Completo</th>
          <th>Email</th>
          <th>Teléfono</th>
          <th>Fecha de Registro</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let participant of participants">
          <td>{{ participant.full_name }}</td>
          <td>{{ participant.email }}</td>
          <td>{{ participant.phone || 'N/A' }}</td>
          <td>{{ participant.created_at | date:'dd/MM/yyyy' }}</td>
          <td>
            <button class="icon-btn edit" (click)="editParticipant(participant)" title="Editar Participante">
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            <button class="icon-btn delete" (click)="deleteParticipant(participant.id)" title="Eliminar Participante">
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </td>
        </tr>
         <tr *ngIf="participants.length === 0">
          <td colspan="5" class="no-data">No hay participantes registrados.</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
  `,
  styles: [`
  .module-content h2 {
  color: #1e293b;
  margin: 0 0 24px 0;
  font-size: 28px;
  font-weight: 600;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.primary-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.primary-btn:hover {
  transform: translateY(-1px);
}

.secondary-btn {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.secondary-btn:hover {
  background: #e2e8f0;
}

.form-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.form-card h3 {
  color: #1e293b;
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  color: #374151;
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 14px;
}

.form-group input {
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
}

.form-actions {
  display: flex;
  gap: 12px;
  grid-column: 1 / -1;
  margin-top: 8px;
  align-items: flex-end;
}

.data-table table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th, .data-table td {
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  text-align: left;
  vertical-align: middle;
}

.data-table th {
  background: #f8fafc;
  font-weight: 600;
  color: #374151;
}

.data-table td {
  color: #64748b;
}

.data-table tbody tr:hover {
  background: #f8fafc;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  margin: 0 4px;
  background: transparent;
}

.icon-btn.edit { color: #d97706; }
.icon-btn.edit:hover { background: #fef3c7; }
.icon-btn.delete { color: #dc2626; }
.icon-btn.delete:hover { background: #fecaca; }

.no-data {
  text-align: center;
  padding: 32px;
  color: #9ca3af;
}

  `]
})
export default class AdminParticipantsComponent implements OnInit {
  private http = inject(HttpClient);

  participants: ParticipantDTO[] = [];
  showForm = false;
  editingParticipant: ParticipantDTO | null = null;
  participantForm!: CreateParticipantDTO;

  constructor() {
    this.resetForm();
  }

  ngOnInit() {
    this.loadParticipants();
  }

  loadParticipants() {
    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<ParticipantDTO[]>('http://127.0.0.1:8000/api/admin/participants', { headers })
      .subscribe(data => this.participants = data);
  }

  resetForm() {
    this.participantForm = {
      full_name: '',
      email: '',
      phone: ''
    };
  }

  cancelForm() {
    this.showForm = false;
    this.editingParticipant = null;
    this.resetForm();
  }

  createParticipant() {
    if (!this.participantForm.full_name || !this.participantForm.email) {
      alert('Por favor, complete el nombre y el email.');
      return;
    }

    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.post('http://127.0.0.1:8000/api/admin/participants', this.participantForm, { headers })
      .subscribe({
        next: () => {
          alert('Participante creado exitosamente.');
          this.loadParticipants();
          this.cancelForm();
        },
        error: (err) => {
          console.error('Error al crear participante:', err);
          alert(`Error: ${err.error?.detail || 'No se pudo crear el participante.'}`);
        }
      });
  }

  editParticipant(participant: ParticipantDTO) {
    this.editingParticipant = participant;
    this.participantForm = {
      full_name: participant.full_name,
      email: participant.email,
      phone: participant.phone || ''
    };
    this.showForm = true;
  }

  updateParticipant() {
    if (!this.editingParticipant) return;

    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };
    
    const updateData: UpdateParticipantDTO = { ...this.participantForm };

    this.http.put(`http://127.0.0.1:8000/api/admin/participants/${this.editingParticipant.id}`, updateData, { headers })
      .subscribe({
        next: () => {
          alert('Participante actualizado exitosamente.');
          this.loadParticipants();
          this.cancelForm();
        },
        error: (err) => {
          console.error('Error al actualizar participante:', err);
          alert(`Error: ${err.error?.detail || 'No se pudo actualizar el participante.'}`);
        }
      });
  }

  deleteParticipant(id: number) {
    if (confirm('¿Está seguro que desea eliminar este participante? Esta acción no se puede deshacer y podría afectar certificados existentes.')) {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      this.http.delete(`http://127.0.0.1:8000/api/admin/participants/${id}`, { headers })
        .subscribe({
          next: () => {
            alert('Participante eliminado exitosamente.');
            this.loadParticipants();
          },
          error: (err) => {
            console.error('Error eliminando participante:', err);
            alert(`Error al eliminar participante: ${err.error?.detail || 'Error desconocido'}`);
          }
        });
    }
  }
}

