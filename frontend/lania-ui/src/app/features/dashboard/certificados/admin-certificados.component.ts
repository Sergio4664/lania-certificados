// Ruta: frontend/lania-ui/src/app/features/dashboard/certificados/admin-certificados.component.ts
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
    // showAllParticipantes se elimina en favor de la paginación
    
    certificadosDocentes: Certificado[] = [];
    filteredCertificadosDocentes: Certificado[] = [];
    isLoadingDocentes = true;
    searchTermDocentes: string = '';

    // ✅ PROPIEDADES DE PAGINACIÓN para Docentes
    readonly DOCENTES_LIMIT = 15;
    skipDocentes = 0; // Offset (registro inicial a buscar)
    hasMoreDocentes = false; // Indica si hay una página siguiente
    // showAllDocentes se elimina en favor de la paginación

    // --- PROPIEDADES PARA EL MODAL DE CREACIÓN ---
    showCreateModal = false;
    isLoadingModalData = false;
    
    allProductos: ProductoEducativoWithDetails[] = [];
    inscripcionesDelProducto: Inscripcion[] = []; // Participantes filtrados
    docentesDelProducto: DocenteDTO[] = [];       // Docentes filtrados
    
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

    // 🔄 FUNCIÓN MODIFICADA: Implementa paginación con skip y limit + 1
    loadCertificadosParticipantes(): void {
        this.isLoadingParticipantes = true;
        // Solicitamos LIMIT + 1 (16 registros) para saber si hay una página siguiente
        const requestLimit = this.PARTICIPANTES_LIMIT + 1;

        // ✅ Pasar skip y el límite de solicitud al servicio
        this.certificadoSvc.getCertificadosParticipantes(this.skipParticipantes, requestLimit).subscribe({
            next: (certificados) => {
                // Verificar si hay más de 15 para saber si habilitar 'Siguiente'
                this.hasMoreParticipantes = certificados.length > this.PARTICIPANTES_LIMIT;
                
                // Recortar la lista para mostrar solo los 15 elementos de la página actual
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
    
    // ✅ NUEVA FUNCIÓN: Siguiente página para Participantes
    nextPageParticipantes(): void {
        this.skipParticipantes += this.PARTICIPANTES_LIMIT;
        this.loadCertificadosParticipantes();
    }
    
    // ✅ NUEVA FUNCIÓN: Página anterior para Participantes
    prevPageParticipantes(): void {
        // Asegurar que skip nunca sea menor que 0
        this.skipParticipantes = Math.max(0, this.skipParticipantes - this.PARTICIPANTES_LIMIT);
        this.loadCertificadosParticipantes();
    }


    filterCertificadosParticipantes(): void {
        const term = this.searchTermParticipantes.toLowerCase();
        // Solo se aplica el filtro a la página actual cargada
        this.filteredCertificadosParticipantes = this.certificadosParticipantes.filter(c =>
            c.folio.toLowerCase().includes(term) ||
            (c.inscripcion?.participante && c.inscripcion.participante.nombre_completo.toLowerCase().includes(term)) ||
            (c.inscripcion?.producto_educativo && c.inscripcion.producto_educativo.nombre.toLowerCase().includes(term))
        );
    }

    // 🔄 FUNCIÓN MODIFICADA: Implementa paginación con skip y limit + 1
    loadCertificadosDocentes(): void {
        this.isLoadingDocentes = true;
        // Solicitamos LIMIT + 1 (16 registros) para saber si hay una página siguiente
        const requestLimit = this.DOCENTES_LIMIT + 1;

        // ✅ Pasar skip y el límite de solicitud al servicio
        this.certificadoSvc.getCertificadosDocentes(this.skipDocentes, requestLimit).subscribe({
            next: (certificados) => {
                // Verificar si hay más de 15 para saber si habilitar 'Siguiente'
                this.hasMoreDocentes = certificados.length > this.DOCENTES_LIMIT;
                
                // Recortar la lista para mostrar solo los 15 elementos de la página actual
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

    // ✅ NUEVA FUNCIÓN: Siguiente página para Docentes
    nextPageDocentes(): void {
        this.skipDocentes += this.DOCENTES_LIMIT;
        this.loadCertificadosDocentes();
    }
    
    // ✅ NUEVA FUNCIÓN: Página anterior para Docentes
    prevPageDocentes(): void {
        // Asegurar que skip nunca sea menor que 0
        this.skipDocentes = Math.max(0, this.skipDocentes - this.DOCENTES_LIMIT);
        this.loadCertificadosDocentes();
    }


    filterCertificadosDocentes(): void {
        const term = this.searchTermDocentes.toLowerCase();
        // Solo se aplica el filtro a la página actual cargada
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
        // Habilitar el control por si se quedó deshabilitado
        this.createForm.get('conCompetencias')?.enable(); 
        this.selectedProducto = null;
        this.inscripcionesDelProducto = [];
        this.docentesDelProducto = [];
        this.showCreateModal = true;
    }

    closeCreateModal(): void {
        this.showCreateModal = false;
    }

    /**
     * ✅ FUNCIÓN CORREGIDA (Lógica de filtrado mejorada)
     * Se activa al seleccionar un producto.
     */
    onProductoSeleccionadoParaCrear(): void {
        const productoId = this.createForm.get('productoId')?.value;
        this.selectedProducto = this.allProductos.find(p => p.id === Number(productoId)) || null;

        if (this.selectedProducto) {
            const esCurso = this.selectedProducto.tipo_producto === 'CURSO_EDUCATIVO';

            // Filtrar participantes (inscripciones)
            this.inscripcionesDelProducto = this.selectedProducto.inscripciones.filter(inscripcion => {
                // Verificar qué certificados tiene el participante
                const tieneCertNormal = inscripcion.certificados?.some(c => !c.con_competencias) || false;
                const tieneCertCompetencias = inscripcion.certificados?.some(c => c.con_competencias) || false;
                
                if (!esCurso) {
                    // Si NO es un curso (píldora/inyección), solo puede tener UN certificado normal.
                    // Se mantiene en la lista solo si NO tiene certificado normal.
                    return !tieneCertNormal;
                }

                // Si SÍ es un curso, puede tener HASTA DOS certificados:
                // 1. Certificado normal (participación)
                // 2. Certificado de competencias
                
                // Se mantiene en la lista si le falta AL MENOS UNO de los dos.
                // Solo se excluye si ya tiene AMBOS.
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
        // Llamamos a la función de lógica del checkbox para resetearlo
        this.onParticipanteSeleccionadoParaCrear();
    }

    /**
     * ✅ FUNCIÓN CORREGIDA: Lógica del checkbox mejorada con validaciones adicionales.
     * Se dispara al seleccionar un participante.
     */
    onParticipanteSeleccionadoParaCrear(): void {
        const inscripcionId = this.createForm.get('inscripcionId')?.value;
        const conCompetenciasCtrl = this.createForm.get('conCompetencias');
        const esCurso = this.selectedProducto?.tipo_producto === 'CURSO_EDUCATIVO';

        // Si no hay producto, no es curso o no hay participante seleccionado
        if (!this.selectedProducto || !esCurso || !inscripcionId) {
            // Resetear y habilitar el checkbox
            conCompetenciasCtrl?.setValue(false);
            conCompetenciasCtrl?.enable();
            return;
        }

        // Buscar la inscripción completa en el array filtrado
        const inscripcion = this.inscripcionesDelProducto.find(i => i.id === Number(inscripcionId));
        
        if (!inscripcion) {
            console.warn('Inscripción no encontrada en la lista filtrada');
            conCompetenciasCtrl?.setValue(false);
            conCompetenciasCtrl?.enable();
            return;
        }
        
        // Obtener el estado de AMBOS certificados
        const tieneCertNormal = inscripcion.certificados?.some(c => !c.con_competencias) || false;
        const tieneCertCompetencias = inscripcion.certificados?.some(c => c.con_competencias) || false;

        // Determinar el comportamiento del checkbox según el estado
        if (tieneCertNormal && !tieneCertCompetencias) {
            // CASO 1: Tiene la normal, falta la de competencias.
            // -> Forzar a TRUE (competencias) y deshabilitar.
            conCompetenciasCtrl?.setValue(true);
            conCompetenciasCtrl?.disable();
            console.log('Participante ya tiene certificado normal. Se forzará emisión de competencias.');
        } else if (!tieneCertNormal && tieneCertCompetencias) {
            // CASO 2: Tiene la de competencias, falta la normal.
            // -> Forzar a FALSE (normal) y deshabilitar.
            conCompetenciasCtrl?.setValue(false); 
            conCompetenciasCtrl?.disable(); 
            console.log('Participante ya tiene certificado de competencias. Se forzará emisión normal.');
        } else if (!tieneCertNormal && !tieneCertCompetencias) {
            // CASO 3: No tiene ninguno.
            // -> Habilitar y dejar que el usuario elija (por defecto FALSE = normal).
            conCompetenciasCtrl?.setValue(false);
            conCompetenciasCtrl?.enable();
            console.log('Participante no tiene ningún certificado. Usuario puede elegir tipo.');
        } else {
            // CASO 4: Tiene ambos (no debería llegar aquí por el filtrado previo)
            console.warn('El participante ya tiene ambos certificados. No debería estar en la lista.');
            conCompetenciasCtrl?.setValue(false);
            conCompetenciasCtrl?.disable();
        }
    }

    /**
     * ✅ FUNCIÓN CORREGIDA (Usar getRawValue y añadir producto_educativo_id)
     * Se dispara al enviar el formulario de creación.
     */
    onCreateSubmit(): void {
        if (this.createForm.invalid) {
            this.notificationSvc.showInfo('Por favor, complete todos los campos requeridos.');
            return;
        }

        // Usamos .getRawValue() para leer los valores de los campos deshabilitados (como conCompetencias)
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
                
                // ✅ Resetear la paginación a la primera página y recargar
                this.skipParticipantes = 0;
                this.skipDocentes = 0;

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
        
        // Lógica de email mejorada
        let emailType: 'institucional' | 'personal' = 'personal'; // Default para participante
        let email = certificado.inscripcion?.participante?.email_personal;

        if (certificado.docente) {
            // Si es docente, preguntamos al usuario
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

    /**
     * ✅ FUNCIÓN MODIFICADA: Cambia el mensaje de confirmación para incluir el nombre y tipo.
     */
    deleteCertificado(certificado: Certificado): void {
        // Determinar el nombre y tipo del destinatario
        const nombre = certificado.inscripcion?.participante?.nombre_completo || certificado.docente?.nombre_completo || 'el destinatario';
        const tipo = certificado.inscripcion ? 'participante' : (certificado.docente ? 'docente' : 'destinatario');

        const mensaje = `¿Está seguro de eliminar el certificado con folio ${certificado.folio} del ${tipo} ${nombre}? Esta acción no se puede deshacer.`;

        if (confirm(mensaje)) {
            this.certificadoSvc.delete(certificado.id).subscribe({
                next: () => {
                    this.notificationSvc.showSuccess('Certificado eliminado.');
                    
                    // ✅ Resetear la paginación a la primera página y recargar
                    this.skipParticipantes = 0;
                    this.skipDocentes = 0;
                    
                    this.loadCertificadosParticipantes();
                    this.loadCertificadosDocentes();
                    this.loadProductosParaCrear(); // Recargar productos para el modal
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