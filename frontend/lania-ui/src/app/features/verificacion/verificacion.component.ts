import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common'; // ✅ DatePipe eliminado de aquí
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { VerificacionService } from '@shared/services/verificacion.service';
import { CertificadoPublic } from '@shared/interfaces/certificado.interface';
import { NotificationService } from '@shared/services/notification.service';

@Component({
  selector: 'app-verificacion',
  standalone: true,
  // ✅ DatePipe eliminado de los imports
  imports: [CommonModule, FormsModule], 
  templateUrl: './verificacion.component.html',
  styleUrls: ['./verificacion.component.css']
})
export default class VerificacionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private verificacionSvc = inject(VerificacionService);
  private notificationSvc = inject(NotificationService);

  folioParaVerificar: string = '';
  certificadoVerificado: CertificadoPublic | null = null;
  isLoading = false;
  errorMensaje: string | null = null;
  fueVerificado = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const folioFromUrl = params.get('folio');
      if (folioFromUrl) {
        this.folioParaVerificar = folioFromUrl;
        this.verificarCertificado(); 
      } else {
        this.resetVerification();
      }
    });
  }

  buscarManualmente(): void {
    if (this.folioParaVerificar && this.folioParaVerificar.trim() !== '') {
      this.router.navigate(['/verificacion', this.folioParaVerificar.trim()]);
    } else {
      this.notificationSvc.showError('Por favor, ingresa un folio para verificar.');
    }
  }

  verificarCertificado(): void {
    if (!this.folioParaVerificar) return;

    this.isLoading = true;
    this.fueVerificado = true;
    this.certificadoVerificado = null;
    this.errorMensaje = null;

    this.verificacionSvc.verificarPorFolio(this.folioParaVerificar).subscribe({
      next: (certificado) => {
        this.certificadoVerificado = certificado;
        this.isLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.errorMensaje = 'Constancia no encontrada. Verifica que el folio sea correcto.';
        } else {
          this.errorMensaje = err.error?.detail || 'Ocurrió un error al verificar la constancia.';
        }
        
        // ✅ --- INICIA CORRECCIÓN TS2345 ---
        // Nos aseguramos que errorMensaje no sea null antes de pasarlo
        if (this.errorMensaje) { 
          this.notificationSvc.showError(this.errorMensaje); // Muestra notificación
        } else {
          // Si por alguna razón no hay mensaje, mostramos uno genérico
           this.notificationSvc.showError('Ocurrió un error desconocido.');
        }
        // ✅ --- TERMINA CORRECCIÓN TS2345 ---

        this.isLoading = false;
      }
    });
  }

  resetVerification(): void {
      this.folioParaVerificar = '';
      this.certificadoVerificado = null;
      this.isLoading = false;
      this.errorMensaje = null;
      this.fueVerificado = false;
  }
}