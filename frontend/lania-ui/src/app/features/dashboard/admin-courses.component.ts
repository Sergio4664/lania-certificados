// frontend/lania-ui/src/app/features/dashboard/admin-courses/admin-courses.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CourseDTO, CreateCourseDTO, UpdateCourseDTO } from '../../shared/interfaces/course.interfaces';
import { DocenteDTO } from '../../shared/interfaces/docente.interfaces';
import { ParticipantDTO } from '../../shared/interfaces/participant.interfaces';

@Component({
  selector: 'app-admin-courses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Vista de Lista de Cursos (Tarjetas) -->
<ng-container *ngIf="!selectedCourse">
  <div class="module-header">
    <h2>Gestión de Cursos</h2>
    <button class="primary-btn" (click)="showCourseForm = true; editingCourse = null; resetCourseForm()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      Nuevo Curso
    </button>
  </div>

  <!-- Formulario para Crear/Editar Curso (Modal) -->
  <div *ngIf="showCourseForm" class="form-card">
     <!-- ... Contenido del formulario ... -->
  </div>

  <div class="courses-grid">
    <div class="course-card" *ngFor="let course of courses" (click)="selectCourse(course)">
      <div class="course-card-header" [style.backgroundColor]="getCourseColor(course.id)">
        <h3 class="course-name">{{ course.name }}</h3>
        <p class="course-code">{{ course.code }}</p>
         <div class="course-avatar" [style.backgroundColor]="getAvatarColor(course.id)">
            {{ course.name.charAt(0) }}
          </div>
      </div>
      <div class="course-card-body">
         <!-- ... Detalles del curso ... -->
      </div>
      <div class="course-card-footer">
         <button class="icon-btn-card edit" (click)="editCourse(course); $event.stopPropagation()">
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
          <button class="icon-btn-card delete" (click)="deleteCourse(course.id); $event.stopPropagation()">
             <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
      </div>
    </div>
  </div>
</ng-container>

<!-- Vista de Detalles del Curso -->
<ng-container *ngIf="selectedCourse">
  <div class="course-detail-view">
    <button class="back-btn" (click)="unselectCourse()">
      <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      Volver a Cursos
    </button>
    <h2>{{ selectedCourse.name }}</h2>
    <p class="detail-sub-header">{{ selectedCourse.code }}</p>

    <div class="module-header">
      <h3>Participantes Inscritos</h3>
      <button class="primary-btn" (click)="showAddParticipantForm = true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Añadir Participante
      </button>
    </div>
    
    <!-- Formulario para Añadir Participante -->
    <div *ngIf="showAddParticipantForm" class="form-card compact">
      <form (ngSubmit)="enrollParticipant()" class="add-participant-form">
        <div class="form-group">
          <label>Seleccionar Participante</label>
          <select [(ngModel)]="participantToAdd" name="participant_id" required>
            <option [ngValue]="null" disabled>-- Elige un participante --</option>
            <option *ngFor="let p of availableParticipants" [value]="p.id">{{ p.full_name }} ({{p.email}})</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="secondary-btn" (click)="showAddParticipantForm = false">Cancelar</button>
          <button type="submit" class="primary-btn" [disabled]="!participantToAdd">Inscribir</button>
        </div>
      </form>
    </div>

    <!-- Lista de Participantes Inscritos -->
    <div class="data-table">
       <table>
        <thead>
          <tr>
            <th>Nombre Completo</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of courseParticipants">
            <td>{{ p.full_name }}</td>
            <td>{{ p.email }}</td>
            <td>{{ p.phone || 'N/A' }}</td>
            <td>
               <button class="icon-btn delete" (click)="removeParticipantFromCourse(p.id)">
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
              </button>
            </td>
          </tr>
          <tr *ngIf="courseParticipants.length === 0">
            <td colspan="4" class="no-data">Aún no hay participantes inscritos en este curso.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</ng-container>

  `,
  styles: [`
    .courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}
.course-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}
.course-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.12);
}
.course-card-header {
  padding: 20px;
  color: white;
  position: relative;
}
.course-name {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px 0;
}
.course-code {
  font-size: 14px;
  opacity: 0.9;
}
.course-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
    color: white;
    position: absolute;
    top: 20px;
    right: 20px;
    border: 2px solid white;
}
.course-card-body {
  padding: 20px;
  flex-grow: 1;
}
.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #64748b;
  font-size: 14px;
  margin-bottom: 12px;
}
 .detail-item.docentes {
  flex-direction: column;
  align-items: flex-start;
}
.detail-item strong {
  color: #1e293b;
  font-weight: 600;
}
.docentes-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}
.docente-tag-small {
  background: #e0e7ff;
  color: #4338ca;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}
.no-docentes-small {
   color: #9ca3af;
  font-style: italic;
  font-size: 13px;
}
.course-card-footer {
  padding: 12px 20px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.icon-btn-card {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #6b7280;
  background: transparent;
}
.icon-btn-card:hover {
  background: rgba(0,0,0,0.05);
}
.icon-btn-card.edit:hover {
  color: #2563eb;
}
 .icon-btn-card.delete:hover {
  color: #ef4444;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}
.back-btn:hover {
  background: #f1f5f9;
}
.detail-sub-header {
  color: #64748b;
  margin: -16px 0 24px 0;
  font-weight: 500;
}
.form-card.compact {
  padding: 20px;
}
.add-participant-form {
  display: flex;
  align-items: flex-end;
  gap: 16px;
}
.add-participant-form .form-group {
  flex: 1;
}
.no-data {
  text-align: center;
  padding: 32px;
  color: #9ca3af;
}
.icon-btn.delete {
  background: #fecaca;
  color: #dc2626;
}
.icon-btn.delete:hover:not(:disabled) {
  background: #fca5a5;
}

  `]
})
export default class AdminCoursesComponent implements OnInit {
  private http = inject(HttpClient);

  courses: CourseDTO[] = [];
  participants: ParticipantDTO[] = [];
  docentes: DocenteDTO[] = [];
  
  selectedCourse: CourseDTO | null = null;
  courseParticipants: ParticipantDTO[] = [];
  showAddParticipantForm = false;
  participantToAdd: number | null = null;

  showCourseForm = false;
  editingCourse: CourseDTO | null = null;
  selectedDocenteIds: number[] = [];
  
  courseForm!: CreateCourseDTO;

  constructor() {
    this.resetCourseForm();
  }

  ngOnInit() {
    this.loadInitialData();
  }

  get activeDocentes(): DocenteDTO[] {
    return this.docentes.filter(t => t.is_active);
  }

  get availableParticipants(): ParticipantDTO[] {
    if (!this.selectedCourse) return [];
    const enrolledIds = this.courseParticipants.map(p => p.id);
    return this.participants.filter(p => !enrolledIds.includes(p.id));
  }

  getCourseColor(id: number): string {
    const colors = ['#4A90E2', '#50E3C2', '#F5A623', '#F8E71C', '#D0021B', '#9013FE', '#417505', '#BD10E0'];
    return colors[id % colors.length];
  }

  getAvatarColor(id: number): string {
    const colors = ['#7ED321', '#4A90E2', '#F5A623', '#F8E71C', '#D0021B', '#9013FE', '#417505', '#BD10E0'];
    return colors[(id + 2) % colors.length];
  }
  
  selectCourse(course: CourseDTO) {
    this.selectedCourse = course;
    this.loadParticipantsForCourse(course.id);
  }

  unselectCourse() {
    this.selectedCourse = null;
    this.courseParticipants = [];
    this.showAddParticipantForm = false;
    this.participantToAdd = null;
  }
  
  isDocenteSelected(docenteId: number): boolean { 
      return this.selectedDocenteIds.includes(docenteId); 
  }

  toggleDocenteSelection(docenteId: number, event: Event): void {
      const isChecked = (event.target as HTMLInputElement).checked;
      if (isChecked) {
        if (!this.selectedDocenteIds.includes(docenteId)) {
          this.selectedDocenteIds.push(docenteId);
        }
      } else {
        this.selectedDocenteIds = this.selectedDocenteIds.filter(id => id !== docenteId);
      }
  }

  removeDocente(docenteId: number): void { 
      this.selectedDocenteIds = this.selectedDocenteIds.filter(id => id !== docenteId); 
  }

  getDocenteName(docenteId: number): string { 
      return this.docentes.find(t => t.id === docenteId)?.full_name || ''; 
  }
  
  loadInitialData() {
    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<CourseDTO[]>('http://127.0.0.1:8000/api/admin/courses', { headers }).subscribe(data => this.courses = data);
    this.http.get<DocenteDTO[]>('http://127.0.0.1:8000/api/admin/docentes', { headers }).subscribe(data => this.docentes = data);
    this.http.get<ParticipantDTO[]>('http://127.0.0.1:8000/api/admin/participants', { headers }).subscribe(data => this.participants = data);
  }

  loadParticipantsForCourse(courseId: number) {
    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<ParticipantDTO[]>(`http://127.0.0.1:8000/api/admin/courses/${courseId}/participants`, { headers })
      .subscribe(data => this.courseParticipants = data);
  }

  getInitialCourseForm(): CreateCourseDTO { return { code: '', name: '', start_date: '', end_date: '', hours: 0, created_by: 2, course_type: 'CURSO_EDUCATIVO', docente_ids: [] }; }
  
  resetCourseForm() { 
      this.courseForm = this.getInitialCourseForm(); 
      this.selectedDocenteIds = []; 
  }

  cancelCourseForm() { 
      this.showCourseForm = false; 
      this.editingCourse = null; 
      this.resetCourseForm(); 
  } 
  
  createCourse() {
    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };
    const courseData = { ...this.courseForm, docente_ids: this.selectedDocenteIds };

    this.http.post('http://127.0.0.1:8000/api/admin/courses', courseData, { headers }).subscribe({
      next: () => {
        alert('Curso creado exitosamente');
        this.loadInitialData();
        this.cancelCourseForm();
      },
      error: (err) => {
        console.error('Error creating course:', err);
        alert(`Error al crear el curso: ${err.error?.detail || 'Error desconocido'}`);
      }
    });
  }

  editCourse(course: CourseDTO) {
    this.editingCourse = course;
    const formatDate = (dateStr: string): string => dateStr ? new Date(dateStr).toISOString().split('T')[0] : '';

    this.courseForm = {
      code: course.code,
      name: course.name,
      start_date: formatDate(course.start_date),
      end_date: formatDate(course.end_date),
      hours: course.hours,
      created_by: course.created_by,
      course_type: course.course_type,
      modality: course.modality,
    };
    this.selectedDocenteIds = course.docentes?.map(d => d.id) || [];
    this.showCourseForm = true;
  }

  updateCourse() {
    if (!this.editingCourse) return;
    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };

    const updateData: UpdateCourseDTO = {
        name: this.courseForm.name,
        start_date: this.courseForm.start_date,
        end_date: this.courseForm.end_date,
        hours: this.courseForm.hours,
        course_type: this.courseForm.course_type,
        modality: this.courseForm.modality,
        docente_ids: this.selectedDocenteIds
    };

    this.http.put(`http://127.0.0.1:8000/api/admin/courses/${this.editingCourse.id}`, updateData, { headers }).subscribe({
      next: () => {
        alert('Curso actualizado exitosamente');
        this.loadInitialData();
        this.cancelCourseForm();
      },
      error: (err) => {
        console.error('Error updating course:', err);
        alert(`Error al actualizar el curso: ${err.error?.detail || 'Error desconocido'}`);
      }
    });
  }

  deleteCourse(courseId: number) {
    const confirmation = confirm('¿Está seguro de eliminar el curso? Esto podría eliminar datos de los certificados.');
    if (confirmation) {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      this.http.delete(`http://127.0.0.1:8000/api/admin/courses/${courseId}`, { headers }).subscribe({
        next: () => {
          alert('Curso eliminado exitosamente');
          this.loadInitialData();
        },
        error: (err) => {
          console.error('Error deleting course:', err);
          alert(`Error al eliminar el curso: ${err.error?.detail || 'Error desconocido'}`);
        }
      });
    }
  }

  enrollParticipant() {
    if(!this.participantToAdd || !this.selectedCourse) return;

    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };
    const body = { participant_id: this.participantToAdd };

    this.http.post(`http://127.0.0.1:8000/api/admin/courses/${this.selectedCourse.id}/enroll`, body, { headers })
      .subscribe({
        next: () => {
          alert('Participante inscrito exitosamente');
          this.loadParticipantsForCourse(this.selectedCourse!.id);
          this.showAddParticipantForm = false;
          this.participantToAdd = null;
        },
        error: (err) => {
          console.error('Error enrolling participant', err);
          alert(`Error:${err.error?.detail || 'No se pudo inscribir al participante.'}` );
        }
      });
  }

  removeParticipantFromCourse(participantId: number) {
    if (!this.selectedCourse) return;
    if (!confirm('¿Está seguro que desea eliminar este participante del curso?')) return;

    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.delete(`http://127.0.0.1:8000/api/admin/courses/${this.selectedCourse.id}/enroll/${participantId}`, { headers })
      .subscribe({
        next: () => {
          alert('Participante eliminado del curso exitosamente');
          this.loadParticipantsForCourse(this.selectedCourse!.id);
        },
        error: (err) => {
          console.error('Error eliminando participante del curso:', err); 
          alert(`Error:${err.error?.detail || 'No se pudo desinscribir al participante.'}` );
        }
      });
  }
}

styles: [`
courses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}
.course-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}
.course-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.12);
}
.course-card-header {
  padding: 20px;
  color: white;
  position: relative;
}
.course-name {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px 0;
}
.course-code {
  font-size: 14px;
  opacity: 0.9;
}
.course-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
    color: white;
    position: absolute;
    top: 20px;
    right: 20px;
    border: 2px solid white;
}
.course-card-body {
  padding: 20px;
  flex-grow: 1;
}
.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #64748b;
  font-size: 14px;
  margin-bottom: 12px;
}
 .detail-item.docentes {
  flex-direction: column;
  align-items: flex-start;
}
.detail-item strong {
  color: #1e293b;
  font-weight: 600;
}
.docentes-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}
.docente-tag-small {
  background: #e0e7ff;
  color: #4338ca;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}
.no-docentes-small {
   color: #9ca3af;
  font-style: italic;
  font-size: 13px;
}
.course-card-footer {
  padding: 12px 20px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.icon-btn-card {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #6b7280;
  background: transparent;
}
.icon-btn-card:hover {
  background: rgba(0,0,0,0.05);
}
.icon-btn-card.edit:hover {
  color: #2563eb;
}
 .icon-btn-card.delete:hover {
  color: #ef4444;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}
.back-btn:hover {
  background: #f1f5f9;
}
.detail-sub-header {
  color: #64748b;
  margin: -16px 0 24px 0;
  font-weight: 500;
}
.form-card.compact {
  padding: 20px;
}
.add-participant-form {
  display: flex;
  align-items: flex-end;
  gap: 16px;
}
.add-participant-form .form-group {
  flex: 1;
}
.no-data {
  text-align: center;
  padding: 32px;
  color: #9ca3af;
}
.icon-btn.delete {
  background: #fecaca;
  color: #dc2626;
}
.icon-btn.delete:hover:not(:disabled) {
  background: #fca5a5;
}

`]