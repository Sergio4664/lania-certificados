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
      // ✅ CORRECCIÓN: El acceso a los datos anidados ahora es seguro
      c.inscripcion?.participante.nombre_completo.toLowerCase().includes(term) ||
      c.inscripcion?.producto_educativo.nombre.toLowerCase().includes(term)
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

  private handleError(message: string): void {
    this.notificationSvc.showError(message);
    this.isLoading = false;
  }
}