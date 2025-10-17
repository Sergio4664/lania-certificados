import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule, FormArray } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { environment } from '@environments/environment';
import { HttpErrorResponse } from '@angular/common/http';

// Interfaces
import { ProductoEducativo, ProductoEducativoCreate, ProductoEducativoUpdate } from '@shared/interfaces/producto-educativo.interface';
import { DocenteDTO } from '@shared/interfaces/docente.interfaces';
import { Participante } from '@shared/interfaces/participante.interface';
import { Inscripcion, InscripcionCreate } from '@shared/interfaces/inscripcion.interface';
import { Certificado } from '@shared/interfaces/certificado.interface';

// Servicios
import { ProductoEducativoService } from '@shared/services/producto-educativo.service';
import { DocenteService } from '@shared/services/docente.service';
import { NotificationService } from '@shared/services/notification.service';
import { InscripcionService } from '@shared/services/inscripcion.service';
import { CertificadoService } from '@shared/services/certificado.service';
import { ParticipanteService } from '@shared/services/participante.service';

@Component({
  selector: 'app-admin-productos-educativos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DatePipe],
  templateUrl: './admin-productos-educativos.component.html',
  styleUrls: ['./admin-productos-educativos.component.css']
})
export default class AdminProductosEducativosComponent implements OnInit {
  // Inyección de servicios
  private productoSvc = inject(ProductoEducativoService);
  private docenteSvc = inject(DocenteService);
  private participanteSvc = inject(ParticipanteService);
  private inscripcionSvc = inject(InscripcionService);
  private certificadoSvc = inject(CertificadoService);
  private notificationSvc = inject(NotificationService);
  private fb = inject(FormBuilder);

  // --- Listas de datos ---
  cursos: ProductoEducativo[] = [];
  pildoras: ProductoEducativo[] = [];
  inyecciones: ProductoEducativo[] = [];
  private productos: ProductoEducativo[] = [];
  docentes: DocenteDTO[] = [];
  participantes: Participante[] = [];
  inscripcionesDelProducto: Inscripcion[] = [];
  certificados: Certificado[] = [];

  // --- Estados de la UI ---
  showCourseForm = false;
  editingCourse: ProductoEducativo | null = null;
  selectedCourse: ProductoEducativo | null = null;
  showAddParticipantForm = false;
  showCompetenciesModal = false;
  searchTerm: string = '';

  // --- Formularios ---
  courseForm: FormGroup;
  competenciesList: string[] = [];
  participantToAdd: number | null = null;
  selectedFile: File | null = null;

  constructor() {
    this.courseForm = this.fb.group({
      nombre: ['', Validators.required],
      horas: [8, [Validators.required, Validators.min(1)]],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      tipo_producto: ['CURSO_EDUCATIVO', Validators.required],
      modalidad: ['PRESENCIAL', Validators.required],
      docente_ids: this.fb.array([]),
      competencias: ['']
    });
  }

  ngOnInit() {
    this.loadInitialData();
  }

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
    });
  }

  groupAndFilterProducts() {
    const term = this.searchTerm.toLowerCase();
    const filtered = this.productos.filter(p => p.nombre.toLowerCase().includes(term));
    this.cursos = filtered.filter(p => p.tipo_producto === 'CURSO_EDUCATIVO');
    this.pildoras = filtered.filter(p => p.tipo_producto === 'PILDORA_EDUCATIVA');
    this.inyecciones = filtered.filter(p => p.tipo_producto === 'INYECCION_EDUCATIVA');
  }

  // --- Métodos de Gestión de Cursos ---
  selectCourse(course: ProductoEducativo) {
    this.selectedCourse = course;
    this.loadParticipantsForCourse(course.id);
  }

  unselectCourse() {
    this.selectedCourse = null;
    this.inscripcionesDelProducto = [];
    this.showAddParticipantForm = false;
    this.participantToAdd = null;
  }

  // --- Lógica de Certificados ---
  getCertificadoForDocente(docente: DocenteDTO): Certificado | undefined {
    if (!this.selectedCourse) return undefined;
    return this.certificados.find(c => c.docente_id === docente.id && c.producto_educativo_id === this.selectedCourse?.id);
  }

  getCertificadoForInscripcion(inscripcionId: number): Certificado | undefined {
    return this.certificados.find(c => c.inscripcion_id === inscripcionId);
  }

  getParticipantInscriptions(): Inscripcion[] {
    return this.inscripcionesDelProducto.filter(i => i.participante);
  }

  emitirConstancia(personaId: number, tipo: 'participante' | 'docente'): void {
    if (!this.selectedCourse) return;
    const serviceCall = tipo === 'participante'
      ? this.certificadoSvc.emitirConstanciaParticipante(personaId, this.selectedCourse.id)
      : this.certificadoSvc.emitirConstanciaDocente(personaId, this.selectedCourse.id);
    
    serviceCall.subscribe({
      next: (newCert) => {
        this.notificationSvc.showSuccess(`Constancia ${newCert.folio} emitida.`);
        this.certificados.push(newCert); // Actualiza la UI al instante
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error al emitir constancia.')
    });
  }

  enviarConstancia(certificadoId: number, tipo: 'participante' | 'docente'): void {
    const serviceCall = tipo === 'participante'
      ? this.certificadoSvc.enviarConstanciaParticipante(certificadoId)
      : this.certificadoSvc.enviarConstanciaDocente(certificadoId);

    serviceCall.subscribe({
      next: () => this.notificationSvc.showSuccess('Constancia enviada por correo.'),
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error al enviar.')
    });
  }

  emitirTodas(tipo: 'participantes' | 'docentes'): void {
    if (!this.selectedCourse) return;
    const serviceCall = tipo === 'participantes'
      ? this.certificadoSvc.emitirConstanciasParticipantes(this.selectedCourse.id)
      : this.certificadoSvc.emitirConstanciasDocentes(this.selectedCourse.id);

    serviceCall.subscribe({
      next: (res: { message: string }) => {
        this.notificationSvc.showSuccess(res.message || `Emisión masiva para ${tipo} completada.`);
        this.loadInitialData(); // Recarga los certificados para actualizar el estado
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error en emisión masiva.')
    });
  }

  enviarTodas(tipo: 'participantes' | 'docentes'): void {
    if (!this.selectedCourse) return;
     const serviceCall = tipo === 'participantes'
      ? this.certificadoSvc.enviarConstanciasParticipantes(this.selectedCourse.id)
      : this.certificadoSvc.enviarConstanciasDocentes(this.selectedCourse.id);

    serviceCall.subscribe({
      next: (res: { message: string }) => this.notificationSvc.showSuccess(res.message || `Envío masivo para ${tipo} completado.`),
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error en envío masivo.')
    });
  }

  // --- Resto de los métodos del componente ---

  loadParticipantsForCourse(courseId: number) {
    this.inscripcionSvc.getByProductoId(courseId).subscribe(inscripciones => {
      this.inscripcionesDelProducto = inscripciones;
    });
  }

  get availableParticipants(): Participante[] {
    if (!this.selectedCourse) return [];
    const enrolledIds = this.inscripcionesDelProducto.map(i => i.participante.id);
    return this.participantes.filter(p => !enrolledIds.includes(p.id));
  }
  
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
      this.notificationSvc.showError('Por favor, seleccione un curso y un archivo para subir.');
      return;
    }
    this.productoSvc.uploadParticipants(this.selectedCourse.id, this.selectedFile).subscribe({
      next: (response) => {
        const { nuevas_inscripciones_realizadas, nuevos_participantes_creados } = response;
        this.notificationSvc.showSuccess(
          `Carga completada: ${nuevas_inscripciones_realizadas} inscripciones y ${nuevos_participantes_creados} nuevos participantes.`
        );
        this.loadParticipantsForCourse(this.selectedCourse!.id);
        this.selectedFile = null;
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Ocurrió un error al subir el archivo.')
    });
  }

  enrollParticipant() {
    if (!this.participantToAdd || !this.selectedCourse) return;
    const payload: InscripcionCreate = {
      participante_id: this.participantToAdd,
      producto_educativo_id: this.selectedCourse.id
    };
    this.inscripcionSvc.create(payload).subscribe({
      next: () => {
        this.notificationSvc.showSuccess('Participante inscrito.');
        this.loadParticipantsForCourse(this.selectedCourse!.id);
        this.showAddParticipantForm = false;
        this.participantToAdd = null;
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'No se pudo inscribir.')
    });
  }

  removeParticipantFromCourse(inscripcionId: number) {
    if (!confirm('¿Seguro que desea eliminar la inscripción?')) return;
    this.inscripcionSvc.delete(inscripcionId).subscribe({
      next: () => {
        this.notificationSvc.showSuccess('Inscripción eliminada.');
        if (this.selectedCourse) this.loadParticipantsForCourse(this.selectedCourse.id);
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'No se pudo eliminar.')
    });
  }

  // Métodos del formulario
  cancelCourseForm() {
    this.showCourseForm = false;
    this.resetCourseForm();
  }

  resetCourseForm() {
    this.courseForm.reset({
      nombre: '',
      horas: 8,
      fecha_inicio: '',
      fecha_fin: '',
      tipo_producto: 'CURSO_EDUCATIVO',
      modalidad: 'PRESENCIAL',
      competencias: ''
    });
    (this.courseForm.get('docente_ids') as FormArray).clear();
    this.editingCourse = null;
  }

  editCourse(producto: ProductoEducativo) {
    this.editingCourse = producto;
    let competenciasStr = '';
    try {
      const competenciasArr = JSON.parse(producto.competencias || '[]');
      competenciasStr = competenciasArr.join('\n');
    } catch (e) {
      competenciasStr = producto.competencias || '';
    }
    this.courseForm.patchValue({ ...producto, competencias: competenciasStr });
    const formArray = this.courseForm.get('docente_ids') as FormArray;
    formArray.clear();
    producto.docentes.forEach(docente => formArray.push(this.fb.control(docente.id)));
    this.showCourseForm = true;
  }

  onSubmitCourse() {
    if (this.courseForm.invalid) {
      this.notificationSvc.showError("Por favor, complete todos los campos requeridos.");
      return;
    }
    const formValue = this.courseForm.getRawValue();
    const competenciasArray = (formValue.competencias || '').split('\n').filter((c: string) => c.trim() !== '');
    const payload = { ...formValue, competencias: JSON.stringify(competenciasArray) };
    if (this.editingCourse) {
      this.updateCourse(payload);
    } else {
      this.createCourse(payload);
    }
  }
  
  createCourse(payload: ProductoEducativoCreate) {
    this.productoSvc.create(payload).subscribe({
      next: (newProduct) => {
        this.notificationSvc.showSuccess('Producto educativo creado.');
        this.loadInitialData(); // Recargar todo
        this.cancelCourseForm();
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error.detail || 'Error al crear.')
    });
  }
  
  updateCourse(payload: ProductoEducativoUpdate) {
    if (!this.editingCourse) return;
    this.productoSvc.update(this.editingCourse.id, payload).subscribe({
      next: (updatedProduct) => {
        this.notificationSvc.showSuccess('Producto educativo actualizado.');
        this.loadInitialData(); // Recargar todo
        this.cancelCourseForm();
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error.detail || 'Error al actualizar.')
    });
  }

  deleteCourse(courseId: number) {
    if (confirm('¿Está seguro de eliminar este producto educativo?')) {
      this.productoSvc.delete(courseId).subscribe({
        next: () => {
          this.notificationSvc.showSuccess('Producto educativo eliminado.');
          this.loadInitialData();
          if (this.selectedCourse?.id === courseId) this.unselectCourse();
        },
        error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error.detail || 'Error al eliminar.')
      });
    }
  }

  toggleDocenteSelection(docenteId: number, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    const formArray = this.courseForm.get('docente_ids') as FormArray;
    if (isChecked) {
      formArray.push(this.fb.control(docenteId));
    } else {
      const index = formArray.controls.findIndex(x => x.value === docenteId);
      formArray.removeAt(index);
    }
  }

  getCourseColor(id: number): string {
    const colors = ['#4A90E2', '#50E3C2', '#F5A623', '#7ED321', '#BD10E0', '#9013FE', '#F8E71C'];
    return colors[id % colors.length];
  }
}