import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule, FormArray } from '@angular/forms';
import { forkJoin } from 'rxjs';

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
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DatePipe], // <-- FormsModule AÑADIDO
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

  // Listas de datos
  productos: ProductoEducativo[] = [];
  productosFiltrados: ProductoEducativo[] = [];
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
      docente_ids: this.fb.array([]), // Se manejará como FormArray
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
      this.filterCourses();
    });
  }

  filterCourses() {
    this.productosFiltrados = this.productos.filter(p =>
      p.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  // --- MÉTODOS QUE FALTABAN ---

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    } else {
      this.selectedFile = null;
    }
  }

  uploadParticipants(): void {
    if (this.selectedFile && this.selectedCourse) {
      this.notificationSvc.showError('La carga de archivos aún no está implementada.');
      console.log(`Simulando carga de ${this.selectedFile.name} para el curso ${this.selectedCourse.nombre}`);
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

  // --- Lógica del Formulario de Producto ---

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
    // Limpiar el FormArray
    (this.courseForm.get('docente_ids') as FormArray).clear();
    this.editingCourse = null;
  }

  cancelCourseForm() {
    this.showCourseForm = false;
    this.resetCourseForm();
  }
  
  editCourse(producto: ProductoEducativo) {
    this.editingCourse = producto;
    
    // Convertir competencias de JSON string a string con saltos de línea
    let competenciasStr = '';
    try {
      const competenciasArr = JSON.parse(producto.competencias || '[]');
      competenciasStr = competenciasArr.join('\n');
    } catch (e) {
      competenciasStr = producto.competencias || ''; // Si no es JSON, usa el valor directo
    }
    
    this.courseForm.patchValue({
      ...producto,
      competencias: competenciasStr,
    });
    
    // Setear los docentes en el FormArray
    const formArray = this.courseForm.get('docente_ids') as FormArray;
    formArray.clear();
    producto.docentes.forEach(docente => {
      formArray.push(this.fb.control(docente.id));
    });

    this.showCourseForm = true;
  }

  onSubmitCourse() {
    if (this.courseForm.invalid) {
      this.notificationSvc.showError("Por favor, complete todos los campos requeridos.");
      return;
    }
    const formValue = this.courseForm.getRawValue();

    // Convertir competencias a un JSON string array antes de enviar
    const competenciasArray = (formValue.competencias || '').split('\n').filter((c: string) => c.trim() !== '');
    const payload = {
        ...formValue,
        competencias: JSON.stringify(competenciasArray)
    };

    if (this.editingCourse) {
      this.updateCourse(payload);
    } else {
      this.createCourse(payload);
    }
  }
  
  createCourse(payload: ProductoEducativoCreate) {
    this.productoSvc.create(payload).subscribe({
      next: () => {
        this.notificationSvc.showSuccess('Producto educativo creado exitosamente.');
        this.loadInitialData();
        this.cancelCourseForm();
      },
      error: (err) => this.notificationSvc.showError(err.error.detail || 'Error al crear el producto.')
    });
  }
  
  updateCourse(payload: ProductoEducativoUpdate) {
    if (!this.editingCourse) return;
    this.productoSvc.update(this.editingCourse.id, payload).subscribe({
      next: () => {
        this.notificationSvc.showSuccess('Producto educativo actualizado exitosamente.');
        this.loadInitialData();
        this.cancelCourseForm();
      },
      error: (err) => this.notificationSvc.showError(err.error.detail || 'Error al actualizar el producto.')
    });
  }

  deleteCourse(courseId: number) {
    if (confirm('¿Está seguro de eliminar el producto educativo? Esto eliminará inscripciones y certificados asociados.')) {
      this.productoSvc.delete(courseId).subscribe({
        next: () => {
          this.notificationSvc.showSuccess('Producto educativo eliminado exitosamente.');
          this.loadInitialData();
          if (this.selectedCourse?.id === courseId) {
            this.unselectCourse();
          }
        },
        error: (err) => this.notificationSvc.showError(err.error.detail || 'Error al eliminar el producto.')
      });
    }
  }
  
  // --- Lógica del Modal de Detalles ---

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
        this.notificationSvc.showSuccess('Participante inscrito exitosamente.');
        this.loadParticipantsForCourse(this.selectedCourse!.id);
        this.showAddParticipantForm = false;
        this.participantToAdd = null;
      },
      error: (err) => this.notificationSvc.showError(err.error?.detail || 'No se pudo inscribir.')
    });
  }

  removeParticipantFromCourse(inscripcionId: number) {
    if (!confirm('¿Está seguro que desea eliminar la inscripción de este participante?')) return;
    this.inscripcionSvc.delete(inscripcionId).subscribe({
      next: () => {
        this.notificationSvc.showSuccess('Inscripción eliminada.');
        if(this.selectedCourse) {
          this.loadParticipantsForCourse(this.selectedCourse.id);
        }
      },
      error: (err) => this.notificationSvc.showError(err.error?.detail || 'No se pudo eliminar la inscripción.')
    });
  }
  
  // --- Lógica de Emisión de Certificados ---
  
  getCertificadoForInscripcion(inscripcionId: number): Certificado | undefined {
    return this.certificados.find(c => c.inscripcion_id === inscripcionId);
  }

  issueCertificate(inscripcionId: number) {
    const payload: CertificadoCreate = {
      inscripcion_id: inscripcionId,
      folio: '',
      fecha_emision: ''
    };

    this.certificadoSvc.create(payload).subscribe({
      next: (newCert) => {
        this.notificationSvc.showSuccess(`Certificado emitido con folio: ${newCert.folio}`);
        this.certificados.push(newCert); // Actualiza la lista localmente
      },
      error: (err) => this.notificationSvc.showError(err.error?.detail || 'Error al emitir certificado.')
    });
  }

  deleteCertificate(cert: Certificado) {
    if (confirm(`¿Está seguro que desea eliminar el certificado con folio ${cert.folio}?`)) {
      this.certificadoSvc.delete(cert.id).subscribe({
        next: () => {
          this.notificationSvc.showSuccess('Certificado eliminado.');
          this.certificados = this.certificados.filter(c => c.id !== cert.id);
        },
        error: (err) => this.notificationSvc.showError(err.error?.detail || 'Error al eliminar.')
      });
    }
  }

  // --- Lógica de Competencias Modal ---
  
  openCompetenciesModal() {
    let competenciasValue = this.courseForm.value.competencias || '';
    // Intenta parsear por si es un string JSON
    try {
        const parsed = JSON.parse(competenciasValue);
        if (Array.isArray(parsed)) {
            competenciasValue = parsed.join('\n');
        }
    } catch (e) {
        // No es JSON, usa el valor como está
    }

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