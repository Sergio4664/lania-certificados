import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators, // Importado para las validaciones
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
export default class AdminProductosEducativosComponent implements OnInit {

  private productoSvc = inject(ProductoEducativoService);
  private docenteSvc = inject(DocenteService);
  private participanteSvc = inject(ParticipanteService);
  private inscripcionSvc = inject(InscripcionService);
  private certificadoSvc = inject(CertificadoService);
  private notificationSvc = inject(NotificationService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  private productos: ProductoEducativoWithDetails[] = [];
  docentes: DocenteDTO[] = [];
  participantes: Participante[] = [];
  certificados: Certificado[] = [];
  cursos: ProductoEducativoWithDetails[] = [];
  pildoras: ProductoEducativoWithDetails[] = [];
  inyecciones: ProductoEducativoWithDetails[] = [];
  inscripcionesDelProducto: Inscripcion[] = [];

  showCourseForm = false;
  editingCourse: ProductoEducativoWithDetails | null = null;
  selectedCourse: ProductoEducativoWithDetails | null = null;
  showAddParticipantForm = false;
  showCompetenciesModal = false;
  searchTerm: string = '';
  selectedFile: File | null = null;

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
        [Validators.required, Validators.minLength(1)] // Se requiere al menos un docente
      ),
      
      competencias: ['']
    }, {
      validators: dateRangeValidator
    });
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

  /**
   * Verifica si un docente está seleccionado en el FormArray 'docentes_ids'.
   * El HTML usará esto para el binding [checked] del formulario.
   */
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

  // --- CARGA DE DATOS ---
  loadInitialData() {
    const selectedCourseId = this.selectedCourse?.id;

    forkJoin({
      productos: this.productoSvc.getAllProductosWithDetails(), // Llama al servicio (con anti-caché)
      docentes: this.docenteSvc.getAll(),
      participantes: this.participanteSvc.getAll(),
      certificados: this.certificadoSvc.getAll() // Carga inicial de certificados (con anti-caché)
    }).subscribe(({ productos, docentes, participantes, certificados }) => {
      this.productos = productos.sort((a, b) =>
        new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime()
      );
      this.docentes = docentes;
      this.participantes = participantes;
      this.certificados = certificados; // Se guarda la lista de certificados aquí
      this.groupAndFilterProducts();

      if (selectedCourseId) {
        const reselectedCourse = this.productos.find(p => p.id === selectedCourseId);
        if (reselectedCourse) {
          this.selectedCourse = reselectedCourse;
          // Usar la lista de inscripciones YA FILTRADA
          this.inscripcionesDelProducto = reselectedCourse.inscripciones;
        } else {
          this.unselectCourse();
        }
      }

      this.cdr.markForCheck();
    });
  }

  loadCertificados() {
    // Este método ahora llama al servicio con anti-caché
    this.certificadoSvc.getAll().subscribe({
      next: (certificadosData: Certificado[]) => {
        this.certificados = certificadosData;
        console.log('Certificados recargados:', this.certificados.length);
        if (this.selectedCourse) {
          // Usar getById para obtener inscripciones filtradas
          this.productoSvc.getById(this.selectedCourse.id).subscribe((courseDetails: ProductoEducativoWithDetails) => {
            this.inscripcionesDelProducto = courseDetails.inscripciones;
            this.cdr.markForCheck();
          });
        }
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.notificationSvc.showError('Error al recargar la lista de certificados.');
        console.error("Error cargando certificados:", err);
      }
    });
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
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error al crear.')
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
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error al actualizar.')
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
          this.notificationSvc.showError(err.error?.detail || 'Error al eliminar el producto.');
        }
      });
    }
  }


  // --- GESTIÓN DEL FORMULARIO ---
  editCourse(producto: ProductoEducativoWithDetails) {
    // 1. Resetear el formulario y el estado de edición anterior (sets this.editingCourse = null)
    this.resetCourseForm(); 
    
    // ✅ CORRECCIÓN CLAVE: 2. Establecer el estado de edición *después* de resetear
    this.editingCourse = producto; 
    
    const competenciasValueForForm = producto.competencias || '';
    
    // 3. Aplicar los valores del producto a editar
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
    (this.courseForm.get('docentes_ids') as FormArray).clear(); 
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
      next: (newInscripcion) => {
        this.notificationSvc.showSuccess('Participante inscrito.');
        // Forzar recarga completa de datos para refrescar la lista de inscripciones filtrada.
        this.loadInitialData();
        this.showAddParticipantForm = false;
        this.participantToAdd = null;
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'No se pudo inscribir.')
    });
  }

  removeParticipantFromCourse(inscripcionId: number) {
    if (!confirm('¿Seguro que desea eliminar la inscripción? Los certificados asociados también se eliminarán.')) return;
    this.inscripcionSvc.delete(inscripcionId).subscribe({
      next: () => {
        this.notificationSvc.showSuccess('Inscripción eliminada.');
        // Refresca la lista de certificados localmente
        this.certificados = this.certificados.filter(c =>
          c.inscripcion_id !== inscripcionId &&
          !(c.inscripcion && c.inscripcion.id === inscripcionId)
        );
        // Forzar recarga completa para reflejar cambios.
        this.loadInitialData();
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'No se pudo eliminar.')
    });
  }

  // GESTIÓN DE ARCHIVOS
  descargarPlantilla(): void {
    const baseUrl = environment.apiUrl.replace('/api/v1', '');
    const fileUrl = `${baseUrl}/static/plantilla_participantes.xlsx?v=${new Date().getTime()}`;
    console.log('Descargando desde:', fileUrl);
    const anchor = document.createElement('a');
    anchor.href = fileUrl;
    anchor.download = 'plantilla_participantes.xlsx';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
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
        // Forzar recarga completa de todos los datos
        this.loadInitialData();
        
        this.selectedFile = null;
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error al subir el archivo.')
    });
  }

  // --- GESTIÓN DE CERTIFICADOS ---
  getCertificadoForInscripcion(inscripcionId: number): Certificado | undefined {
    // Busca en la lista local 'this.certificados'
    return this.certificados.find(c =>
      (c.inscripcion_id === inscripcionId || (c.inscripcion && c.inscripcion.id === inscripcionId)) &&
      !c.con_competencias
    );
  }

  getCertificadoCompetenciasForInscripcion(inscripcionId: number): Certificado | undefined {
    // Busca en la lista local 'this.certificados'
    return this.certificados.find(c =>
      (c.inscripcion_id === inscripcionId || (c.inscripcion && c.inscripcion.id === inscripcionId)) &&
      c.con_competencias
    );
  }

  getCertificadoForDocente(docenteId: number): Certificado | undefined {
    // Busca en la lista local 'this.certificados'
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
        this.certificados.push(newCert); // Añade el nuevo certificado a la lista local
        this.cdr.markForCheck(); // Refresca la vista del modal
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || `Error al emitir constancia ${tipo}.`)
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
        this.certificados.push(newCert); // Añade el nuevo certificado a la lista local
        this.cdr.markForCheck(); // Refresca la vista del modal
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error al emitir constancia de ponente.')
    });
  }

  sendCertificate(certificadoId: number) {
    this.notificationSvc.showInfo('Enviando correo...');
    this.certificadoSvc.sendEmail(certificadoId, 'personal').subscribe({
      next: (res) => this.notificationSvc.showSuccess(res?.message || 'Constancia enviada por correo.'),
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error al enviar correo.')
    });
  }

  enviarConstanciaDocente(certificadoId: number, docenteId: number) {
    const docente = this.docentes.find(d => d.id === docenteId);
    if (!docente) {
      this.notificationSvc.showError("No se encontró al docente.");
      return;
    }
    const emailTypeChoice = prompt("Enviar a email: (institucional / personal)", "institucional")?.toLowerCase();
    const emailType: 'institucional' | 'personal' = (emailTypeChoice === 'personal') ? 'personal' : 'institucional';
    const targetEmail = emailType === 'personal' ? docente.email_personal : docente.email_institucional;
    if (!targetEmail) { 
      this.notificationSvc.showError(`El docente no tiene un email ${emailType} registrado.`); 
      return; 
    }
    this.notificationSvc.showInfo(`Enviando constancia al email ${emailType} (${targetEmail})...`);
    this.certificadoSvc.sendEmail(certificadoId, emailType).subscribe({
      next: (res) => this.notificationSvc.showSuccess(res?.message || 'Constancia enviada correctamente.'),
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error al enviar la constancia.')
    });
  }

  eliminarCertificado(certificadoId: number) {
    if (confirm('¿Está seguro de que desea eliminar esta constancia/reconocimiento? Esta acción no se puede deshacer.')) {
      this.certificadoSvc.delete(certificadoId).subscribe({
        next: () => {
          this.notificationSvc.showSuccess('Certificado eliminado.');
          const index = this.certificados.findIndex(c => c.id === certificadoId);
          if (index > -1) {
            this.certificados.splice(index, 1);
          }
          this.cdr.markForCheck(); // Refresca la vista del modal
        },
        error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error al eliminar el certificado.')
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
          if (response.errors && response.errors.length > 0) { 
            console.error('Errores en emisión masiva normal:', response.errors); 
            this.notificationSvc.showInfo(`Se encontraron ${response.errors.length} errores. Revise la consola.`); 
          }
          this.loadCertificados(); // Recargar certificados para reflejar los nuevos
        },
        error: (err: HttpErrorResponse) => {
          this.notificationSvc.showError(err.error?.detail || 'Error inesperado durante el proceso masivo (Normal).'); 
          this.loadCertificados();
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
            this.notificationSvc.showError(`Error reenviando a ${inscripcion.participante.nombre_completo}`); 
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
            this.certificados.push(newCert); // Añade a la lista local
            return this.certificadoSvc.sendEmail(newCert.id, 'personal');
          }),
          catchError(err => { 
            console.error(`Error procesando a ${inscripcion.participante.nombre_completo}:`, err); 
            this.notificationSvc.showError(`Error procesando a ${inscripcion.participante.nombre_completo}: ${err.error?.detail || 'Error'}`); 
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
        this.notificationSvc.showError('Ocurrió un error general durante el proceso de competencias.'); 
        console.error("Error en el forkJoin de competencias:", err); 
        this.loadCertificados();
      }
    });
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