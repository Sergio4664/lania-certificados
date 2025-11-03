import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms'; 
import { HttpErrorResponse } from '@angular/common/http';
import { environment } from '@environments/environment';
import { Observable } from 'rxjs'; 

// Interfaces
import { ProductoEducativo, ProductoEducativoWithDetails } from '@shared/interfaces/producto-educativo.interface';
import { DocenteDTO } from '@shared/interfaces/docente.interfaces';
import { Inscripcion } from '@shared/interfaces/inscripcion.interface';
import { Certificado, CertificadoCreate } from '@shared/interfaces/certificado.interface';

// Servicios
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
  
  allProductos: ProductoEducativoWithDetails[] = [];
  inscripcionesDelProducto: Inscripcion[] = []; // Participantes filtrados
  docentesDelProducto: DocenteDTO[] = [];       // Docentes filtrados
  
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

  // --- MÉTODOS PARA EL MODAL DE CREACIÓN ---

  loadProductosParaCrear(): void {
    this.productoSvc.getAllProductosWithDetails().subscribe({ 
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

  // --- ✅ 1. FUNCIÓN CORREGIDA ---
  onProductoSeleccionadoParaCrear(): void {
    const productoId = this.createForm.get('productoId')?.value;
    this.selectedProducto = this.allProductos.find(p => p.id === Number(productoId)) || null;

    if (this.selectedProducto) {
      const esCurso = this.selectedProducto.tipo_producto === 'CURSO_EDUCATIVO';

      // Filtrar participantes (inscripciones)
      this.inscripcionesDelProducto = this.selectedProducto.inscripciones.filter(inscripcion => {
        
        // Revisa si el participante ya tiene un certificado "Normal"
        const tieneCertNormal = inscripcion.certificados?.some(c => !c.con_competencias);
        
        if (!esCurso) {
          // Para Píldoras/Inyecciones: si ya tiene cert normal, se filtra.
          return !tieneCertNormal;
        }

        // Para Cursos: revisamos también el de competencias
        const tieneCertCompetencias = inscripcion.certificados?.some(c => c.con_competencias);

        // Se mantiene en la lista si le falta CUALQUIERA de los dos.
        // Solo se filtra si tiene AMBOS.
        return !tieneCertNormal || !tieneCertCompetencias; 
      });
      
      // Filtrar docentes (esta lógica no cambia)
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
    // Llamamos a la nueva función para resetear el checkbox
    this.onParticipanteSeleccionadoParaCrear();
  }

  // --- ✅ 2. NUEVA FUNCIÓN AÑADIDA ---
  /**
   * Se dispara al seleccionar un participante.
   * Comprueba si ya tiene la constancia normal y fuerza
   * la selección de "competencias" si es necesario.
   */
  onParticipanteSeleccionadoParaCrear(): void {
    const inscripcionId = this.createForm.get('inscripcionId')?.value;
    const conCompetenciasCtrl = this.createForm.get('conCompetencias');

    if (!inscripcionId || !this.selectedProducto || this.selectedProducto.tipo_producto !== 'CURSO_EDUCATIVO') {
      // Si no es un curso o no hay participante, habilitamos y reseteamos el checkbox
      conCompetenciasCtrl?.setValue(false);
      conCompetenciasCtrl?.enable();
      return;
    }

    // Buscar la inscripción seleccionada
    const inscripcion = this.inscripcionesDelProducto.find(i => i.id === Number(inscripcionId));
    
    // Comprobar si ya tiene la constancia normal
    const tieneCertNormal = inscripcion?.certificados?.some(c => !c.con_competencias);

    if (tieneCertNormal) {
      // Si ya tiene la normal, solo puede estar aquí para la de competencias.
      // Forzamos el check y lo deshabilitamos para evitar errores.
      conCompetenciasCtrl?.setValue(true);
      conCompetenciasCtrl?.disable();
    } else {
      // Si no tiene la normal, puede emitir la normal (o de competencias si la marca).
      // Habilitamos el checkbox y lo ponemos en falso.
      conCompetenciasCtrl?.setValue(false);
      conCompetenciasCtrl?.enable();
    }
  }

  // --- ✅ 3. FUNCIÓN MODIFICADA ---
  onCreateSubmit(): void {
    if (this.createForm.invalid) {
      this.notificationSvc.showInfo('Por favor, complete todos los campos requeridos.');
      return;
    }

    // Usamos getRawValue() para leer el valor del checkbox aunque esté deshabilitado
    const { productoId, tipoDestinatario, inscripcionId, docenteId, conCompetencias } = this.createForm.getRawValue();
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
        // Recargar los productos para que la próxima vez que abramos el modal, 
        // la lista de participantes esté actualizada.
        this.loadProductosParaCrear();
      },
      error: (err: HttpErrorResponse) => {
        this.isLoadingModalData = false;
        this.handleError(err, 'Error al emitir el certificado');
      }
    });
  }
  // --- FIN DE CAMBIOS ---


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
      // Determinamos el email_type correcto para docentes
      const emailType = certificado.docente ? 'institucional' : 'personal';
      
      this.certificadoSvc.sendEmail(certificado.id, emailType).subscribe({
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
