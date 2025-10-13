import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

// Interfaces y Servicios actualizados
import { Administrador } from '@shared/interfaces/administrador.interface';
import { AdministradorService } from '@shared/services/administrador.service';

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

  administradores: Administrador[] = [];
  adminForm: FormGroup;
  showForm = false;
  isEditing = false;
  currentAdminId: number | null = null;
  isLoading = false;

  constructor() {
    this.adminForm = this.fb.group({
      nombre_completo: ['', Validators.required],
      email_institucional: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      telefono: [''],
      whatsapp: ['']
    });
  }

  ngOnInit(): void {
    this.loadAdmins();
  }

  loadAdmins(): void {
    this.isLoading = true;
    this.adminService.getAll().subscribe({
      next: (data) => {
        this.administradores = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        alert('Error al cargar los administradores.');
      }
    });
  }

  toggleForm(admin?: Administrador): void {
    this.showForm = !this.showForm;
    this.adminForm.reset();
    
    if (admin) {
      this.isEditing = true;
      this.currentAdminId = admin.id;
      // Pre-llenamos el formulario con los datos del admin
      this.adminForm.patchValue(admin);
      // La contraseña es opcional al editar
      this.adminForm.get('password')?.clearValidators();
      this.adminForm.get('password')?.updateValueAndValidity();
    } else {
      this.isEditing = false;
      this.currentAdminId = null;
      // La contraseña es requerida al crear
      this.adminForm.get('password')?.setValidators([Validators.required]);
      this.adminForm.get('password')?.updateValueAndValidity();
    }
  }

  onSubmit(): void {
    if (this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
      return;
    }

    const action = this.isEditing && this.currentAdminId
      ? this.adminService.update(this.currentAdminId, this.adminForm.value)
      : this.adminService.create(this.adminForm.value);

    action.subscribe({
      next: () => {
        alert(`Administrador ${this.isEditing ? 'actualizado' : 'creado'} con éxito.`);
        this.loadAdmins();
        this.toggleForm();
      },
      error: (err) => alert(err.error?.detail || 'Ocurrió un error.')
    });
  }

  deleteAdmin(admin: Administrador): void {
    if (confirm(`¿Estás seguro de que quieres eliminar a ${admin.nombre_completo}?`)) {
      this.adminService.delete(admin.id).subscribe({
        next: () => {
          alert('Administrador eliminado con éxito.');
          this.loadAdmins();
        },
        error: (err) => alert(err.error?.detail || 'Error al eliminar administrador.')
      });
    }
  }
}
