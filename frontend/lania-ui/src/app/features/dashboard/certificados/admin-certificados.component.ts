import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms'; 
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '@environments/environment';
import { Observable } from 'rxjs'; 

// 💡 --- CORRECCIÓN 1: Importar 'ProductoEducativoWithDetails' ---
import { ProductoEducativo, ProductoEducativoWithDetails } from '@shared/interfaces/producto-educativo.interface';
import { DocenteDTO } from '@shared/interfaces/docente.interfaces';
import { Inscripcion } from '@shared/interfaces/inscripcion.interface';

import { Certificado, CertificadoCreate } from '@shared/interfaces/certificado.interface';
import { CertificadoService } from '@shared/services/certificado.service';
import { NotificationService } from '@shared/services/notification.service';

import { ProductoEducativoService } from '@shared/services/producto-educativo.service';

@Component({
  selector: 'app-admin-certificados',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DatePipe], 
  templateUrl: './admin-certificados.component.html',
  styleUrls: ['./admin-certificados.component.css']
})
export default class AdminCertificadosComponent implements OnInit {
  private certificadoSvc = inject(CertificadoService);
  private notificationSvc = inject(NotificationService);
  private productoSvc = inject(ProductoEducativoService);
  private fb = inject(FormBuilder);

  // --- Propiedades para las Tablas ---
  certificadosParticipantes: Certificado[] = [];
  filteredCertificadosParticipantes: Certificado[] = [];
  isLoadingParticipantes = true;
  searchTermParticipantes: string = '';

  certificadosDocentes: Certificado[] = [];
  filteredCertificadosDocentes: Certificado[] = [];
  isLoadingDocentes = true;
  searchTermDocentes: string = '';

  // --- PROPIEDADES PARA EL MODAL DE CREACIÓN ---
  showCreateModal = false;
  isLoadingModalData = false;
  
  // 💡 --- CORRECCIÓN 2: Cambiar tipo a 'ProductoEducativoWithDetails' ---
  allProductos: ProductoEducativoWithDetails[] = [];
  inscripcionesDelProducto: Inscripcion[] = [];
  docentesDelProducto: DocenteDTO[] = [];
  // 💡 --- CORRECCIÓN 3: Cambiar tipo a 'ProductoEducativoWithDetails' ---
  selectedProducto: ProductoEducativoWithDetails | null = null;

  createForm = this.fb.group({
    productoId: [null as number | null, Validators.required],
    tipoDestinatario: ['participante', Validators.required],
    inscripcionId: [null as number | null], 
    docenteId: [null as number | null],     
    conCompetencias: [false] 
  });


  ngOnInit(): void {
    this.loadCertificadosParticipantes();
    this.loadCertificadosDocentes();
    this.loadProductosParaCrear(); 
  }

  // --- Métodos para las Tablas (Sin cambios) ---

  loadCertificadosParticipantes(): void {
    this.isLoadingParticipantes = true;
    this.certificadoSvc.getCertificadosParticipantes().subscribe({
      next: (certificados) => {
        this.certificadosParticipantes = certificados;
        this.filteredCertificadosParticipantes = certificados;
        this.isLoadingParticipantes = false;
      },
      error: (err: HttpErrorResponse) => {
        this.isLoadingParticipantes = false;
        this.handleError(err, 'Error al cargar certificados de participantes');
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

  loadCertificadosDocentes(): void {
    this.isLoadingDocentes = true;
    this.certificadoSvc.getCertificadosDocentes().subscribe({
      next: (certificados) => {
        this.certificadosDocentes = certificados;
        this.filteredCertificadosDocentes = certificados;
        this.isLoadingDocentes = false;
      },
      error: (err: HttpErrorResponse) => {
        this.isLoadingDocentes = false;
        this.handleError(err, 'Error al cargar certificados de docentes');
      }
    });
  }

  filterCertificadosDocentes(): void {
    const term = this.searchTermDocentes.toLowerCase();
    this.filteredCertificadosDocentes = this.certificadosDocentes.filter(c =>
      c.folio.toLowerCase().includes(term) ||
      c.docente?.nombre_completo.toLowerCase().includes(term)
    );
  }

  // --- MÉTODOS AÑADIDOS PARA EL MODAL DE CREACIÓN ---

  loadProductosParaCrear(): void {
    // ⬇️ *** ESTA ES LA LÍNEA CORREGIDA ***
    this.productoSvc.getAllProductosWithDetails().subscribe({ //
      // 💡 --- CORRECCIÓN 4: Usar el tipo 'ProductoEducativoWithDetails' ---
      next: (productos: ProductoEducativoWithDetails[]) => {
        this.allProductos = productos.sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime());
      },
      error: (err: HttpErrorResponse) => this.handleError(err, "Error al cargar productos educativos")
    });
  }

  openCreateModal(): void {
    this.createForm.reset({
      productoId: null,
      tipoDestinatario: 'participante',
      inscripcionId: null,
      docenteId: null,
      conCompetencias: false
    });
    this.selectedProducto = null;
    this.inscripcionesDelProducto = [];
    this.docentesDelProducto = [];
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  onProductoSeleccionadoParaCrear(): void {
    const productoId = this.createForm.get('productoId')?.value;
    this.selectedProducto = this.allProductos.find(p => p.id === Number(productoId)) || null;

    if (this.selectedProducto) {
      // (Estos 'certificados' vienen de las interfaces de Inscripcion y Docente que corregimos)
      this.inscripcionesDelProducto = this.selectedProducto.inscripciones.filter(i => 
        !i.certificados?.some((c: Certificado) => c.producto_educativo_id === this.selectedProducto?.id)
      );
      
      this.docentesDelProducto = this.selectedProducto.docentes.filter(d => 
        !d.certificados?.some((c: Certificado) => c.producto_educativo_id === this.selectedProducto?.id)
      );

    } else {
      this.inscripcionesDelProducto = [];
      this.docentesDelProducto = [];
    }
    
    // Resetear selecciones dependientes
    this.createForm.get('inscripcionId')?.reset();
    this.createForm.get('docenteId')?.reset();
  }

  onCreateSubmit(): void {
    if (this.createForm.invalid) {
      this.notificationSvc.showInfo('Por favor, complete todos los campos requeridos.');
      return;
    }

    const { productoId, tipoDestinatario, inscripcionId, docenteId, conCompetencias } = this.createForm.value;
    let request$: Observable<Certificado>;

    if (tipoDestinatario === 'participante') {
      if (!inscripcionId) {
        this.notificationSvc.showInfo('Debe seleccionar un participante.');
        return;
      }
      const payload: CertificadoCreate = {
        inscripcion_id: inscripcionId as number,
        con_competencias: conCompetencias || false
      };
      request$ = this.certificadoSvc.createForParticipant(payload);

    } else { // tipoDestinatario === 'docente'
      if (!docenteId) {
        this.notificationSvc.showInfo('Debe seleccionar un docente.');
        return;
      }
      const payload: CertificadoCreate = {
        docente_id: docenteId as number,
        producto_educativo_id: productoId as number
      };
      request$ = this.certificadoSvc.createForDocente(payload);
    }
    
    this.isLoadingModalData = true; 
    request$.subscribe({
      next: (nuevoCertificado: Certificado) => {
        this.notificationSvc.showSuccess(`¡Éxito! Se emitió el certificado con folio ${nuevoCertificado.folio}`);
        this.isLoadingModalData = false;
        this.closeCreateModal();
        // Recargar las tablas del dashboard
        this.loadCertificadosParticipantes();
        this.loadCertificadosDocentes();
      },
      error: (err: HttpErrorResponse) => {
        this.isLoadingModalData = false;
        this.handleError(err, 'Error al emitir el certificado');
      }
    });
  }

  // --- FIN DE MÉTODOS AÑADIDOS ---


  // --- Métodos Comunes (Reutilizados) ---
  
  visualizarCertificado(certificado: Certificado): void {
    this.certificadoSvc.getCertificadoBlob(certificado.folio).subscribe({
      next: (blob) => {
        const fileURL = URL.createObjectURL(blob);
        window.open(fileURL, '_blank');
      },
      error: (err: HttpErrorResponse) => {
        const errorMsg = err.error instanceof Blob ? "No se pudo leer el archivo" : err.error?.detail;
        this.handleError(err, `Error al visualizar el certificado`);
      }
    });
  }

  reenviarCertificado(certificado: Certificado): void {
    const destinatario = certificado.inscripcion?.participante?.nombre_completo || certificado.docente?.nombre_completo || 'el destinatario';
    const email = certificado.inscripcion?.participante?.email_personal || certificado.docente?.email_institucional || 'su correo';

    if (confirm(`¿Está seguro de reenviar el certificado ${certificado.folio} a ${destinatario} (${email})?`)) {
      // Llamamos con 2 argumentos para compatibilidad con 'admin-productos-educativos'
      this.certificadoSvc.sendEmail(certificado.id, 'personal').subscribe({
        next: (res) => {
          this.notificationSvc.showSuccess(res.message || 'Certificado reenviado exitosamente.');
        },
        error: (err: HttpErrorResponse) => {
          this.handleError(err, 'Error al reenviar el certificado');
        }
      });
    }
  }

  deleteCertificado(certificado: Certificado): void {
    if (confirm(`¿Está seguro de eliminar el certificado con folio ${certificado.folio}?`)) {
      this.certificadoSvc.delete(certificado.id).subscribe({
        next: () => {
          this.notificationSvc.showSuccess('Certificado eliminado.');
          this.loadCertificadosParticipantes();
          this.loadCertificadosDocentes();
        },
        error: (err: HttpErrorResponse) => this.handleError(err, 'Error al eliminar')
      });
    }
  }

  getVerificationUrl(folio: string): string {
    return `${environment.frontendUrl || 'http://localhost:4200'}/verificacion/${folio}`;
  }

  private handleError(error: any, context: string = 'Error'): void {
    const errorMsg = (error instanceof HttpErrorResponse) ? (error.error?.detail || error.message) : (error.message || String(error));
    this.notificationSvc.showError(`${context}: ${errorMsg || 'Ocurrió un error'}`);
    console.error(context, error);
  }
}