import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

// Interfaces actualizadas
import { ProductoEducativo, ProductoEducativoCreate, ProductoEducativoUpdate } from '@shared/interfaces/producto-educativo.interface';
import { Participante } from '@shared/interfaces/participante.interface';
import { Inscripcion, InscripcionCreate } from '@shared/interfaces/inscripcion.interface';
import { Certificado, CertificadoCreate } from '@shared/interfaces/certificado.interface';

// Servicios actualizados
import { ProductoEducativoService } from '@shared/services/producto-educativo.service';
import { DocenteService } from '@shared/services/docente.service';
import { NotificationService } from '@shared/services/notification.service';
import { InscripcionService } from '@shared/services/inscripcion.service';
import { CertificadoService } from '@shared/services/certificado.service';
import { ParticipanteService } from '@shared/services/participante.service';
import { DocenteDTO } from '@app/shared/interfaces/docente.interfaces';


@Component({
  selector: 'app-admin-productos-educativos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

  // Formularios Reactivos
  courseForm: FormGroup;
  competenciesList: string[] = [];
  participantToAdd: number | null = null;
  selectedFile: File | null = null;

  constructor() {
    this.courseForm = this.fb.group({
      nombre: ['', Validators.required],
      horas: [0, [Validators.required, Validators.min(1)]],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      tipo_producto: ['CURSO_EDUCATIVO', Validators.required],
      modalidad: ['PRESENCIAL', Validators.required],
      docente_ids: [[]],
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

  // --- Lógica del Formulario de Producto ---

  resetCourseForm() {
    this.courseForm.reset({
      nombre: '',
      horas: 8,
      fecha_inicio: '',
      fecha_fin: '',
      tipo_producto: 'CURSO_EDUCATIVO',
      modalidad: 'PRESENCIAL',
      docente_ids: [],
      competencias: ''
    });
    this.editingCourse = null;
  }

  cancelCourseForm() {
    this.showCourseForm = false;
    this.resetCourseForm();
  }
  
  editCourse(producto: ProductoEducativo) {
    this.editingCourse = producto;
    this.courseForm.patchValue({
      ...producto,
      docente_ids: producto.docentes.map(d => d.id)
    });
    this.showCourseForm = true;
  }

  onSubmitCourse() {
    if (this.courseForm.invalid) {
      this.notificationSvc.showError("Por favor, complete todos los campos requeridos.");
      return;
    }
    const formValue = this.courseForm.value;
    if (this.editingCourse) {
      this.updateCourse(formValue);
    } else {
      this.createCourse(formValue);
    }
  }
  
  createCourse(formValue: any) {
    this.productoSvc.create(formValue).subscribe({
      next: () => {
        this.notificationSvc.showSuccess('Producto educativo creado exitosamente.');
        this.loadInitialData();
        this.cancelCourseForm();
      },
      error: (err) => this.notificationSvc.showError(err.error.detail || 'Error al crear el producto.')
    });
  }
  
  updateCourse(formValue: any) {
    if (!this.editingCourse) return;
    this.productoSvc.update(this.editingCourse.id, formValue).subscribe({
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
      folio: `LANIA-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      fecha_emision: new Date().toISOString().split('T')[0]
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
    this.competenciesList = this.courseForm.value.competencias?.split('\n').filter((c:string) => c.trim()) || [''];
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

