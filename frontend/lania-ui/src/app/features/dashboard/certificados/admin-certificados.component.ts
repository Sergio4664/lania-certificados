import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms'; // No se necesita ReactiveFormsModule aquí
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
export default class AdminCertificadosComponent implements OnInit {
  private certificadoSvc = inject(CertificadoService);
  private notificationSvc = inject(NotificationService);

  certificados: Certificado[] = [];
  filteredCertificados: Certificado[] = [];
  isLoading = true;
  searchTerm: string = '';

  ngOnInit(): void {
    this.loadCertificados();
  }

  loadCertificados(): void {
    this.isLoading = true;
    this.certificadoSvc.getAll().subscribe({
      next: (certificados) => {
        this.certificados = certificados;
        this.filteredCertificados = certificados;
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => this.handleError(err.error?.detail || 'Error al cargar los certificados')
    });
  }

  filterCertificados(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredCertificados = this.certificados.filter(c =>
      c.folio.toLowerCase().includes(term) ||
      // ✅ CAMBIO: Filtro expandido y con navegación segura
      c.inscripcion?.participante?.nombre_completo.toLowerCase().includes(term) ||
      c.inscripcion?.producto_educativo?.nombre.toLowerCase().includes(term) ||
      // ✅ NUEVO: Añadida búsqueda por email y whatsapp
      c.inscripcion?.participante?.email_personal?.toLowerCase().includes(term) ||
      c.inscripcion?.participante?.email_institucional?.toLowerCase().includes(term) ||
      c.inscripcion?.participante?.whatsapp?.toLowerCase().includes(term)
    );
  }

  deleteCertificado(certificado: Certificado): void {
    if (confirm(`¿Está seguro de eliminar el certificado con folio ${certificado.folio}?`)) {
      this.certificadoSvc.delete(certificado.id).subscribe({
        next: () => {
          this.notificationSvc.showSuccess('Certificado eliminado.');
          this.loadCertificados(); // Recargar la lista para reflejar el cambio
        },
        error: (err: HttpErrorResponse) => this.handleError(err.error?.detail || 'Error al eliminar')
      });
    }
  }

  getVerificationUrl(folio: string): string {
    // La variable 'frontendUrl' se debe añadir a los environments
    return `${environment.frontendUrl || 'http://localhost:4200'}/verificacion/${folio}`;
  }
  
  // ✅ --- INICIA EL CAMBIO ---
  // La función ahora usa getVerificationUrl para abrir la vista pública
  visualizarCertificado(certificado: Certificado): void {
    
    // 1. Obtenemos la URL de verificación (la misma que usará el QR)
    //    usando la función que ya tenías.
    const verificationUrl = this.getVerificationUrl(certificado.folio);
    
    // 2. Abrimos esa URL en una nueva pestaña.
    window.open(verificationUrl, '_blank');
  }
  // ✅ --- TERMINA EL CAMBIO ---


  // ✅ NUEVA FUNCIÓN: Para el botón de Reenviar 📧
  reenviarCertificado(certificado: Certificado): void {
    const participante = certificado.inscripcion?.participante;
    if (!participante) {
      this.notificationSvc.showError('No hay un participante asociado a este certificado.');
      return;
    }

    // Construir las opciones de email
    const opciones: string[] = [];
    if (participante.email_personal) {
      opciones.push(`1: Personal (${participante.email_personal})`);
    }
    if (participante.email_institucional) {
      opciones.push(`2: Institucional (${participante.email_institucional})`);
    }

    if (opciones.length === 0) {
      this.notificationSvc.showError('El participante no tiene correos registrados.');
      return;
    }

    const eleccion = prompt(`¿A qué correo deseas reenviar el certificado?\n\n${opciones.join('\n')}\n\nIngresa 1 o 2:`);

    let emailType: 'personal' | 'institucional' | null = null;

    if (eleccion === '1' && participante.email_personal) {
      emailType = 'personal';
    } else if (eleccion === '2' && participante.email_institucional) {
      emailType = 'institucional';
    } else if (eleccion) { // Si el usuario escribió algo pero no es '1' o '2' válidos
      this.notificationSvc.showError('Opción no válida.');
      return;
    }

    // Si emailType no es null (es decir, el usuario seleccionó una opción válida y no canceló)
    if (emailType) {
      this.certificadoSvc.sendEmail(certificado.id, emailType).subscribe({
        next: () => {
          this.notificationSvc.showSuccess(`Certificado reenviado a ${emailType}.`);
        },
        error: (err: HttpErrorResponse) => this.handleError(err.error?.detail || 'Error al reenviar el correo')
      });
    }
  }

  private handleError(message: string): void {
    this.notificationSvc.showError(message);
    this.isLoading = false;
  }
}