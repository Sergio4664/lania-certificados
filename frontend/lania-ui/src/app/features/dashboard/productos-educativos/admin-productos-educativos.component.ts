import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule, FormArray } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { environment } from '@environments/environment';
import { HttpErrorResponse } from '@angular/common/http'; // Importación añadida

// Interfaces
import { ProductoEducativo, ProductoEducativoCreate, ProductoEducativoUpdate } from '@shared/interfaces/producto-educativo.interface';
import { DocenteDTO } from '@shared/interfaces/docente.interfaces';
import { Participante } from '@shared/interfaces/participante.interface';
import { Inscripcion, InscripcionCreate } from '@shared/interfaces/inscripcion.interface';
import { Certificado, CertificadoCreate } from '@shared/interfaces/certificado.interface';

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

  // --- Listas de datos separadas por tipo de producto ---
  cursos: ProductoEducativo[] = [];
  pildoras: ProductoEducativo[] = [];
  inyecciones: ProductoEducativo[] = [];

  // Listas de datos
  private productos: ProductoEducativo[] = [];
  docentes: DocenteDTO[] = [];
  participantes: Participante[] = [];
  inscripcionesDelProducto: Inscripcion[] = [];
  certificados: Certificado[] = [];

  // Estados de la UI
  showCourseForm = false;
  editingCourse: ProductoEducativo | null = null;
  selectedCourse: ProductoEducativo | null = null;
  showAddParticipantForm = false;
  showCompetenciesModal = false;
  searchTerm: string = '';

  // Formularios
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
      // CORRECCIÓN: Se llama a la función con paréntesis
      this.groupAndFilterProducts();
    });
  }

  groupAndFilterProducts() {
    const term = this.searchTerm.toLowerCase();
    const filtered = this.productos.filter(p => p.nombre.toLowerCase().includes(term));

    // CORRECCIÓN: Se usan los nombres correctos del enum/tipo
    this.cursos = filtered.filter(p => p.tipo_producto === 'CURSO_EDUCATIVO');
    this.pildoras = filtered.filter(p => p.tipo_producto === 'PILDORA_EDUCATIVA');
    this.inyecciones = filtered.filter(p => p.tipo_producto === 'INYECCION_EDUCATIVA');
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
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    } else {
      this.selectedFile = null;
    }
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
      error: (err: HttpErrorResponse) => {
        const detail = err.error?.detail || 'Ocurrió un error al subir el archivo.';
        this.notificationSvc.showError(detail);
      }
    });
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

  cancelCourseForm() {
    this.showCourseForm = false;
    this.resetCourseForm();
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
      next: () => {
        this.notificationSvc.showSuccess('Producto educativo creado.');
        this.loadInitialData();
        this.cancelCourseForm();
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error.detail || 'Error al crear.')
    });
  }
  
  updateCourse(payload: ProductoEducativoUpdate) {
    if (!this.editingCourse) return;
    this.productoSvc.update(this.editingCourse.id, payload).subscribe({
      next: () => {
        this.notificationSvc.showSuccess('Producto educativo actualizado.');
        this.loadInitialData();
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
  
  // --- LÓGICA DE CONSTANCIAS ---
  
  getCertificadoForInscripcion(inscripcionId: number): Certificado | undefined {
    return this.certificados.find(c => c.inscripcion_id === inscripcionId);
  }

  issueCertificate(inscripcionId: number) {
    const payload: CertificadoCreate = { inscripcion_id: inscripcionId };
    this.certificadoSvc.create(payload).subscribe({
      next: (newCert) => {
        this.notificationSvc.showSuccess(`Constancia emitida: ${newCert.folio}`);
        this.certificados.push(newCert);
      },
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error al emitir constancia.')
    });
  }
  
  sendCertificate(certificadoId: number) {
    this.certificadoSvc.sendEmail(certificadoId).subscribe({
      next: () => this.notificationSvc.showSuccess('Enviando constancia por correo...'),
      error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error al enviar correo.')
    });
  }

  deleteCertificate(cert: Certificado) {
    if (confirm(`¿Eliminar constancia con folio ${cert.folio}?`)) {
      this.certificadoSvc.delete(cert.id).subscribe({
        next: () => {
          this.notificationSvc.showSuccess('Constancia eliminada.');
          this.certificados = this.certificados.filter(c => c.id !== cert.id);
        },
        error: (err: HttpErrorResponse) => this.notificationSvc.showError(err.error?.detail || 'Error al eliminar.')
      });
    }
  }

  // --- Lógica de Competencias (sin cambios) ---
  
  openCompetenciesModal() {
    let competenciasValue = this.courseForm.value.competencias || '';
    try {
        const parsed = JSON.parse(competenciasValue);
        if (Array.isArray(parsed)) competenciasValue = parsed.join('\n');
    } catch (e) { /* No es JSON */ }
    this.competenciesList = competenciasValue.split('\n').filter((c:string) => c.trim()) || [''];
    if (this.competenciesList.length === 0) this.competenciesList.push('');
    this.showCompetenciesModal = true;
  }
  
  saveCompetencies() {
    this.courseForm.patchValue({
      competencias: this.competenciesList.filter(c => c && c.trim()).join('\n')
    });
    this.showCompetenciesModal = false;
  }
  
  addCompetency = () => this.competenciesList.push('');
  removeCompetency = (index: number) => { if (this.competenciesList.length > 1) this.competenciesList.splice(index, 1); }
  trackByIndex = (index: number) => index;
}