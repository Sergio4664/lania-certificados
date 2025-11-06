//Ruta: frontend/lania-ui/src/app/features/admin/productos-educativos/producto-educativo-create.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';

// Asumiremos que crearemos/actualizaremos estos servicios e interfaces a continuación
import { ProductoEducativoService } from '@shared/services/producto-educativo.service';
import { DocenteDTO } from '@shared/interfaces/docente.interfaces';
import { DocenteService } from '@shared/services/docente.service';
import { ProductoEducativoCreate } from '@shared/interfaces/producto-educativo.interface';

@Component({
  standalone: true,
  selector: 'app-producto-educativo-create',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="container">
      <h2>Crear Nuevo Producto Educativo</h2>
      <form [formGroup]="productoForm" (ngSubmit)="create()">
        <div class="form-group">
          <label for="nombre">Nombre del Producto</label>
          <input id="nombre" formControlName="nombre" placeholder="Nombre del producto" required />
        </div>

        <div class="form-group">
          <label for="horas">Horas</label>
          <input id="horas" formControlName="horas" type="number" min="1" required />
        </div>

        <div class="form-group">
          <label for="fecha_inicio">Fecha de Inicio</label>
          <input id="fecha_inicio" formControlName="fecha_inicio" type="date" required />
        </div>

        <div class="form-group">
          <label for="fecha_fin">Fecha de Fin</label>
          <input id="fecha_fin" formControlName="fecha_fin" type="date" required />
        </div>

        <div class="form-group">
          <label>Docentes</label>
          <div class="checkbox-group" formArrayName="docentes">
            <div *ngFor="let docente of docentes; let i = index">
              <input type="checkbox" [formControlName]="i" />
              <label>{{ docente.nombre_completo }}</label>
            </div>
            <div *ngIf="docentes.length === 0">
              No hay docentes registrados.
            </div>
          </div>
        </div>

        <button type="submit" [disabled]="productoForm.invalid">Crear Producto</button>
      </form>
    </div>
  `,
  // Estilos básicos para el formulario
  styles: [`
    .container { max-width: 600px; margin: auto; padding: 20px; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: bold; }
    input[type="text"], input[type="number"], input[type="date"] {
      width: 100%;
      padding: 8px;
      box-sizing: border-box;
    }
    .checkbox-group div { display: flex; align-items: center; margin-bottom: 5px; }
    .checkbox-group input { margin-right: 10px; }
  `]
})
export default class ProductoEducativoCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productoSvc = inject(ProductoEducativoService);
  private docenteSvc = inject(DocenteService);
  private router = inject(Router);

  productoForm: FormGroup;
  docentes: DocenteDTO[] = [];

  constructor() {
    // Inicializamos el formulario reactivo
    this.productoForm = this.fb.group({
      nombre: ['', Validators.required],
      horas: [8, [Validators.required, Validators.min(1)]],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      docentes: this.fb.array([])
    });
  }

  ngOnInit() {
    // Cargamos la lista de docentes al iniciar el componente
    this.docenteSvc.getAll().subscribe(data => {
      this.docentes = data;
      this.addDocenteCheckboxes();
    });
  }

  // Añade un control booleano por cada docente a nuestro FormArray
  private addDocenteCheckboxes() {
    this.docentes.forEach(() => this.docentesFormArray.push(new FormControl(false)));
  }

  get docentesFormArray() {
    return this.productoForm.controls['docentes'] as FormArray;
  }

  create() {
    if (this.productoForm.invalid) {
      alert('Por favor, complete todos los campos requeridos.');
      return;
    }

    // Mapea los valores del formulario al formato que espera el backend
    const formValue = this.productoForm.value;
    const selectedDocentesIds = formValue.docentes
      .map((checked: boolean, i: number) => checked ? this.docentes[i].id : null)
      .filter((id: number | null) => id !== null);

    const newProducto: ProductoEducativoCreate = {
      nombre: formValue.nombre,
      horas: formValue.horas,
      fecha_inicio: formValue.fecha_inicio,
      fecha_fin: formValue.fecha_fin,
      docentes_ids: selectedDocentesIds
    };

    this.productoSvc.create(newProducto).subscribe({
      next: () => {
        alert('Producto educativo creado exitosamente.');
        this.router.navigate(['/admin/productos-educativos']); // Redirige a la lista
      },
      error: (err) => {
        console.error('Error al crear el producto:', err);
        alert('Ocurrió un error al crear el producto.');
      }
    });
  }
}