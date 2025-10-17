import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '@environments/environment';

// Interfaces
import { Certificado } from '@shared/interfaces/certificado.interface';
import { Inscripcion } from '@shared/interfaces/inscripcion.interface';

// Servicios
import { CertificadoService } from '@shared/services/certificado.service';
import { InscripcionService } from '@shared/services/inscripcion.service';
import { NotificationService } from '@shared/services/notification.service';

@Component({
  selector: 'app-admin-certificados',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe], // <-- Se agregó ReactiveFormsModule
  templateUrl: './admin-certificados.component.html',
  styleUrls: ['./admin-certificados.component.css']
})
export default class AdminCertificadosComponent implements OnInit {
  // Inyección de servicios
  private certificadoSvc = inject(CertificadoService);
  private inscripcionSvc = inject(InscripcionService);
  private notificationSvc = inject(NotificationService);
  private fb = inject(FormBuilder);

  // Listas de datos
  certificados: Certificado[] = [];
  filteredCertificados: Certificado[] = [];
  inscripcionesDisponibles: Inscripcion[] = [];

  // Estados de la UI
  isLoading = true;
  showForm = false;
  searchTerm: string = '';

  // Formulario
  certificadoForm: FormGroup;

  constructor() {
    this.certificadoForm = this.fb.group({
      inscripcion_id: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading = true;
    forkJoin({
      certificados: this.certificadoSvc.getAll(),
      inscripciones: this.inscripcionSvc.getAll()
    }).subscribe({
      next: ({ certificados, inscripciones }) => {
        this.certificados = certificados;
        this.filteredCertificados = certificados;
        // Filtramos las inscripciones que ya tienen un certificado
        const certifiedIds = new Set(certificados.map(c => c.inscripcion_id));
        this.inscripcionesDisponibles = inscripciones.filter(i => !certifiedIds.has(i.id));
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => this.handleError(err.error?.detail || 'Error al cargar datos')
    });
  }

  filterCertificados(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredCertificados = this.certificados.filter(c =>
      c.folio.toLowerCase().includes(term) ||
      c.inscripcion?.participante.nombre_completo.toLowerCase().includes(term) ||
      c.inscripcion?.producto_educativo.nombre.toLowerCase().includes(term)
    );
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    this.certificadoForm.reset();
  }

  onSubmit(): void {
    if (this.certificadoForm.invalid) {
      this.notificationSvc.showError('Debe seleccionar una inscripción válida.');
      return;
    }
    this.certificadoSvc.create(this.certificadoForm.value).subscribe({
      next: (nuevoCertificado) => {
        this.notificationSvc.showSuccess(`Certificado ${nuevoCertificado.folio} creado.`);
        this.loadInitialData(); // Recargamos todo para mantener la consistencia
        this.toggleForm();
      },
      error: (err: HttpErrorResponse) => this.handleError(err.error?.detail || 'Error al crear el certificado')
    });
  }

  deleteCertificado(certificado: Certificado): void {
    if (confirm(`¿Está seguro de eliminar el certificado con folio ${certificado.folio}?`)) {
      this.certificadoSvc.delete(certificado.id).subscribe({
        next: () => {
          this.notificationSvc.showSuccess('Certificado eliminado.');
          this.loadInitialData(); // Recargamos
        },
        error: (err: HttpErrorResponse) => this.handleError(err.error?.detail || 'Error al eliminar')
      });
    }
  }
  
  // Construye la URL completa para la validación del certificado
  getVerificationUrl(folio: string): string {
    return `${environment.frontendUrl}/verificacion/${folio}`;
  }

  private handleError(message: string): void {
    this.notificationSvc.showError(message);
    this.isLoading = false;
  }
}