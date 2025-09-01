import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocenteService } from './docente.service';
import { DocenteDTO, CreateDocenteDTO } from '../../../shared/interfaces/docente.interfaces';

@Component({
  standalone: true,
  selector: 'app-admin-docentes',
  imports: [CommonModule, FormsModule],
  template: `
    <h2>Gestión de Docentes</h2>

    <form (ngSubmit)="create()">
      <input [(ngModel)]="form.full_name" name="full_name" placeholder="Nombre completo" required />
      <input [(ngModel)]="form.email" name="email" type="email" placeholder="Correo" required />
      <input [(ngModel)]="form.password" name="password" type="password" placeholder="Contraseña" required />
      <input [(ngModel)]="form.telefono" name="telefono" placeholder="Teléfono (opcional)" />
      <input [(ngModel)]="form.especialidad" name="especialidad" placeholder="Especialidad (opcional)" />
      <button type="submit">Crear docente</button>
    </form>

    <hr />

    <ul>
      <li *ngFor="let d of docentes">
        {{d.full_name}} ({{d.email}}) - <strong>{{ d.is_active ? 'Activo' : 'Inactivo' }}</strong>
        <span *ngIf="d.telefono"> - Tel: {{d.telefono}}</span>
        <span *ngIf="d.especialidad"> - {{d.especialidad}}</span>
        <button (click)="disable(d.id)" [disabled]="!d.is_active">Desactivar</button>
      </li>
    </ul>
  `
})
export default class AdminDocentesComponent implements OnInit {
  private docenteSvc = inject(DocenteService);
  docentes: DocenteDTO[] = [];

  form: CreateDocenteDTO = { 
    full_name: '', 
    email: '', 
    password: '', 
    telefono: '', 
    especialidad: '' 
  };

  ngOnInit(){ this.load(); }

  load(){
    this.docenteSvc.list().subscribe((rows) => this.docentes = rows);
  }

  create(){
    // Validar campos requeridos
    if (!this.form.full_name || !this.form.email || !this.form.password) {
      alert('Por favor complete todos los campos requeridos (nombre, email y contraseña)');
      return;
    }

    this.docenteSvc.create(this.form).subscribe({
      next: () => {
        this.form = { 
          full_name: '', 
          email: '', 
          password: '', 
          telefono: '', 
          especialidad: '' 
        };
        this.load();
        alert('Docente creado exitosamente');
      },
      error: (err) => {
        console.error('Error creating docente:', err);
        alert('Error al crear docente: ' + (err.error?.detail || 'Error desconocido'));
      }
    });
  }

  disable(id: number){
    this.docenteSvc.disable(id).subscribe(() => this.load());
  }
}