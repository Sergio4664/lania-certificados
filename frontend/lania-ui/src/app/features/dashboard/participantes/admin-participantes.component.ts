import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';

// Interfaces y Servicios actualizados y centralizados
import { Participante } from '@shared/interfaces/participante.interface';
import { ParticipanteService } from '@shared/services/participante.service';
import { NotificationService } from '@app/shared/services/notification.service';

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
    this.participanteForm = this.fb.group({
      nombre_completo: ['', Validators.required],
      email_personal: ['', [Validators.required, Validators.email]],
      email_institucional: ['', [Validators.email]],
      telefono: [''],
      whatsapp: ['']
    });
  }

  ngOnInit() {
    this.loadParticipants();
  }

  loadParticipants() {
    this.isLoading = true;
    this.participanteService.getAll().subscribe({
      next: (data) => {
        this.participantes = data;
        this.filteredParticipants = data;
        this.isLoading = false;
      },
      error: () => {
        this.notificationService.showError('Error al cargar los participantes.');
        this.isLoading = false;
      }
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

  deleteParticipant(participante: Participante) {
    if (confirm(`¿Está seguro que desea eliminar a ${participante.nombre_completo}? Esta acción no se puede deshacer.`)) {
      this.participanteService.delete(participante.id).subscribe({
        next: () => {
          this.notificationService.showSuccess('Participante eliminado exitosamente.');
          this.loadParticipants();
        },
        error: (err) => this.notificationService.showError(err.error?.detail || 'Error al eliminar el participante.')
      });
    }
  }

  onSubmit() {
    if (this.participanteForm.invalid) {
      this.notificationService.showError('Por favor, complete todos los campos requeridos.');
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
        error: (err) => this.notificationService.showError(err.error?.detail || 'Error al actualizar el participante.')
      });
    } else {
      this.participanteService.create(formData).subscribe({
        next: () => {
          this.notificationService.showSuccess('Participante creado exitosamente.');
          this.loadParticipants();
          this.toggleForm();
        },
        error: (err) => this.notificationService.showError(err.error?.detail || 'Error al crear el participante.')
      });
    }
  }
}