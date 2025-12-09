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

    // ✅ PROPIEDADES DE PAGINACIÓN para Participantes
    readonly PARTICIPANTES_LIMIT = 15;
    skipParticipantes = 0; // Offset (registro inicial a buscar)
    hasMoreParticipantes = false; // Indica si hay una página siguiente
    
    certificadosDocentes: Certificado[] = [];
    filteredCertificadosDocentes: Certificado[] = [];
    isLoadingDocentes = true;
    searchTermDocentes: string = '';

    // ✅ PROPIEDADES DE PAGINACIÓN para Docentes
    readonly DOCENTES_LIMIT = 15;
    skipDocentes = 0; // Offset (registro inicial a buscar)
    hasMoreDocentes = false; // Indica si hay una página siguiente

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
        conCompetencias: [false] // Este control será deshabilitado dinámicamente
    });


    ngOnInit(): void {
        this.loadCertificadosParticipantes();
        this.loadCertificadosDocentes();
        this.loadProductosParaCrear(); 
    }

    // --- Métodos para las Tablas ---

    loadCertificadosParticipantes(): void {
        this.isLoadingParticipantes = true;
        const requestLimit = this.PARTICIPANTES_LIMIT + 1;

        this.certificadoSvc.getCertificadosParticipantes(this.skipParticipantes, requestLimit).subscribe({
            next: (certificados) => {
                this.hasMoreParticipantes = certificados.length > this.PARTICIPANTES_LIMIT;
                const currentBatch = certificados.slice(0, this.PARTICIPANTES_LIMIT);

                this.certificadosParticipantes = currentBatch;
                this.filterCertificadosParticipantes(); 
                this.isLoadingParticipantes = false;
            },
            error: (err: HttpErrorResponse) => {
                this.isLoadingParticipantes = false;
                this.handleError(err, 'Error al cargar certificados de participantes');
            }
        });
    }
    
    nextPageParticipantes(): void {
        this.skipParticipantes += this.PARTICIPANTES_LIMIT;
        this.loadCertificadosParticipantes();
    }
    
    prevPageParticipantes(): void {
        this.skipParticipantes = Math.max(0, this.skipParticipantes - this.PARTICIPANTES_LIMIT);
        this.loadCertificadosParticipantes();
    }


    filterCertificadosParticipantes(): void {
        const term = this.searchTermParticipantes.toLowerCase();
        this.filteredCertificadosParticipantes = this.certificadosParticipantes.filter(c =>
            c.folio.toLowerCase().includes(term) ||
            (c.inscripcion?.participante && c.inscripcion.participante.nombre_completo.toLowerCase().includes(term)) ||
            (c.inscripcion?.producto_educativo && c.inscripcion.producto_educativo.nombre.toLowerCase().includes(term))
        );
    }

    loadCertificadosDocentes(): void {
        this.isLoadingDocentes = true;
        const requestLimit = this.DOCENTES_LIMIT + 1;

        this.certificadoSvc.getCertificadosDocentes(this.skipDocentes, requestLimit).subscribe({
            next: (certificados) => {
                this.hasMoreDocentes = certificados.length > this.DOCENTES_LIMIT;
                const currentBatch = certificados.slice(0, this.DOCENTES_LIMIT);

                this.certificadosDocentes = currentBatch;
                this.filterCertificadosDocentes();
                this.isLoadingDocentes = false;
            },
            error: (err: HttpErrorResponse) => {
                this.isLoadingDocentes = false;
                this.handleError(err, 'Error al cargar certificados de docentes');
            }
        });
    }

    nextPageDocentes(): void {
        this.skipDocentes += this.DOCENTES_LIMIT;
        this.loadCertificadosDocentes();
    }
    
    prevPageDocentes(): void {
        this.skipDocentes = Math.max(0, this.skipDocentes - this.DOCENTES_LIMIT);
        this.loadCertificadosDocentes();
    }


    filterCertificadosDocentes(): void {
        const term = this.searchTermDocentes.toLowerCase();
        this.filteredCertificadosDocentes = this.certificadosDocentes.filter(c =>
            c.folio.toLowerCase().includes(term) ||
            (c.docente?.nombre_completo && c.docente.nombre_completo.toLowerCase().includes(term))
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
        this.createForm.get('conCompetencias')?.enable(); 
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
            const esCurso = this.selectedProducto.tipo_producto === 'CURSO_EDUCATIVO';

            // Filtrar participantes (inscripciones)
            this.inscripcionesDelProducto = this.selectedProducto.inscripciones.filter(inscripcion => {
                const tieneCertNormal = inscripcion.certificados?.some(c => !c.con_competencias) || false;
                const tieneCertCompetencias = inscripcion.certificados?.some(c => c.con_competencias) || false;
                
                if (!esCurso) {
                    return !tieneCertNormal;
                }

                const tieneAmbos = tieneCertNormal && tieneCertCompetencias;
                return !tieneAmbos; 
            });
            
            // Filtrar docentes
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
        this.onParticipanteSeleccionadoParaCrear();
    }

    onParticipanteSeleccionadoParaCrear(): void {
        const inscripcionId = this.createForm.get('inscripcionId')?.value;
        const conCompetenciasCtrl = this.createForm.get('conCompetencias');
        const esCurso = this.selectedProducto?.tipo_producto === 'CURSO_EDUCATIVO';

        if (!this.selectedProducto || !esCurso || !inscripcionId) {
            conCompetenciasCtrl?.setValue(false);
            conCompetenciasCtrl?.enable();
            return;
        }

        const inscripcion = this.inscripcionesDelProducto.find(i => i.id === Number(inscripcionId));
        
        if (!inscripcion) {
            conCompetenciasCtrl?.setValue(false);
            conCompetenciasCtrl?.enable();
            return;
        }
        
        const tieneCertNormal = inscripcion.certificados?.some(c => !c.con_competencias) || false;
        const tieneCertCompetencias = inscripcion.certificados?.some(c => c.con_competencias) || false;

        if (tieneCertNormal && !tieneCertCompetencias) {
            conCompetenciasCtrl?.setValue(true);
            conCompetenciasCtrl?.disable();
        } else if (!tieneCertNormal && tieneCertCompetencias) {
            conCompetenciasCtrl?.setValue(false); 
            conCompetenciasCtrl?.disable(); 
        } else if (!tieneCertNormal && !tieneCertCompetencias) {
            conCompetenciasCtrl?.setValue(false);
            conCompetenciasCtrl?.enable();
        } else {
            conCompetenciasCtrl?.setValue(false);
            conCompetenciasCtrl?.disable();
        }
    }

    onCreateSubmit(): void {
        if (this.createForm.invalid) {
            this.notificationSvc.showInfo('Por favor, complete todos los campos requeridos.');
            return;
        }

        const { productoId, tipoDestinatario, inscripcionId, docenteId, conCompetencias } = this.createForm.getRawValue();
        let request$: Observable<Certificado>;

        if (tipoDestinatario === 'participante') {
            if (!inscripcionId) {
                this.notificationSvc.showInfo('Debe seleccionar un participante.');
                return;
            }
            
            const payload: CertificadoCreate = {
                inscripcion_id: inscripcionId as number,
                producto_educativo_id: productoId as number,
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
                
                this.skipParticipantes = 0;
                this.skipDocentes = 0;

                this.loadCertificadosParticipantes();
                this.loadCertificadosDocentes();
                this.loadProductosParaCrear();
            },
            error: (err: HttpErrorResponse) => {
                this.isLoadingModalData = false;
                this.handleError(err, 'Error al emitir el certificado');
            }
        });
    }


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
        
        let emailType: 'institucional' | 'personal' = 'personal'; 
        let email = certificado.inscripcion?.participante?.email_personal;

        if (certificado.docente) {
            const emailTypeChoice = prompt("Enviar a email: (institucional / personal)", "institucional")?.toLowerCase();
            emailType = (emailTypeChoice === 'personal') ? 'personal' : 'institucional';
            email = (emailType === 'personal') ? certificado.docente.email_personal : certificado.docente.email_institucional;
        }
        
        email = email || 'correo no disponible';

        if (confirm(`¿Está seguro de reenviar el certificado ${certificado.folio} a ${destinatario} (${email})?`)) {
            if (!email || email === 'correo no disponible') {
                this.notificationSvc.showError(`El destinatario no tiene un email ${emailType} registrado.`);
                return;
            }
            
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
        const nombre = certificado.inscripcion?.participante?.nombre_completo || certificado.docente?.nombre_completo || 'el destinatario';
        const tipo = certificado.inscripcion ? 'participante' : (certificado.docente ? 'docente' : 'destinatario');

        const mensaje = `¿Está seguro de eliminar el certificado con folio ${certificado.folio} del ${tipo} ${nombre}? Esta acción no se puede deshacer.`;

        if (confirm(mensaje)) {
            this.certificadoSvc.delete(certificado.id).subscribe({
                next: () => {
                    this.notificationSvc.showSuccess('Certificado eliminado.');
                    
                    this.skipParticipantes = 0;
                    this.skipDocentes = 0;
                    
                    this.loadCertificadosParticipantes();
                    this.loadCertificadosDocentes();
                    this.loadProductosParaCrear(); 
                },
                error: (err: HttpErrorResponse) => this.handleError(err, 'Error al eliminar')
            });
        }
    }

    // 🚨 CORRECCIÓN CLAVE: Método que genera la URL pública para el folio
    getVerificationUrl(folio: string): string {
        // Usamos la variable FRONTEND_URL (o la URL de la API) como fallback.
        // environment.frontendUrl DEBE ser definido en environment.prod.ts para ser usado aquí.
        const base = environment.frontendUrl || environment.baseUrl || environment.apiUrl; 
        
        // Asegura que no haya doble barra final y añade la ruta de verificación de Angular
        return `${base.replace(/\/$/, '')}/verificacion/${folio}`; 
    }

    private handleError(error: any, context: string = 'Error'): void {
        const errorMsg = (error instanceof HttpErrorResponse) ? (error.error?.detail || error.message) : (error.message || String(error));
        this.notificationSvc.showError(`${context}: ${errorMsg || 'Ocurrió un error'}`);
        console.error(context, error);
    }
}