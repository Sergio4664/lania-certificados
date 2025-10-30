import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Necesario para [(ngModel)]
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '@environments/environment';

import { Certificado } from '@shared/interfaces/certificado.interface';
import { CertificadoService } from '@shared/services/certificado.service';
import { NotificationService } from '@shared/services/notification.service';

@Component({
  selector: 'app-admin-certificados',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe], // DatePipe es necesario
  templateUrl: './admin-certificados.component.html',
  styleUrls: ['./admin-certificados.component.css']
})
// --- 💡 CORRECCIÓN 1: Asegurarse que 'export default' esté aquí ---
export default class AdminCertificadosComponent implements OnInit {
  private certificadoSvc = inject(CertificadoService);
  private notificationSvc = inject(NotificationService);

  // --- Propiedades para Participantes ---
  certificadosParticipantes: Certificado[] = [];
  filteredCertificadosParticipantes: Certificado[] = [];
  isLoadingParticipantes = true;
  searchTermParticipantes: string = '';

  // --- Propiedades para Docentes ---
  certificadosDocentes: Certificado[] = [];
  filteredCertificadosDocentes: Certificado[] = [];
  isLoadingDocentes = true;
  searchTermDocentes: string = '';

  ngOnInit(): void {
    // Cargamos ambas listas al iniciar
    this.loadCertificadosParticipantes();
    this.loadCertificadosDocentes();
  }

  // --- Métodos para Participantes ---

  loadCertificadosParticipantes(): void {
    this.isLoadingParticipantes = true;
    // Usamos el método específico del servicio
    this.certificadoSvc.getCertificadosParticipantes().subscribe({
      next: (certificados) => {
        this.certificadosParticipantes = certificados;
        this.filteredCertificadosParticipantes = certificados;
        this.isLoadingParticipantes = false;
      },
      error: (err: HttpErrorResponse) => {
        this.isLoadingParticipantes = false;
        this.handleError(err.error?.detail || 'Error al cargar certificados de participantes');
      }
    });
  }

  filterCertificadosParticipantes(): void {
    const term = this.searchTermParticipantes.toLowerCase();
    this.filteredCertificadosParticipantes = this.certificadosParticipantes.filter(c =>
      c.folio.toLowerCase().includes(term) ||
      c.inscripcion?.participante.nombre_completo.toLowerCase().includes(term) ||
      c.inscripcion?.producto_educativo.nombre.toLowerCase().includes(term)
    );
  }

  // --- Métodos para Docentes ---

  loadCertificadosDocentes(): void {
    this.isLoadingDocentes = true;
    // Usamos el método específico del servicio
    this.certificadoSvc.getCertificadosDocentes().subscribe({
      next: (certificados) => {
        this.certificadosDocentes = certificados;
        this.filteredCertificadosDocentes = certificados;
        this.isLoadingDocentes = false;
      },
      error: (err: HttpErrorResponse) => {
        this.isLoadingDocentes = false;
        this.handleError(err.error?.detail || 'Error al cargar certificados de docentes');
      }
    });
  }

  filterCertificadosDocentes(): void {
    const term = this.searchTermDocentes.toLowerCase();
    this.filteredCertificadosDocentes = this.certificadosDocentes.filter(c =>
      c.folio.toLowerCase().includes(term) ||
      // Filtramos por el nombre del docente
      c.docente?.nombre_completo.toLowerCase().includes(term)
    );
  }

  // --- MÉTODO PARA EL BOTÓN "👁️" ---
  /**
   * Llama al servicio para obtener el PDF y lo abre en una nueva pestaña.
   * Usa el método 'getCertificadoBlob' que funciona para ambos (docentes y participantes).
   */
  visualizarCertificado(certificado: Certificado): void {
    this.certificadoSvc.getCertificadoBlob(certificado.folio).subscribe({
      next: (blob) => {
        // Crear una URL temporal para el Blob
        const fileURL = URL.createObjectURL(blob);
        // Abrir la URL en una nueva pestaña
        window.open(fileURL, '_blank');
      },
      error: (err) => {
        // Maneja el error si el backend (404) o el servicio fallan
        const errorMsg = err.error instanceof Blob ? "No se pudo leer el archivo" : err.error?.detail;
        this.handleError(`Error al visualizar el certificado: ${errorMsg || 'No se pudo cargar el archivo'}`);
      }
    });
  }

  // --- MÉTODO AÑADIDO PARA EL BOTÓN "📧" ---
  /**
   * Llama al servicio para reenviar el correo del certificado.
   */
  reenviarCertificado(certificado: Certificado): void {
    // Determina el destinatario para el mensaje de confirmación
    const destinatario = certificado.inscripcion?.participante?.nombre_completo || certificado.docente?.nombre_completo || 'el destinatario';
    const email = certificado.inscripcion?.participante?.email_personal || certificado.docente?.email_institucional || 'su correo';

    if (confirm(`¿Está seguro de reenviar el certificado ${certificado.folio} a ${destinatario} (${email})?`)) {
      
      // --- 💡 CORRECCIÓN 2: Llamar a 'sendEmail' con 2 argumentos ---
      // Pasamos 'personal' como segundo argumento. El backend lo ignorará,
      // pero esto satisface a TypeScript y al otro componente.
      this.certificadoSvc.sendEmail(certificado.id, 'personal').subscribe({
        next: (res) => {
          this.notificationSvc.showSuccess(res.message || 'Certificado reenviado exitosamente.');
        },
        error: (err: HttpErrorResponse) => {
          this.handleError(err.error?.detail || 'Error al reenviar el certificado');
        }
      });
    }
  }

  // --- Métodos Comunes ---

  deleteCertificado(certificado: Certificado): void {
    if (confirm(`¿Está seguro de eliminar el certificado con folio ${certificado.folio}?`)) {
      this.certificadoSvc.delete(certificado.id).subscribe({
        next: () => {
          this.notificationSvc.showSuccess('Certificado eliminado.');
          // Recargamos ambas listas para reflejar el cambio en cualquier tabla
          this.loadCertificadosParticipantes();
          this.loadCertificadosDocentes();
        },
        error: (err: HttpErrorResponse) => this.handleError(err.error?.detail || 'Error al eliminar')
      });
    }
  }

  getVerificationUrl(folio: string): string {
    // La variable 'frontendUrl' se debe añadir a los environments
    return `${environment.frontendUrl || 'http://localhost:4200'}/verificacion/${folio}`;
  }

  private handleError(message: string): void {
    this.notificationSvc.showError(message);
    // Los flags de 'isLoading' se manejan en cada método de carga
  }
}