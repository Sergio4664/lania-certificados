import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NotificationService } from '@shared/services/notification.service';

// --- Nuevos Servicios e Interfaces ---
import { CertificadoService } from '@shared/services/certificado.service';
import { InscripcionService } from '@shared/services/inscripcion.service';
import { Certificado, CertificadoCreate } from '@shared/interfaces/certificado.interface';
import { Inscripcion } from '@shared/interfaces/inscripcion.interface';

/**
 * Interfaz extendida para mostrar datos combinados en la tabla de certificados.
 */
interface CertificadoDetallado extends Certificado {
  nombre_participante: string;
  nombre_producto: string;
}

@Component({
  selector: 'app-admin-certificados',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './admin-certificados.component.html',
  styleUrls: ['./admin-certificados.component.css']
})
export default class AdminCertificadosComponent implements OnInit {
  private certificadoService = inject(CertificadoService);
  private inscripcionService = inject(InscripcionService);
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);

  certificados: CertificadoDetallado[] = [];
  inscripcionesDisponibles: Inscripcion[] = [];
  
  certificadoForm: FormGroup;
  isLoading = true;
  showForm = false;

  constructor() {
    this.certificadoForm = this.fb.group({
      inscripcion_id: [null, Validators.required],
      folio: ['', Validators.required],
      fecha_emision: [this.getTodayDateString(), Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.isLoading = true;
    // Cargamos los certificados existentes y las inscripciones que aún no tienen certificado
    this.certificadoService.getAll().subscribe({
      next: (certificados) => {
        // Necesitamos más detalles para la tabla, por lo que cargamos las inscripciones
        this.inscripcionService.getAll().subscribe(inscripciones => {
            this.certificados = this.mapCertificadosToDetalles(certificados, inscripciones);
            this.inscripcionesDisponibles = this.filterInscripcionesSinCertificado(inscripciones, certificados);
            this.isLoading = false;
        });
      },
      error: () => this.handleError('Error al cargar los certificados')
    });
  }

  onSubmit(): void {
    if (this.certificadoForm.invalid) {
      this.notificationService.showError('Por favor, complete todos los campos requeridos.');
      return;
    }

    const newCertificado: CertificadoCreate = this.certificadoForm.value;
    
    this.certificadoService.create(newCertificado).subscribe({
      next: () => {
        this.notificationService.showSuccess('Certificado creado exitosamente.');
        this.loadAllData();
        this.toggleForm();
      },
      error: (err) => this.handleError(err.error?.detail || 'Error al crear el certificado')
    });
  }
  
  deleteCertificado(certificado: CertificadoDetallado): void {
    if (confirm(`¿Está seguro de que quiere eliminar el certificado con folio ${certificado.folio}?`)) {
      this.certificadoService.delete(certificado.id).subscribe({
        next: () => {
          this.notificationService.showSuccess('Certificado eliminado con éxito.');
          this.loadAllData();
        },
        error: () => this.handleError('Error al eliminar el certificado')
      });
    }
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    this.certificadoForm.reset({ fecha_emision: this.getTodayDateString() });
  }

  // --- Funciones Auxiliares ---

  private mapCertificadosToDetalles(certificados: Certificado[], inscripciones: Inscripcion[]): CertificadoDetallado[] {
    return certificados.map(cert => {
        const inscripcion = inscripciones.find(i => i.id === cert.inscripcion_id);
        return {
            ...cert,
            nombre_participante: inscripcion?.participante.nombre_completo || 'Desconocido',
            nombre_producto: inscripcion?.producto_educativo.nombre || 'Desconocido',
        };
    });
  }

  private filterInscripcionesSinCertificado(inscripciones: Inscripcion[], certificados: Certificado[]): Inscripcion[] {
      const idsDeInscripcionesConCertificado = new Set(certificados.map(c => c.inscripcion_id));
      return inscripciones.filter(i => !idsDeInscripcionesConCertificado.has(i.id));
  }

  private getTodayDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  }

  private handleError(message: string): void {
    this.notificationService.showError(message);
    this.isLoading = false;
  }
}
