// Ruta: frontend/lania-ui/src/app/features/dashboard/productos-educativos/admin-productos-educativos.component.ts
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core'; // 👈 Importa ChangeDetectorRef
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
import { forkJoin } from 'rxjs';
import { environment } from '@environments/environment';
import { HttpErrorResponse } from '@angular/common/http';

// Interfaces
import { ProductoEducativo, ProductoEducativoCreate, ProductoEducativoUpdate } from '@shared/interfaces/producto-educativo.interface';
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


/**
 * Validador personalizado para un FormGroup que comprueba si la fecha de fin
 * es anterior a la fecha de inicio.
 */
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
  private cdr = inject(ChangeDetectorRef); // 👈 Inyecta ChangeDetectorRef

  private productos: ProductoEducativo[] = [];
  docentes: DocenteDTO[] = [];
  participantes: Participante[] = [];
  certificados: Certificado[] = [];
  cursos: ProductoEducativo[] = [];
  pildoras: ProductoEducativo[] = [];
  inyecciones: ProductoEducativo[] = [];
  inscripcionesDelProducto: Inscripcion[] = [];

  showCourseForm = false;
  editingCourse: ProductoEducativo | null = null;
  selectedCourse: ProductoEducativo | null = null;
  showAddParticipantForm = false;
  showCompetenciesModal = false;
  searchTerm: string = '';
  selectedFile: File | null = null;

  selectedParticipantIds = new Set<number>();
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
      docente_ids: this.fb.array([]),
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
    return participantIds.length > 0 && participantIds.every(id => this.selectedParticipantIds.has(id));
  }

  get areAllDocenteRecipientsSelected(): boolean {
    if (!this.selectedCourse || !this.selectedCourse.docentes) return false;
    const docenteIds = this.selectedCourse.docentes.map(d => d.id);
    return docenteIds.length > 0 && docenteIds.every(id => this.selectedDocenteIds.has(id));
  }

  // --- CARGA DE DATOS ---
  loadInitialData() {
    forkJoin({
      productos: this.productoSvc.getAll(),
      docentes: this.docenteSvc.getAll(),
      participantes: this.participanteSvc.getAll(),
      certificados: this.certificadoSvc.getAll()
    }).subscribe(({ productos, docentes, participantes, certificados }) => {
      this.productos = productos.sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime());
      this.docentes = docentes;
      this.participantes = participantes;
      this.certificados = certificados;
      this.groupAndFilterProducts();

      if (this.selectedCourse) {
        this.loadParticipantsForCourse(this.selectedCourse.id);
      }
      this.cdr.markForCheck(); // 👈 Marca para revisión después de cargar datos iniciales
    });
  }


  loadParticipantsForCourse(courseId: number) {
    this.inscripcionSvc.getByProductoId(courseId).subscribe(inscripciones => {
      this.inscripcionesDelProducto = inscripciones;
      this.cdr.markForCheck(); // 👈 Marca para revisión después de cargar participantes
    });
  }

  // --- GESTIÓN DE PRODUCTOS (CRUD) ---
  onSubmitCourse() {
    if (this.courseForm.invalid) {
      this.notificationSvc.showError("Por favor, complete todos los campos requeridos y corrija los errores.");
      return;
    }
    const formValue = this.courseForm.getRawValue();
    const payload = { ...formValue };

    if (this.editingCourse) {
      this.updateCourse(payload);
    } else {
      this.createCourse(payload);
    }
  }

  private createCourse(payload: ProductoEducativoCreate) {
    this.productoSvc.create(payload).subscribe({
      next: (newProduct) => {
        this.notificationSvc.showSuccess('Producto educativo creado.');
        this.productos = [newProduct, ...this.productos].sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime()); // Crear nuevo array
        this.groupAndFilterProducts();
        this.cancelCourseForm();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error.detail || 'Error al crear.')
    });
  }

  private updateCourse(payload: ProductoEducativoUpdate) {
    if (!this.editingCourse) return;
    this.productoSvc.update(this.editingCourse.id, payload).subscribe({
      next: (updatedProduct) => {
        this.notificationSvc.showSuccess('Producto educativo actualizado.');
        const index = this.productos.findIndex(p => p.id === updatedProduct.id);
        // Crear nuevo array al actualizar
        this.productos = this.productos.map((p, i) => i === index ? updatedProduct : p);
        this.groupAndFilterProducts();
        this.cancelCourseForm();
        if (this.selectedCourse && this.selectedCourse.id === updatedProduct.id) {
          this.selectedCourse = updatedProduct;
        }
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error.detail || 'Error al actualizar.')
    });
  }

  deleteCourse(courseId: number) {
    if (confirm('¿Está seguro de eliminar este producto educativo?')) {
      this.productoSvc.delete(courseId).subscribe({
        next: () => {
          this.notificationSvc.showSuccess('Producto educativo eliminado.');
          this.productos = this.productos.filter(p => p.id !== courseId); // filter crea nuevo array
          this.groupAndFilterProducts();
          if (this.selectedCourse?.id === courseId) this.unselectCourse();
          this.cdr.markForCheck();
        },
        error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error.detail || 'Error al eliminar.')
      });
    }
  }

  // --- GESTIÓN DEL FORMULARIO ---
  editCourse(producto: ProductoEducativo) {
    this.editingCourse = producto;
    this.courseForm.patchValue({
      nombre: producto.nombre,
      horas: producto.horas,
      fecha_inicio: producto.fecha_inicio,
      fecha_fin: producto.fecha_fin,
      tipo_producto: producto.tipo_producto,
      modalidad: producto.modalidad,
      competencias: producto.competencias
    });
    const formArray = this.courseForm.get('docente_ids') as FormArray;
    formArray.clear();
    producto.docentes.forEach(docente => formArray.push(this.fb.control(docente.id)));
    this.showCourseForm = true;
  }

  cancelCourseForm() {
    this.showCourseForm = false;
    this.resetCourseForm();
  }

  resetCourseForm() {
    this.courseForm.reset({
      nombre: '', horas: 8, fecha_inicio: '', fecha_fin: '',
      tipo_producto: 'CURSO_EDUCATIVO', modalidad: 'PRESENCIAL', competencias: ''
    });
    (this.courseForm.get('docente_ids') as FormArray).clear();
    this.editingCourse = null;
  }

  toggleDocenteSelection(docenteId: number, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    const formArray = this.courseForm.get('docente_ids') as FormArray;
    if (isChecked) {
      formArray.push(this.fb.control(docenteId));
    } else {
      const index = formArray.controls.findIndex(x => x.value === docenteId);
      if (index > -1) formArray.removeAt(index);
    }
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
        this.inscripcionesDelProducto = [...this.inscripcionesDelProducto, newInscripcion]; // Crear nuevo array
        this.showAddParticipantForm = false;
        this.participantToAdd = null;
        this.cdr.markForCheck(); // 👈 Marca para revisión
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'No se pudo inscribir.')
    });
  }

  removeParticipantFromCourse(inscripcionId: number) {
    if (!confirm('¿Seguro que desea eliminar la inscripción?')) return;
    this.inscripcionSvc.delete(inscripcionId).subscribe({
      next: () => {
        this.notificationSvc.showSuccess('Inscripción eliminada.');
        this.inscripcionesDelProducto = this.inscripcionesDelProducto.filter(i => i.id !== inscripcionId); // filter crea nuevo array
        this.cdr.markForCheck(); // 👈 Marca para revisión
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'No se pudo eliminar.')
    });
  }

  // GESTIÓN DE ARCHIVOS
  descargarPlantilla(): void {
    const fileUrl = `${environment.apiUrl}/static/plantilla_participantes.xlsx?v=${new Date().getTime()}`;
    const anchor = document.createElement('a');
    anchor.href = fileUrl;
    anchor.download = 'plantilla_participantes.xlsx';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    this.notificationSvc.showSuccess('Iniciando la descarga de la plantilla...');
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
        const { nuevas_inscripciones_realizadas, nuevos_participantes_creados } = response;
        this.notificationSvc.showSuccess(
          `Carga completada: ${nuevas_inscripciones_realizadas} inscripciones y ${nuevos_participantes_creados} nuevos participantes.`
        );
        this.loadParticipantsForCourse(this.selectedCourse!.id);
        this.participanteSvc.getAll().subscribe(p => {
            this.participantes = p; // Actualiza participantes
            this.cdr.markForCheck(); // 👈 Marca para revisión
        });
        this.selectedFile = null;
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error al subir el archivo.')
    });
  }

  // GESTIÓN DE CERTIFICADOS
  getCertificadoForInscripcion(inscripcionId: number): Certificado | undefined {
    return this.certificados.find(c => c.inscripcion_id === inscripcionId);
  }

  getCertificadoForDocente(docenteId: number): Certificado | undefined {
    return this.certificados.find(c => c.docente_id === docenteId && c.producto_educativo_id === this.selectedCourse?.id);
  }


  issueCertificate(inscripcionId: number, con_competencias: boolean = false) {
    if (!this.selectedCourse) {
        this.notificationSvc.showError("Error: No se ha seleccionado un producto educativo.");
        return;
    }
    const payload: CertificadoCreate = {
      inscripcion_id: inscripcionId,
      producto_educativo_id: this.selectedCourse.id,
      con_competencias: con_competencias
    };
    this.certificadoSvc.createForParticipant(payload).subscribe({
      next: (newCert: Certificado) => {
        this.notificationSvc.showSuccess(`Constancia emitida: ${newCert.folio}`);
        this.certificados = [...this.certificados, newCert]; // Crear nuevo array
        this.cdr.markForCheck(); // 👈 Marca para revisión
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error al emitir constancia.')
    });
  }

  issueDocenteCertificate(docenteId: number, con_competencias: boolean = false) {
    if (!this.selectedCourse) return;
    this.notificationSvc.showInfo(`Emitiendo constancia para docente ${docenteId}...`);
    const payload: CertificadoCreate = {
      docente_id: docenteId,
      producto_educativo_id: this.selectedCourse.id,
      con_competencias // El valor se pasa directamente
    };
    this.certificadoSvc.createForDocente(payload).subscribe({
      next: (newCert: Certificado) => {
        this.notificationSvc.showSuccess(`Constancia de ponente emitida: ${newCert.folio}`);
        this.certificados = [...this.certificados, newCert]; // Crear nuevo array
        this.cdr.markForCheck(); // 👈 Marca para revisión
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error al emitir constancia de ponente.')
    });
  }


  sendCertificate(certificadoId: number) {
    this.certificadoSvc.sendEmail(certificadoId, 'personal').subscribe({
      next: () => this.notificationSvc.showSuccess('Enviando constancia por correo...'),
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error al enviar correo.')
    });
  }

  enviarConstanciaDocente(certificadoId: number, docenteId: number) {
    const docente = this.docentes.find(d => d.id === docenteId);
    if (!docente) {
      this.notificationSvc.showError("No se encontró al docente.");
      return;
    }
    const emailType = this.docenteEmailSelection[docenteId] || 'institucional';
    const targetEmail = emailType === 'personal' ? docente.email_personal : docente.email_institucional;

    if (!targetEmail) {
        this.notificationSvc.showError(`El docente no tiene un email ${emailType} registrado.`);
        return;
    }

    this.notificationSvc.showInfo(`Enviando constancia al email ${emailType} (${targetEmail})...`);

    this.certificadoSvc.sendEmail(certificadoId, emailType).subscribe({
      next: () => this.notificationSvc.showSuccess('Constancia enviada correctamente.'),
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error al enviar la constancia.')
    });
  }

  eliminarCertificado(certificadoId: number) {
    if (confirm('¿Está seguro de que desea eliminar esta constancia?')) {
      this.certificadoSvc.delete(certificadoId).subscribe({
        next: () => {
          this.notificationSvc.showSuccess('Constancia eliminada.');
          this.certificados = this.certificados.filter(c => c.id !== certificadoId); // filter crea nuevo array
          this.cdr.markForCheck(); // 👈 Marca para revisión
        },
        error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error al eliminar la constancia.')
      });
    }
  }

  emitAndSendCertificates() {
    if (!this.selectedCourse) {
      this.notificationSvc.showError('No se ha seleccionado un producto.');
      return;
    }
    const participantsWithoutCert = this.inscripcionesDelProducto.filter(insc =>
        !this.certificados.some(cert => cert.inscripcion_id === insc.id)
    );
    const unissuedCount = participantsWithoutCert.length;

    if (unissuedCount === 0) {
      this.notificationSvc.showInfo('Todas las constancias para los participantes actuales ya fueron emitidas.');
      return;
    }

    if (confirm(`Se intentarán emitir y enviar ${unissuedCount} constancia(s) para los participantes sin constancia en "${this.selectedCourse.nombre}". ¿Continuar?`)) {
      this.notificationSvc.showInfo('Iniciando proceso masivo...');
      this.certificadoSvc.emitirYEnviarMasivamente(this.selectedCourse.id).subscribe({
        next: (response: EmisionMasivaResponse) => {
          this.notificationSvc.showSuccess(`Proceso completado: ${response.success.length} constancias emitidas y enviadas.`);

          if (response.errors.length > 0) {
            console.error('Errores en emisión masiva:', response.errors);
            const errorDetails = response.errors.map((e: { inscripcion_id: number; error: string; }) => {
                return `Inscripción ID ${e.inscripcion_id}: ${e.error}`;
            }).join('; ');
            this.notificationSvc.showError(`${response.errors.length} constancias fallaron. Detalles: ${errorDetails}`);
          }
          // Recargar los certificados para obtener los objetos completos
          this.certificadoSvc.getAll().subscribe(certs => {
              this.certificados = certs;
              this.cdr.markForCheck(); // 👈 Marca para revisión después de recargar
          });
        },
        error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error inesperado durante el proceso masivo.')
      });
    }
  }


  // MÉTODOS DE LA UI
  selectCourse(course: ProductoEducativo) {
    this.selectedCourse = course;
    this.selectedParticipantIds.clear();
    this.selectedDocenteIds.clear();
    this.loadParticipantsForCourse(course.id);
    this.docenteEmailSelection = {};
  }


  unselectCourse() {
    this.selectedCourse = null;
    this.inscripcionesDelProducto = [];
    this.showAddParticipantForm = false;
    this.participantToAdd = null;
  }

  groupAndFilterProducts() {
    const term = this.searchTerm.toLowerCase();
    const filtered = this.searchTerm
      ? this.productos.filter(p => p.nombre.toLowerCase().includes(term))
      : [...this.productos];

    this.cursos = filtered.filter(p => p.tipo_producto === 'CURSO_EDUCATIVO');
    this.pildoras = filtered.filter(p => p.tipo_producto === 'PILDORA_EDUCATIVA');
    this.inyecciones = filtered.filter(p => p.tipo_producto === 'INYECCION_EDUCATIVA');
  }


  getCourseColor(id: number): string {
    const colors = ['#4A90E2', '#50E3C2', '#F5A623', '#7ED321', '#BD10E0', '#9013FE', '#F8E71C'];
    return colors[id % colors.length];
  }

  toggleCompetencyRecipient(participantId: number, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) this.selectedParticipantIds.add(participantId);
    else this.selectedParticipantIds.delete(participantId);
  }

  toggleAllCompetencyRecipients(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    const participantIds = this.courseParticipants.map(p => p.id);
    if (isChecked) {
      participantIds.forEach(id => this.selectedParticipantIds.add(id));
    } else {
      this.selectedParticipantIds.clear();
    }
  }

  isRecipientSelected = (id: number) => this.selectedParticipantIds.has(id);

  toggleDocenteCompetencyRecipient(docenteId: number, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) this.selectedDocenteIds.add(docenteId);
    else this.selectedDocenteIds.delete(docenteId);
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

  isDocenteRecipientSelected = (id: number) => this.selectedDocenteIds.has(id);

  trackByDocenteId(index: number, docente: DocenteDTO): number {
    return docente.id;
  }

  trackByInscripcionId(index: number, inscripcion: Inscripcion): number {
    return inscripcion.id;
  }

  // GESTIÓN DE MODAL DE COMPETENCIAS
  openCompetenciesModal() {
    let competenciasValue = this.courseForm.value.competencias || '';
    this.competenciesList = competenciasValue.split('\n').map((c: string) => c.trim()).filter((c:string) => c);
    if (this.competenciesList.length === 0) {
        this.competenciesList.push('');
    }
    this.showCompetenciesModal = true;
  }

  saveCompetencies() {
    this.courseForm.patchValue({
      competencias: this.competenciesList.map(c => c.trim()).filter(c => c).join('\n')
    });
    this.showCompetenciesModal = false;
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