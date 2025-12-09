//Ruta: frontend/lania-ui/src/app/features/dashboard/productos-educativos/admin-productos-educativos.component.ts
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  FormArray,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { forkJoin, of, Observable } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { HttpErrorResponse } from '@angular/common/http';

// Interfaces
import {
  ProductoEducativo,
  ProductoEducativoCreate,
  ProductoEducativoUpdate,
  ProductoEducativoWithDetails
} from '@shared/interfaces/producto-educativo.interface';
import { DocenteDTO } from '@shared/interfaces/docente.interfaces';
import { Participante } from '@shared/interfaces/participante.interface';
import { Inscripcion, InscripcionCreate } from '@shared/interfaces/inscripcion.interface';
import { Certificado, CertificadoCreate, EmisionMasivaResponse } from '@shared/interfaces/certificado.interface';

// Servicios
import { ProductoEducativoService } from '@shared/services/producto-educativo.service';
import { DocenteService } from '@shared/services/docente.service';
import { NotificationService } from '@shared/services/notification.service';
import { InscripcionService } from '@shared/services/inscripcion.service';
import { CertificadoService } from '@shared/services/certificado.service';
import { ParticipanteService } from '@shared/services/participante.service';


// Validador para asegurar que la fecha de fin no sea anterior a la de inicio
export const dateRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const group = control as FormGroup;
  const startDate = group.get('fecha_inicio')?.value;
  const endDate = group.get('fecha_fin')?.value;

  if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
    return { dateRangeInvalid: true };
  }
  return null;
};


@Component({
  selector: 'app-admin-productos-educativos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DatePipe],
  templateUrl: './admin-productos-educativos.component.html',
  styleUrls: ['./admin-productos-educativos.component.css']
})
export class AdminProductosEducativosComponent implements OnInit {

  // SERVICIOS
  private productoSvc = inject(ProductoEducativoService);
  private docenteSvc = inject(DocenteService);
  private participanteSvc = inject(ParticipanteService);
  private inscripcionSvc = inject(InscripcionService);
  private certificadoSvc = inject(CertificadoService);
  private notificationSvc = inject(NotificationService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  Math = Math; // Exponer Math para usarlo en el template
  readonly ITEMS_PER_PAGE = 3;

  // DATOS
  private productos: ProductoEducativoWithDetails[] = [];
  docentes: DocenteDTO[] = [];
  participantes: Participante[] = [];
  certificados: Certificado[] = [];
    
  // Arrays completos (filtrados)
  cursos: ProductoEducativoWithDetails[] = [];
  pildoras: ProductoEducativoWithDetails[] = [];
  inyecciones: ProductoEducativoWithDetails[] = [];
    
  // PAGINACIÓN
  cursosPage = 0;
  pildorasPage = 0;
  inyeccionesPage = 0;
    
  // Arrays paginados (que se mostrarán en la vista)
  cursosPaginados: ProductoEducativoWithDetails[] = [];
  pildorasPaginadas: ProductoEducativoWithDetails[] = [];
  inyeccionesPaginadas: ProductoEducativoWithDetails[] = [];
    
  inscripcionesDelProducto: Inscripcion[] = [];

  // ESTADO DE UI
  showCourseForm = false;
  editingCourse: ProductoEducativoWithDetails | null = null;
  selectedCourse: ProductoEducativoWithDetails | null = null;
  showAddParticipantForm = false;
  showCompetenciesModal = false;
  searchTerm: string = '';
  selectedFile: File | null = null;
  isLoading: boolean = false;


  competencyRecipients = new Set<number>();
  selectedDocenteIds = new Set<number>();
  public docenteEmailSelection: { [docenteId: number]: 'institucional' | 'personal' | null } = {};

  courseForm!: FormGroup;
  competenciesList: string[] = [];
  participantToAdd: number | null = null;

  constructor() { }

  ngOnInit() {
    this.initializeForm();
    this.loadInitialData();
  }

  // --- LÓGICA DE INICIALIZACIÓN ---
  initializeForm(): void {
    this.courseForm = this.fb.group({
      nombre: ['', Validators.required],
      horas: [8, [Validators.required, Validators.min(1)]],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      tipo_producto: ['CURSO_EDUCATIVO', Validators.required],
      modalidad: ['PRESENCIAL', Validators.required],
        
      docentes_ids: this.fb.array(
        [],
        [Validators.required, Validators.minLength(1)]
      ),
        
      competencias: ['']
    }, {
      validators: dateRangeValidator
    });
  }

  // Corregido: Renombrado a loadInitialData (ya se usa en ngOnInit)
  loadInitialData(): void {
    this.isLoading = true;
    const selectedCourseId = this.selectedCourse?.id;

    forkJoin({
      productos: this.productoSvc.getAllProductosWithDetails(), 
      docentes: this.docenteSvc.getAll(), 
      participantes: this.participanteSvc.getAll(),
      certificados: this.certificadoSvc.getAll()
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        this.handleError(error, 'Error al cargar datos iniciales');
        this.isLoading = false;
        return of({ productos: [], docentes: [], participantes: [], certificados: [] } as any);
      })
    ).subscribe(({ productos, docentes, participantes, certificados }) => {
      this.productos = productos.sort((a: ProductoEducativoWithDetails, b: ProductoEducativoWithDetails) =>
        new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime()
      );
      this.docentes = docentes;
      this.participantes = participantes;
        
      this.certificados = certificados.map((cert: Certificado) => ({
        ...cert,
        con_competencias: cert.con_competencias === true
      }));
        
      this.groupAndFilterProducts();
      this.isLoading = false;

      if (selectedCourseId) {
        const reselectedCourse = this.productos.find(p => p.id === selectedCourseId);
        if (reselectedCourse) {
          this.selectedCourse = reselectedCourse;
          this.inscripcionesDelProducto = reselectedCourse.inscripciones;
        } else {
          this.unselectCourse();
        }
      }

      this.cdr.markForCheck();
    });
  }

  loadCertificados() {
    this.certificadoSvc.getAll().subscribe({
      next: (certificadosData: Certificado[]) => {
        this.certificados = certificadosData.map(cert => ({
          ...cert,
          con_competencias: cert.con_competencias === true
        }));
        
        if (this.selectedCourse) {
          this.productoSvc.getById(this.selectedCourse.id).subscribe((courseDetails: ProductoEducativoWithDetails) => {
            this.inscripcionesDelProducto = courseDetails.inscripciones;
            this.cdr.markForCheck();
          });
        }
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.notificationSvc.showError('Error al recargar la lista de certificados.');
        console.error("❌ Error cargando certificados:", err);
      }
    });
  }
  
  private handleError(error: any, context: string = 'Error'): void {
    const errorMsg = (error instanceof HttpErrorResponse) ? (error.error?.detail || error.message) : (error.message || String(error));
    this.notificationSvc.showError(`${context}: ${errorMsg || 'Ocurrió un error'}`);
    console.error(context, error);
  }

  // --- GETTERS ---
  get availableParticipants(): Participante[] {
    if (!this.selectedCourse) return [];
    const enrolledIds = new Set(this.inscripcionesDelProducto.map(i => i.participante.id));
    return this.participantes.filter(p => !enrolledIds.has(p.id));
  }

  get courseParticipants(): Participante[] {
    return this.inscripcionesDelProducto.map(inscripcion => inscripcion.participante);
  }

  get areAllCompetencyRecipientsSelected(): boolean {
    const participantIds = this.courseParticipants.map(p => p.id);
    return participantIds.length > 0 && participantIds.every(id => this.competencyRecipients.has(id));
  }

  get areAllDocenteRecipientsSelected(): boolean {
    if (!this.selectedCourse || !this.selectedCourse.docentes) return false;
    const docenteIds = this.selectedCourse.docentes.map(d => d.id);
    return docenteIds.length > 0 && docenteIds.every(id => this.selectedDocenteIds.has(id));
  }

  isDocenteSelected(docenteId: number): boolean {
    if (!this.courseForm) { 
      return false; 
    }
    const formArray = this.courseForm.get('docentes_ids') as FormArray;
    if (!formArray) { 
      return false; 
    }
    return formArray.value.includes(docenteId);
  }

  // ✅ MÉTODOS DE PAGINACIÓN
  private updatePaginatedArrays(): void {
    this.cursosPaginados = this.cursos.slice(
      this.cursosPage * this.ITEMS_PER_PAGE,
      (this.cursosPage + 1) * this.ITEMS_PER_PAGE
    );
        
    this.pildorasPaginadas = this.pildoras.slice(
      this.pildorasPage * this.ITEMS_PER_PAGE,
      (this.pildorasPage + 1) * this.ITEMS_PER_PAGE
    );
        
    this.inyeccionesPaginadas = this.inyecciones.slice(
      this.inyeccionesPage * this.ITEMS_PER_PAGE,
      (this.inyeccionesPage + 1) * this.ITEMS_PER_PAGE
    );
  }
    
  nextPageCursos(): void {
    if ((this.cursosPage + 1) * this.ITEMS_PER_PAGE < this.cursos.length) {
      this.cursosPage++;
      this.updatePaginatedArrays();
    }
  }
    
  prevPageCursos(): void {
    if (this.cursosPage > 0) {
      this.cursosPage--;
      this.updatePaginatedArrays();
    }
  }
    
  nextPagePildoras(): void {
    if ((this.pildorasPage + 1) * this.ITEMS_PER_PAGE < this.pildoras.length) {
      this.pildorasPage++;
      this.updatePaginatedArrays();
    }
  }
    
  prevPagePildoras(): void {
    if (this.pildorasPage > 0) {
      this.pildorasPage--;
      this.updatePaginatedArrays();
    }
  }
    
  nextPageInyecciones(): void {
    if ((this.inyeccionesPage + 1) * this.ITEMS_PER_PAGE < this.inyecciones.length) {
      this.inyeccionesPage++;
      this.updatePaginatedArrays();
    }
  }
    
  prevPageInyecciones(): void {
    if (this.inyeccionesPage > 0) {
      this.inyeccionesPage--;
      this.updatePaginatedArrays();
    }
  }
    
  get hasMoreCursos(): boolean {
    return (this.cursosPage + 1) * this.ITEMS_PER_PAGE < this.cursos.length;
  }
    
  get hasMorePildoras(): boolean {
    return (this.pildorasPage + 1) * this.ITEMS_PER_PAGE < this.pildoras.length;
  }
    
  get hasMoreInyecciones(): boolean {
    return (this.inyeccionesPage + 1) * this.ITEMS_PER_PAGE < this.inyecciones.length;
  }

  // --- GESTIÓN DE PRODUCTOS (CRUD) ---
  onSubmitCourse() {
    if (this.courseForm.invalid) {
      this.courseForm.markAllAsTouched(); 
      this.notificationSvc.showError("Por favor, complete todos los campos requeridos y corrija los errores.");
      return;
    }
    const formValue = this.courseForm.getRawValue();
    let competenciasPayload: string | null = null;
    if (formValue.tipo_producto === 'CURSO_EDUCATIVO' && formValue.competencias) {
      try {
        const parsed = JSON.parse(formValue.competencias);
        if (Array.isArray(parsed)) {
          competenciasPayload = formValue.competencias;
        } else {
          throw new Error("Competencias no son un array JSON");
        }
      } catch (e) {
        console.error("Error procesando competencias JSON", e);
        this.notificationSvc.showError("Error al guardar las competencias. Asegúrese de que el formato sea correcto.");
        return;
      }
    }

    const payload = {
      ...formValue,
      competencias: competenciasPayload
    };

    if (this.editingCourse) {
      this.updateCourse(payload as ProductoEducativoUpdate);
    } else {
      this.createCourse(payload as ProductoEducativoCreate);
    }
  }

  private createCourse(payload: ProductoEducativoCreate) {
    this.productoSvc.create(payload).subscribe({
      next: (newProduct) => {
        this.notificationSvc.showSuccess('Producto educativo creado.');
        this.loadInitialData();
        this.cancelCourseForm();
      },
      error: (err: HttpErrorResponse) => this.handleError(err, 'Error al crear producto')
    });
  }

  private updateCourse(payload: ProductoEducativoUpdate) {
    if (!this.editingCourse) return;
    this.productoSvc.update(this.editingCourse.id, payload).subscribe({
      next: (updatedProduct) => {
        this.notificationSvc.showSuccess('Producto educativo actualizado.');
        this.loadInitialData();
        this.cancelCourseForm();
      },
      error: (err: HttpErrorResponse) => this.handleError(err, 'Error al actualizar producto')
    });
  }

  deleteCourse(courseId: number) {
    const producto = this.productos.find(p => p.id === courseId);
    const nombreProducto = producto ? `"${producto.nombre}"` : "este producto educativo";

    const confirmacion = confirm(
      `¿Estás seguro de eliminar ${nombreProducto}?\n\nEl producto "desaparecerá" de las listas, pero las constancias y certificados asociados seguirán siendo válidos.`
    );

    if (confirmacion) {
      this.productoSvc.delete(courseId).subscribe({
        next: () => {
          this.notificationSvc.showSuccess('Producto educativo eliminado.');
          this.loadInitialData(); 
        },
        error: (err: HttpErrorResponse) => {
          this.handleError(err, 'Error al eliminar producto');
        }
      });
    }
  }

  // --- GESTIÓN DEL FORMULARIO ---
  editCourse(producto: ProductoEducativoWithDetails) {
    this.resetCourseForm(); 
    this.editingCourse = producto; 
    
    const competenciasValueForForm = producto.competencias || '';
    
    this.courseForm.patchValue({
      nombre: producto.nombre,
      horas: producto.horas,
      fecha_inicio: this.formatDateForInput(producto.fecha_inicio),
      fecha_fin: this.formatDateForInput(producto.fecha_fin),
      tipo_producto: producto.tipo_producto,
      modalidad: producto.modalidad,
      competencias: competenciasValueForForm
    });

    const formArray = this.courseForm.get('docentes_ids') as FormArray;
    
    (producto.docentes || []).forEach(docente => {
      formArray.push(this.fb.control(docente.id));
    });
    
    this.showCourseForm = true;
  }

  private formatDateForInput(date: string | Date | undefined): string {
    if (!date) return '';
    try {
      const d = new Date(date); 
      const dUtc = new Date(d.getTime() + d.getTimezoneOffset() * 60000); 
      return dUtc.toISOString().split('T')[0];
    } catch (e) {
      console.error("Error formateando fecha:", date, e);
      return '';
    }
  }

  cancelCourseForm() {
    this.showCourseForm = false;
    this.resetCourseForm();
  }

  resetCourseForm() {
    this.editingCourse = null;
    this.courseForm.reset({
      nombre: '', 
      horas: 8, 
      fecha_inicio: '', 
      fecha_fin: '',
      tipo_producto: 'CURSO_EDUCATIVO', 
      modalidad: 'PRESENCIAL', 
      competencias: ''
    });
    const formArray = this.courseForm.get('docentes_ids') as FormArray;
    if (formArray) {
      formArray.clear(); 
    }
    this.courseForm.markAsPristine();
    this.courseForm.markAsUntouched();
  }

  toggleDocenteSelection(docenteId: number, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    const formArray = this.courseForm.get('docentes_ids') as FormArray;

    if (isChecked) {
      if (!formArray.controls.some(control => control.value === docenteId)) {
        formArray.push(this.fb.control(docenteId));
      }
    } else {
      const index = formArray.controls.findIndex(x => x.value === docenteId);
      if (index > -1) {
        formArray.removeAt(index);
      }
    }
    
    formArray.markAsTouched();
    formArray.markAsDirty();
  }

  // GESTIÓN DE PARTICIPANTES E INSCRIPCIONES
  enrollParticipant() {
    if (!this.participantToAdd || !this.selectedCourse) return;
    const payload: InscripcionCreate = {
      participante_id: this.participantToAdd,
      producto_educativo_id: this.selectedCourse.id
    };
    this.inscripcionSvc.create(payload).subscribe({
      next: () => {
        this.notificationSvc.showSuccess('Participante inscrito.');
        this.loadInitialData();
        this.showAddParticipantForm = false;
        this.participantToAdd = null;
      },
      error: (err: HttpErrorResponse) => this.handleError(err, 'Error al inscribir')
    });
  }

  removeParticipantFromCourse(inscripcionId: number) {
    const inscripcion = this.inscripcionesDelProducto.find(i => i.id === inscripcionId);
    const nombreParticipante = inscripcion?.participante?.nombre_completo || 'el participante';

    if (!confirm(`¿Está seguro de eliminar la inscripción de ${nombreParticipante}? Esto eliminará el registro de su participación en este producto, así como sus certificados asociados. Esta acción no se puede deshacer.`)) return;

    this.inscripcionSvc.delete(inscripcionId).subscribe({
      next: () => {
        this.notificationSvc.showSuccess('Inscripción eliminada.');
        this.certificados = this.certificados.filter(c =>
          c.inscripcion_id !== inscripcionId &&
          !(c.inscripcion && c.inscripcion.id === inscripcionId)
        );
        this.loadInitialData();
      },
      error: (err: HttpErrorResponse) => this.handleError(err, 'Error al eliminar inscripción')
    });
  }

  downloadTemplate(): void {
  const url = `${environment.apiUrl}/public/plantilla-participantes`;
  window.open(url, '_blank');

  this.notificationSvc.showInfo('Descarga iniciada...');
}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = (input.files && input.files.length > 0) ? input.files[0] : null;
  }

  uploadParticipants(): void {
    if (!this.selectedFile || !this.selectedCourse) {
      this.notificationSvc.showError('Por favor, seleccione un curso y un archivo.');
      return;
    }
    this.productoSvc.uploadParticipants(this.selectedCourse.id, this.selectedFile).subscribe({
      next: (response) => {
        const { nuevas_inscripciones_realizadas = 0, nuevos_participantes_creados = 0 } = response;
        this.notificationSvc.showSuccess(
          `Carga completada: ${nuevas_inscripciones_realizadas} inscripciones y ${nuevos_participantes_creados} nuevos participantes.`
        );
        this.loadInitialData();
        
        this.selectedFile = null;
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      },
      error: (err: HttpErrorResponse) => this.handleError(err, 'Error al subir el archivo')
    });
  }

  // MÉTODOS AUXILIARES DE TABLAS Y BOTONES
  getCertificadoForInscripcion(inscripcionId: number): Certificado | undefined {
    return this.certificados.find(c =>
      (c.inscripcion_id === inscripcionId || (c.inscripcion && c.inscripcion.id === inscripcionId)) &&
      c.con_competencias !== true
    );
  }

  getCertificadoCompetenciasForInscripcion(inscripcionId: number): Certificado | undefined {
    return this.certificados.find(c =>
      (c.inscripcion_id === inscripcionId || (c.inscripcion && c.inscripcion.id === inscripcionId)) &&
      c.con_competencias === true
    );
  }

  getCertificadoForDocente(docenteId: number): Certificado | undefined {
    return this.certificados.find(c =>
      (c.docente?.id === docenteId || c.docente_id === docenteId) &&
      c.producto_educativo_id === this.selectedCourse?.id
    );
  }

  issueCertificate(inscripcionId: number, con_competencias: boolean = false) {
    if (!this.selectedCourse) {
      this.notificationSvc.showError("Error: No se ha seleccionado un producto educativo.");
      return;
    }
    const tipo = con_competencias ? 'con competencias' : 'normal';
    this.notificationSvc.showInfo(`Emitiendo constancia ${tipo}...`);
    const payload: CertificadoCreate = {
      inscripcion_id: inscripcionId,
      producto_educativo_id: this.selectedCourse.id,
      con_competencias: con_competencias
    };
    this.certificadoSvc.createForParticipant(payload).subscribe({
      next: (newCert: Certificado) => {
        this.notificationSvc.showSuccess(`Constancia ${tipo} emitida: ${newCert.folio}`);

        const index = this.certificados.findIndex(c =>
          (c.inscripcion_id === inscripcionId || (c.inscripcion && c.inscripcion.id === inscripcionId)) &&
          c.con_competencias === con_competencias
        );
        if (index > -1) {
          this.certificados.splice(index, 1);
        }

        newCert.con_competencias = con_competencias;
        this.certificados.push(newCert);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.handleError(err, `Error al emitir constancia ${tipo}`)
    });
  }

  issueDocenteCertificate(docenteId: number) {
    if (!this.selectedCourse) return;
    this.notificationSvc.showInfo(`Emitiendo constancia para docente...`);
    const payload: CertificadoCreate = {
      docente_id: docenteId,
      producto_educativo_id: this.selectedCourse.id,
    };
    this.certificadoSvc.createForDocente(payload).subscribe({
      next: (newCert: Certificado) => {
        this.notificationSvc.showSuccess(`Constancia de ponente emitida: ${newCert.folio}`);

        const index = this.certificados.findIndex(c =>
          (c.docente?.id === docenteId || c.docente_id === docenteId) &&
          c.producto_educativo_id === this.selectedCourse?.id
        );
        if (index > -1) {
          this.certificados.splice(index, 1);
        }
        this.certificados.push(newCert);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.handleError(err, 'Error al emitir constancia de ponente')
    });
  }

  sendCertificate(certificadoId: number) {
    this.notificationSvc.showInfo('Enviando correo...');
    this.certificadoSvc.sendEmail(certificadoId, 'personal').subscribe({
      next: (res) => this.notificationSvc.showSuccess(res?.message || 'Constancia enviada por correo.'),
      error: (err: HttpErrorResponse) => this.handleError(err, 'Error al enviar correo')
    });
  }

  enviarConstanciaDocente(certificadoId: number, docenteId: number) {
    const docente = this.docentes.find(d => d.id === docenteId);
    if (!docente) {
      this.notificationSvc.showError("No se encontró al docente.");
      return;
    }
    const emailType: 'institucional' | 'personal' = 'institucional';
    const targetEmail = docente.email_institucional;
    if (!targetEmail) { 
      this.notificationSvc.showError(`El docente no tiene un email institucional registrado.`); 
      return; 
    }
    this.notificationSvc.showInfo(`Enviando constancia al email institucional (${targetEmail})...`);
    this.certificadoSvc.sendEmail(certificadoId, emailType).subscribe({
      next: (res) => this.notificationSvc.showSuccess(res?.message || 'Constancia enviada correctamente.'),
      error: (err: HttpErrorResponse) => this.handleError(err, 'Error al enviar la constancia')
    });
  }

  eliminarCertificado(certificadoId: number) {
    const certificado = this.certificados.find(c => c.id === certificadoId);
    
    let nombre = 'el destinatario';
    let tipoRol = 'destinatario';
    let tipoCertificado = 'constancia/reconocimiento';

    if (certificado) {
        if (certificado.docente) {
            nombre = certificado.docente.nombre_completo || nombre;
            tipoRol = 'ponente/docente';
        } else if (certificado.inscripcion) {
            nombre = certificado.inscripcion.participante?.nombre_completo || nombre;
            tipoRol = 'participante';
        }
        
        const tipoCert = certificado.con_competencias ? 'reconocimiento de competencias' : 'constancia normal';
        tipoCertificado = `${tipoCert} del ${tipoRol} ${nombre}`;
    }
    
    const mensaje = `¿Está seguro de eliminar ${tipoCertificado} con folio ${certificado?.folio || 'desconocido'}? Esta acción no se puede deshacer.`;

    if (confirm(mensaje)) {
      this.certificadoSvc.delete(certificadoId).subscribe({
        next: () => {
          this.notificationSvc.showSuccess('Certificado eliminado.');
          const index = this.certificados.findIndex(c => c.id === certificadoId);
          if (index > -1) {
            this.certificados.splice(index, 1);
          }
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => this.handleError(err, 'Error al eliminar el certificado')
      });
    }
  }

  emitAndSendCertificates() {
  if (!this.selectedCourse) { 
    this.notificationSvc.showError('No se ha seleccionado un producto.'); 
    return; 
  }

  if (confirm(`Se intentarán emitir (si faltan) y enviar todas las constancias (NORMALES) para participantes y docentes de "${this.selectedCourse.nombre}". ¿Continuar?`)) {
    
    this.notificationSvc.showInfo('Iniciando proceso masivo (Normal)...');

    this.certificadoSvc.emitirYEnviarMasivamente(this.selectedCourse.id).subscribe({
      next: (response: EmisionMasivaResponse | any) => {

        this.notificationSvc.showSuccess(response.message || 'Proceso masivo completado.');

        // 🔥 AQUÍ SE APLICA LA SOLUCIÓN
        setTimeout(() => {
          this.loadCertificados();
        }, 3000);

        if (response.errors && response.errors.length > 0) { 
          console.error('Errores en emisión masiva normal:', response.errors); 
          this.notificationSvc.showInfo(`Se encontraron ${response.errors.length} errores. Revise la consola.`); 
        }
      },

      error: (err: HttpErrorResponse) => {
        this.handleError(err, 'Error inesperado durante el proceso masivo (Normal)');

        // También aplicamos el delay en caso de error
        setTimeout(() => {
          this.loadCertificados();
        }, 3000);
      }
    });
  }
}


  emitAndSendCompetenciesSelected() {
    if (!this.selectedCourse) { 
      this.notificationSvc.showError('No se ha seleccionado un producto.'); 
      return; 
    }
    if (this.selectedCourse.tipo_producto !== 'CURSO_EDUCATIVO') { 
      this.notificationSvc.showError('La emisión de competencias solo aplica a Cursos Educativos.'); 
      return; 
    }
    const selectedParticipantIds = Array.from(this.competencyRecipients);
    if (selectedParticipantIds.length === 0) { 
      this.notificationSvc.showError('No hay participantes seleccionados para emitir competencias.'); 
      return; 
    }
    const inscripcionesAProcesar = this.inscripcionesDelProducto.filter(inscripcion => 
      selectedParticipantIds.includes(inscripcion.participante.id)
    );
    if (!confirm(`Se emitirán y/o enviarán Reconocimientos CON COMPETENCIAS para los ${inscripcionesAProcesar.length} participantes seleccionados de "${this.selectedCourse.nombre}". ¿Continuar?`)) { 
      return; 
    }
    this.notificationSvc.showInfo(`Iniciando proceso para ${inscripcionesAProcesar.length} reconocimientos de competencias...`);

    const observables: Observable<any>[] = inscripcionesAProcesar.map(inscripcion => {
      const existingCert = this.getCertificadoCompetenciasForInscripcion(inscripcion.id);
      if (existingCert) {
        console.log(`Reenviando cert ${existingCert.id} para insc ${inscripcion.id}`);
        return this.certificadoSvc.sendEmail(existingCert.id, 'personal').pipe(
          catchError(err => { 
            console.error(`Error reenviando a ${inscripcion.participante.nombre_completo}:`, err); 
            this.handleError(err, `Error reenviando a ${inscripcion.participante.nombre_completo}`); 
            return of({ error: true, inscripcionId: inscripcion.id }); 
          })
        );
      } else {
        console.log(`Creando cert comp para insc ${inscripcion.id}`);
        const payload: CertificadoCreate = { 
          inscripcion_id: inscripcion.id, 
          producto_educativo_id: this.selectedCourse!.id, 
          con_competencias: true 
        };
        return this.certificadoSvc.createForParticipant(payload).pipe(
          switchMap((newCert: Certificado) => {
            console.log(`Cert ${newCert.id} creado, enviando...`);
            const index = this.certificados.findIndex(c => 
              c.inscripcion_id === inscripcion.id && c.con_competencias
            );
            if (index > -1) this.certificados.splice(index, 1);
            newCert.con_competencias = true; 
            this.certificados.push(newCert);
            return this.certificadoSvc.sendEmail(newCert.id, 'personal');
          }),
          catchError(err => { 
            console.error(`Error procesando a ${inscripcion.participante.nombre_completo}:`, err); 
            this.handleError(err, `Error procesando a ${inscripcion.participante.nombre_completo}`); 
            return of({ error: true, inscripcionId: inscripcion.id }); 
          })
        );
      }
    });

    forkJoin(observables).subscribe({
      next: (results) => {
        const successes = results.filter(r => r && !r.error).length;
        const failures = results.length - successes;
        this.notificationSvc.showSuccess(`Proceso de competencias completado: ${successes} procesados exitosamente. ${failures > 0 ? failures + ' errores.' : ''}`);
        this.cdr.markForCheck(); 
        this.competencyRecipients.clear();
      },
      error: (err) => {
        this.handleError(err, 'Ocurrió un error general durante el proceso de competencias'); 
        this.loadCertificados();
      }
    });
  }
    
  generateIndividualWhatsappLink(whatsappNumber: string | null | undefined, productName: string | null): void {
    if (!whatsappNumber || whatsappNumber.trim() === '') {
        this.notificationSvc.showInfo('El participante o docente no tiene un número de WhatsApp registrado.');
        return;
    }
    if (!productName) {
        this.notificationSvc.showError('No se pudo obtener el nombre del producto educativo.');
        return;
    }

    const defaultMessage = `¡Hola de parte de LANIA! 👋 Solo un recordatorio sobre el curso *${productName}*. Por favor, revisa tu correo para detalles importantes.`;
    const encodedMessage = encodeURIComponent(defaultMessage);
    
    const cleanedNumber = whatsappNumber.replace(/[^0-9]/g, '');
    const whatsappLink = `https://wa.me/${cleanedNumber}?text=${encodedMessage}`;

    window.open(whatsappLink, '_blank');
  }

  // --- MÉTODOS DE LA UI ---

  selectCourse(course: ProductoEducativoWithDetails) {
    this.selectedCourse = course; 
    this.competencyRecipients.clear(); 
    this.selectedDocenteIds.clear();
    this.docenteEmailSelection = {};

    this.notificationSvc.showInfo('Recargando todos los datos para asegurar consistencia...');
    this.loadInitialData();
  }

  unselectCourse() {
    this.selectedCourse = null; 
    this.inscripcionesDelProducto = []; 
    this.showAddParticipantForm = false; 
    this.participantToAdd = null;
  }

  groupAndFilterProducts() {
    const term = this.searchTerm.toLowerCase();
    const filtered = this.searchTerm ? this.productos.filter(p => p.nombre.toLowerCase().includes(term)) : [...this.productos];
    
    this.cursos = filtered.filter(p => p.tipo_producto === 'CURSO_EDUCATIVO'); 
    this.pildoras = filtered.filter(p => p.tipo_producto === 'PILDORA_EDUCATIVA'); 
    this.inyecciones = filtered.filter(p => p.tipo_producto === 'INYECCION_EDUCATIVA');
    
    this.cursosPage = 0;
    this.pildorasPage = 0;
    this.inyeccionesPage = 0;
    
    this.updatePaginatedArrays();
  }

  getCourseColor(id: number): string {
    const colors = ['#4A90E2', '#50E3C2', '#F5A623', '#7ED321', '#BD10E0', '#9013FE', '#F8E71C', '#FF6666', '#66CCCC', '#FF99CC'];
    return colors[id % colors.length];
  }

  toggleCompetencyRecipient(participantId: number, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked; 
    if (isChecked) { 
      this.competencyRecipients.add(participantId); 
    } else { 
      this.competencyRecipients.delete(participantId); 
    }
  }

  toggleAllCompetencyRecipients(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked; 
    const participantIds = this.courseParticipants.map(p => p.id);
    if (isChecked) { 
      participantIds.forEach(id => this.competencyRecipients.add(id)); 
    } else { 
      this.competencyRecipients.clear(); 
    }
  }

  isRecipientSelected = (id: number): boolean => this.competencyRecipients.has(id);

  toggleDocenteCompetencyRecipient(docenteId: number, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked; 
    if (isChecked) { 
      this.selectedDocenteIds.add(docenteId); 
    } else { 
      this.selectedDocenteIds.delete(docenteId); 
    }
  }

  toggleAllDocenteRecipients(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked; 
    if (!this.selectedCourse || !this.selectedCourse.docentes) return; 
    const docenteIds = this.selectedCourse.docentes.map(d => d.id);
    if (isChecked) { 
      docenteIds.forEach(id => this.selectedDocenteIds.add(id)); 
    } else { 
      this.selectedDocenteIds.clear(); 
    }
  }

  isDocenteRecipientSelected = (id: number): boolean => this.selectedDocenteIds.has(id);

  trackByDocenteId(index: number, docente: DocenteDTO): number { 
    return docente.id; 
  }
  
  trackByInscripcionId(index: number, inscripcion: Inscripcion): number { 
    return inscripcion.id; 
  }

  // --- GESTIÓN DE MODAL DE COMPETENCIAS ---
  openCompetenciesModal() {
    let competenciasJsonString = this.courseForm.value.competencias || '';
    try {
      const parsed = JSON.parse(competenciasJsonString);
      if (Array.isArray(parsed)) { 
        this.competenciesList = parsed.map(String); 
      } else { 
        this.competenciesList = []; 
      }
    } catch(e) { 
      this.competenciesList = []; 
    }
    if (this.competenciesList.length === 0) { 
      this.competenciesList.push(''); 
    }
    this.showCompetenciesModal = true;
  }

  saveCompetencies() {
    const cleanList = this.competenciesList.map((c: string) => c.trim()).filter((c: string) => c);
    try {
      this.courseForm.patchValue({ competencias: JSON.stringify(cleanList) });
      this.showCompetenciesModal = false;
    } catch (e) { 
      this.notificationSvc.showError("Error al guardar competencias como JSON."); 
    }
  }

  addCompetency = () => this.competenciesList.push('');
  
  removeCompetency = (index: number) => { 
    if (this.competenciesList.length > 1) { 
      this.competenciesList.splice(index, 1); 
    } else { 
      this.competenciesList[0] = ''; 
    } 
  }
  
  trackByIndex = (index: number) => index;
}
