import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { CourseDTO, CreateCourseDTO, UpdateCourseDTO } from '../../shared/interfaces/course.interfaces';
import { DocenteDTO } from '../../shared/interfaces/docente.interfaces';
import { ParticipantDTO } from '../../shared/interfaces/participant.interfaces';
import { CertificateDTO, CreateCertificateDTO } from '@app/shared/interfaces/certificate.interfaces';
import { CertificateService, BulkIssueResponse, CertificateIssueRequest } from '../certificates/certificate.service';


@Component({
  selector: 'app-admin-courses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
   <div class="module-content">
       <div class="module-header">
         <h2>Gestión de Productos Educativos</h2>
         <div class="header-actions">
           <div class="search-container">
             <input type="text" [(ngModel)]="searchTerm" (input)="filterCourses()" placeholder="Buscar por nombre...">
             <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <circle cx="11" cy="11" r="8"></circle>
               <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
             </svg>
           </div>
           <button class="primary-btn" (click)="showCourseForm = true; editingCourse = null; resetCourseForm()">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
             Nuevo Producto Educativo
           </button>
         </div>
       </div>

       <div *ngIf="showCourseForm" class="form-card">
         <h3>{{ editingCourse ? 'Editar el Producto Educativo' : 'Crear Nuevo Producto Educativo' }}</h3>
         <form (ngSubmit)="editingCourse ? updateCourse() : createCourse()" class="form-grid">
           <div class="form-group">
             <label>Código del Curso</label>
             <input [(ngModel)]="courseForm.code" name="code" required [disabled]="!!editingCourse">
           </div>
           <div class="form-group">
             <label>Nombre del Curso</label>
             <input [(ngModel)]="courseForm.name" name="name" required>
           </div>
           <div class="form-group">
             <label>Fecha de Inicio</label>
             <input type="date" [(ngModel)]="courseForm.start_date" name="start_date" required>
           </div>
           <div class="form-group">
             <label>Fecha de Fin</label>
             <input type="date" [(ngModel)]="courseForm.end_date" name="end_date" required>
           </div>
           <div class="form-group">
             <label>Horas</label>
             <input type="number" [(ngModel)]="courseForm.hours" name="hours" required>
           </div>
           <div class="form-group">
             <label>Tipo de Producto Educativo</label>
             <select [(ngModel)]="courseForm.course_type" name="course_type" required>
               <option value="CURSO_EDUCATIVO">Curso Educativo</option>
               <option value="PILDORA_EDUCATIVA">Píldora Educativa</option>
               <option value="INYECCION_EDUCATIVA">Inyección Educativa</option>
             </select>
           </div>

           <div class="form-group full-width" *ngIf="courseForm.course_type === 'CURSO_EDUCATIVO'">
             <label>Competencias del Curso</label>
             <button type="button" class="secondary-btn icon-left" (click)="openCompetenciesModal()">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
               {{ courseForm.competencies && courseForm.competencies.length > 0 ? 'Editar Competencias' : 'Añadir Competencias' }}
             </button>
           </div>
           
           <div class="form-group full-width">
             <label>Docentes Asignados</label>
             <div class="docentes-selection">
               <div class="docentes-checkboxes">
                 <div class="checkbox-item" *ngFor="let docente of activeDocentes">
                   <input type="checkbox" [id]="'docente-' + docente.id" [checked]="isDocenteSelected(docente.id)" (change)="toggleDocenteSelection(docente.id, $event)">
                   <label [for]="'docente-' + docente.id">
                     <strong *ngIf="docente.especialidad" style="color: #667eea; display: block; font-size: 0.9em; margin-bottom: 2px;">{{docente.especialidad}}</strong>
                       {{docente.full_name}}
                     <small>({{docente.institutional_email}})</small>
                   </label>
                 </div>
               </div>
             </div>
           </div>
           <div class="form-actions">
             <button type="button" class="secondary-btn" (click)="cancelCourseForm()">Cancelar</button>
             <button type="submit" class="primary-btn">{{ editingCourse ? 'Actualizar Producto Educativo' : 'Crear Producto Educativo' }}</button>
           </div>
         </form>
       </div>

      <div *ngIf="searchTerm.length === 0">
       <div class="category-section">
         <div class="category-header"><h3>Píldoras Educativas</h3></div>
         <div class="courses-grid">
           <div class="course-card" *ngFor="let course of pildoras" (click)="selectCourse(course)">
             <div class="course-card-header" [style.backgroundColor]="getCourseColor(course.id)"><h3 class="course-name">{{ course.name }}</h3><p class="course-code">{{ course.code }}</p><div class="course-avatar" [style.backgroundColor]="getAvatarColor(course.id)">{{ course.name.charAt(0) }}</div></div>
             <div class="course-card-body"><div class="detail-item"><strong>Tipo:</strong> {{ course.course_type.replace('_', ' ') }}</div><div class="detail-item"><strong>Fechas:</strong> {{ course.start_date | date:'dd/MM/yy' }} - {{ course.end_date | date:'dd/MM/yy' }}</div><div class="detail-item"><strong>Horas:</strong> {{ course.hours }}h</div><div class="detail-item docentes"><strong>Docente(s):</strong><div *ngIf="course.docentes && course.docentes.length > 0; else noDocentes" class="docentes-list">
               <span *ngFor="let docente of course.docentes" class="docente-tag-small">
                 <strong *ngIf="docente.especialidad">{{ docente.especialidad }}:</strong> {{ docente.full_name }}
               </span>
               </div><ng-template #noDocentes><span class="no-docentes-small">No asignados</span></ng-template></div></div>
             <div class="course-card-footer"><button class="icon-btn-card edit" (click)="editCourse(course); $event.stopPropagation()" title="Editar"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button><button class="icon-btn-card delete" (click)="deleteCourse(course.id); $event.stopPropagation()" title="Eliminar"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button></div>
           </div>
         </div>
       </div>
       <div class="category-section">
         <div class="category-header"><h3>Inyecciones Educativas</h3></div>
         <div class="courses-grid">
           <div class="course-card" *ngFor="let course of inyecciones" (click)="selectCourse(course)">
             <div class="course-card-header" [style.backgroundColor]="getCourseColor(course.id)"><h3 class="course-name">{{ course.name }}</h3><p class="course-code">{{ course.code }}</p><div class="course-avatar" [style.backgroundColor]="getAvatarColor(course.id)">{{ course.name.charAt(0) }}</div></div>
             <div class="course-card-body"><div class="detail-item"><strong>Tipo:</strong> {{ course.course_type.replace('_', ' ') }}</div><div class="detail-item"><strong>Fechas:</strong> {{ course.start_date | date:'dd/MM/yy' }} - {{ course.end_date | date:'dd/MM/yy' }}</div><div class="detail-item"><strong>Horas:</strong> {{ course.hours }}h</div><div class="detail-item docentes"><strong>Docente(s):</strong><div *ngIf="course.docentes && course.docentes.length > 0; else noDocentes" class="docentes-list"><span *ngFor="let docente of course.docentes" class="docente-tag-small">{{ docente.full_name }}</span></div><ng-template #noDocentes><span class="no-docentes-small">No asignados</span></ng-template></div></div>
             <div class="course-card-footer"><button class="icon-btn-card edit" (click)="editCourse(course); $event.stopPropagation()" title="Editar"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button><button class="icon-btn-card delete" (click)="deleteCourse(course.id); $event.stopPropagation()" title="Eliminar"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button></div>
           </div>
         </div>
       </div>
       <div class="category-section">
         <div class="category-header"><h3>Cursos Educativos</h3></div>
         <div class="courses-grid">
            <div class="course-card" *ngFor="let course of cursos" (click)="selectCourse(course)">
             <div class="course-card-header" [style.backgroundColor]="getCourseColor(course.id)"><h3 class="course-name">{{ course.name }}</h3><p class="course-code">{{ course.code }}</p><div class="course-avatar" [style.backgroundColor]="getAvatarColor(course.id)">{{ course.name.charAt(0) }}</div></div>
             <div class="course-card-body"><div class="detail-item"><strong>Tipo:</strong> {{ course.course_type.replace('_', ' ') }}</div><div class="detail-item"><strong>Fechas:</strong> {{ course.start_date | date:'dd/MM/yy' }} - {{ course.end_date | date:'dd/MM/yy' }}</div><div class="detail-item"><strong>Horas:</strong> {{ course.hours }}h</div><div class="detail-item docentes"><strong>Docente(s):</strong><div *ngIf="course.docentes && course.docentes.length > 0; else noDocentes" class="docentes-list"><span *ngFor="let docente of course.docentes" class="docente-tag-small">{{ docente.full_name }}</span></div><ng-template #noDocentes><span class="no-docentes-small">No asignados</span></ng-template></div></div>
             <div class="course-card-footer"><button class="icon-btn-card edit" (click)="editCourse(course); $event.stopPropagation()" title="Editar"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button><button class="icon-btn-card delete" (click)="deleteCourse(course.id); $event.stopPropagation()" title="Eliminar"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button></div>
           </div>
         </div>
       </div>
      </div>

       <div *ngIf="searchTerm.length > 0" class="courses-grid">
         <div class="course-card" *ngFor="let course of filteredCourses" (click)="selectCourse(course)">
            <div class="course-card-header" [style.backgroundColor]="getCourseColor(course.id)"><h3 class="course-name">{{ course.name }}</h3><p class="course-code">{{ course.code }}</p><div class="course-avatar" [style.backgroundColor]="getAvatarColor(course.id)">{{ course.name.charAt(0) }}</div></div>
            <div class="course-card-body"><div class="detail-item"><strong>Tipo:</strong> {{ course.course_type.replace('_', ' ') }}</div><div class="detail-item"><strong>Fechas:</strong> {{ course.start_date | date:'dd/MM/yy' }} - {{ course.end_date | date:'dd/MM/yy' }}</div><div class="detail-item"><strong>Horas:</strong> {{ course.hours }}h</div><div class="detail-item docentes"><strong>Docente(s):</strong><div *ngIf="course.docentes && course.docentes.length > 0; else noDocentes" class="docentes-list"><span *ngFor="let docente of course.docentes" class="docente-tag-small">{{ docente.full_name }}</span></div><ng-template #noDocentes><span class="no-docentes-small">No asignados</span></ng-template></div></div>
            <div class="course-card-footer"><button class="icon-btn-card edit" (click)="editCourse(course); $event.stopPropagation()" title="Editar"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button><button class="icon-btn-card delete" (click)="deleteCourse(course.id); $event.stopPropagation()" title="Eliminar"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button></div>
         </div>
       </div>
       
       <div *ngIf="selectedCourse" class="modal-overlay" (click)="unselectCourse()">
         <div class="modal-content" (click)="$event.stopPropagation()">
           <div class="modal-header"><h2>Contenido del Producto Educativo: {{ selectedCourse.name }}</h2><button class="close-btn" (click)="unselectCourse()"><svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button></div>
           <div class="modal-body">
             
             <div class="modal-actions-grid">
                 <div class="form-card compact">
                   <h4>Añadir e Importar Participantes</h4>
                   <div class="add-participant-section">
                     <button class="primary-btn small-btn" (click)="showAddParticipantForm = !showAddParticipantForm">Añadir Manualmente</button>
                     <div *ngIf="showAddParticipantForm" class="form-card nested-form">
                       <form (ngSubmit)="enrollParticipant()">
                         <div class="form-group">
                           <label>Seleccionar Participante</label>
                           <select [(ngModel)]="participantToAdd" name="participant_id" required>
                             <option [ngValue]="null" disabled>-- Elige un participante --</option>
                             <option *ngFor="let p of availableParticipants" [value]="p.id">{{ p.full_name }} ({{p.personal_email}})</option>
                           </select>
                         </div>
                         <div class="form-actions">
                           <button type="button" class="secondary-btn small-btn" (click)="showAddParticipantForm = false">Cancelar</button>
                           <button type="submit" class="primary-btn small-btn" [disabled]="!participantToAdd">Inscribir</button>
                         </div>
                       </form>
                     </div>
                   </div>
                   <div class="upload-section">
                     <input type="file" (change)="onFileSelected($event)" accept=".csv, .xlsx" #fileInput hidden>
                     <button class="secondary-btn small-btn" (click)="fileInput.click()">Importar desde Archivo</button>
                     <span *ngIf="selectedFile">{{ selectedFile.name }}</span>
                     <button class="primary-btn small-btn" (click)="uploadParticipants()" [disabled]="!selectedFile">Subir</button>
                   </div>
                 </div>

                 <div class="form-card compact">
                   <h4>Emisión y Envío Masivo</h4>
                   <div class="bulk-actions">
                     <button class="primary-btn" (click)="issueAndNotifyBulk(false)" [disabled]="courseParticipants.length === 0 && (!selectedCourse.docentes || selectedCourse.docentes.length === 0)">Emitir y Notificar a Todos (Normal)</button>
                     <div *ngIf="selectedCourse.course_type === 'CURSO_EDUCATIVO'">
                       <p>O seleccione destinatarios para emitir constancias <strong>de competencias.</strong></p>
                       <button class="secondary-btn" (click)="issueAndNotifyBulk(true)" [disabled]="competencyRecipients.size === 0 && docenteCompetencyRecipients.size === 0">Emitir y Notificar a Seleccionados</button>
                     </div>
                   </div>
                 </div>
             </div>

            <div class="scrollable-content">
              <div class="data-table" *ngIf="selectedCourse.docentes && selectedCourse.docentes.length > 0">
                <h3 class="table-title">Docentes / Ponentes</h3>
                <table>
                  <thead>
                    <tr>
                      <th *ngIf="selectedCourse.course_type === 'CURSO_EDUCATIVO'" class="checkbox-col">
                        <input type="checkbox"
                               [checked]="areAllDocenteRecipientsSelected"
                               (change)="toggleAllDocenteRecipients($event)"
                               title="Seleccionar Todos los Docentes">
                      </th>
                      <th>Especialidad</th>
                      <th>Nombre</th>
                      <th>Email Institutional</th>
                      <th>Email Personal</th>
                      <th>Teléfono</th>
                      <th>Whatsapp</th>
                      <th>Emitir Constancia de Ponente</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let docente of selectedCourse.docentes">
                      <td *ngIf="selectedCourse.course_type === 'CURSO_EDUCATIVO'" class="checkbox-col">
                        <input type="checkbox"
                               [checked]="isDocenteRecipientSelected(docente.id)"
                               (change)="toggleDocenteCompetencyRecipient(docente.id, $event)">
                      </td>
                      <td>{{ docente.especialidad || 'N/A' }}</td>
                      <td>{{ docente.full_name }}</td>
                      <td>{{ docente.institutional_email }}</td>
                      <td>{{ docente.personal_email }}</td>
                      <td>{{ docente.telefono || 'N/A' }}</td>
                      <td>{{ docente.whatsapp || 'N/A' }}</td>
                      <td>
                        <div class="send-actions">
                          <button class="secondary-btn small-btn" (click)="issueDocenteCertificate(docente.id, false)">Normal</button>
                          <button *ngIf="selectedCourse.course_type === 'CURSO_EDUCATIVO'" class="primary-btn small-btn" (click)="issueDocenteCertificate(docente.id, true)">Competencias</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="data-table">
                <h3 class="table-title">Participantes</h3>
                <table>
                  <thead>
                    <tr>
                      <th *ngIf="selectedCourse.course_type === 'CURSO_EDUCATIVO'" class="checkbox-col">
                        <input type="checkbox"
                               [checked]="areAllCompetencyRecipientsSelected"
                               (change)="toggleAllCompetencyRecipients($event)"
                               title="Seleccionar Todos">
                      </th>
                      <th>Nombre</th>
                      <th>Email Personal</th>
                      <th>Email Institucional</th>
                      <th>Teléfono</th>
                      <th>WhatsApp</th>
                      <th>Acciones</th>
                      <th>Emitir Constancia Individual</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let p of courseParticipants">
                      <td *ngIf="selectedCourse.course_type === 'CURSO_EDUCATIVO'" class="checkbox-col">
                        <input type="checkbox"
                               [checked]="isRecipientSelected(p.id)"
                               (change)="toggleCompetencyRecipient(p.id, $event)">
                      </td>
                      <td>{{ p.full_name }}</td>
                      <td>{{ p.personal_email }}</td>
                      <td>{{ p.institutional_email }}</td>
                      <td>{{ p.telefono || 'N/A' }}</td>
                      <td>{{ p.whatsapp || 'N/A' }}</td>
                      <td>
                        <button class="icon-btn delete" (click)="removeParticipantFromCourse(p.id)" title="Eliminar del curso">
                          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                      </td>
                      <td>
                        <div class="send-actions">
                          <button class="secondary-btn small-btn" (click)="issueCertificate(p.id, false)">Normal</button>
                          <button *ngIf="selectedCourse.course_type === 'CURSO_EDUCATIVO'" class="primary-btn small-btn" (click)="issueCertificate(p.id, true)">Competencias</button>
                        </div>
                      </td>
                    </tr>
                    <tr *ngIf="courseParticipants.length === 0">
                      <td [attr.colspan]="selectedCourse.course_type === 'CURSO_EDUCATIVO' ? 7 : 6" class="no-data">No hay participantes inscritos.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
           </div>
         </div>
       </div>

       <div *ngIf="showCompetenciesModal" class="modal-overlay" (click)="showCompetenciesModal = false">
         <div class="modal-content" (click)="$event.stopPropagation()">
           <div class="modal-header">
             <h2>Gestionar Competencias del Curso</h2>
             <button class="close-btn" (click)="showCompetenciesModal = false">
               <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
             </button>
           </div>
           <div class="modal-body">
             <p class="modal-instructions">Define un máximo de {{ maxCompetencies }} competencias que se evaluarán en este curso.</p>
             <div class="form-grid-modal">
               <div class="form-group" *ngFor="let comp of competenciesList; let i = index; trackBy: trackByIndex">
                 <label>Competencia {{i + 1}}</label>
                 <input type="text" [(ngModel)]="competenciesList[i]" name="competencia-{{i}}" placeholder="Ej: Interpreta y transforma datos...">
               </div>
             </div>
           </div>
           <div class="modal-footer">
             <button type="button" class="secondary-btn" (click)="showCompetenciesModal = false">Cancelar</button>
             <button type="button" class="primary-btn icon-left" (click)="saveCompetencies()">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
               Guardar Competencias
             </button>
           </div>
         </div>
       </div>

     </div>
  `,
  styles: [`
    /* General Styles & Layout */
    .module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .module-header h2 { color: #1e293b; margin: 0; font-size: 28px; font-weight: 600; }
    .header-actions { display: flex; align-items: center; gap: 16px; }
    .search-container { position: relative; }
    .search-container input { padding: 10px 10px 10px 35px; border-radius: 8px; border: 1px solid #e2e8f0; width: 250px; transition: all 0.2s; }
    .search-container input:focus { border-color: #667eea; outline: none; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; }

    /* Form Styles */
    .form-card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
    .form-card h3, .form-card h4 { color: #1e293b; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; }
    .form-card.compact { padding: 20px; margin-top: 0; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
    .form-group { display: flex; flex-direction: column; }
    .form-group.full-width { grid-column: 1 / -1; }
    .form-group label { color: #374151; font-weight: 600; margin-bottom: 8px; font-size: 14px; }
    .form-group input, .form-group select, .form-group textarea { padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; transition: border-color 0.2s; }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #667eea; }
    .form-group input:disabled { background-color: #f3f4f6; cursor: not-allowed; }
    .form-actions { display: flex; gap: 12px; grid-column: 1 / -1; margin-top: 8px; justify-content: flex-end;}

    /* Docentes Selection in Form */
    .docentes-selection { border: 2px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #f9fafb; }
    .docentes-checkboxes { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
    .checkbox-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px; background: white; border-radius: 6px; border: 1px solid #e2e8f0; }
    .checkbox-item input[type="checkbox"] { margin-top: 2px; transform: scale(1.2); }
    .checkbox-item label { margin: 0; cursor: pointer; flex: 1; font-weight: 500; color: #1f2937; }
    .checkbox-item label small { display: block; color: #6b7280; font-weight: normal; font-size: 12px; margin-top: 2px; }
    
    /* Button Styles */
    .primary-btn, .secondary-btn { border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
    .primary-btn { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .primary-btn:hover { transform: translateY(-1px); }
    .secondary-btn { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
    .secondary-btn:hover { background: #e2e8f0; }
    .secondary-btn.icon-left svg { margin-right: 8px; }
    
    /* Category Section */
    .category-section { margin-bottom: 32px; }
    .category-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .category-header h3 { color: #374151; font-size: 22px; font-weight: 600; }

    /* Course Card Styles */
    .courses-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
    .course-card { background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
    .course-card:hover { transform: translateY(-4px); box-shadow: 0 8px 16px rgba(0,0,0,0.12); }
    .course-card-header { padding: 20px; color: white; position: relative; }
    .course-name { font-size: 20px; font-weight: 600; margin: 0 0 4px 0; }
    .course-code { font-size: 14px; opacity: 0.9; }
    .course-avatar { width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: white; position: absolute; top: 20px; right: 20px; border: 2px solid white; }
    .course-card-body { padding: 20px; flex-grow: 1; }
    .detail-item { display: flex; align-items: flex-start; gap: 8px; color: #64748b; font-size: 14px; margin-bottom: 12px; }
    .detail-item.docentes { flex-direction: column; align-items: flex-start; }
    .detail-item strong { color: #1e293b; font-weight: 600; }
    .docentes-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .docente-tag-small { background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
    .no-docentes-small { color: #9ca3af; font-style: italic; font-size: 13px; }
    .course-card-footer { padding: 12px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 8px; }
    .icon-btn-card { width: 32px; height: 32px; border: none; border-radius: 50%; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; color: #6b7280; background: transparent; }
    .icon-btn-card:hover { background: rgba(0,0,0,0.05); }
    
    /* Modal Styles */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); width: 90%; max-width: 1250px; max-height: 90vh; display: flex; flex-direction: column; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e2e8f0; }
    .modal-header h2 { margin: 0; font-size: 22px; color: #1e293b;}
    .close-btn { background: none; border: none; cursor: pointer; padding: 5px; color: #64748b; }
    .close-btn:hover { color: #ef4444; }
    .modal-body { padding: 20px; overflow-y: auto; flex-grow: 1; }
    .modal-actions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; align-items: start; margin-bottom: 24px; }
    .form-card.compact h4 { font-size: 16px; margin-bottom: 16px; }
    .add-participant-section, .upload-section { margin-bottom: 12px; }
    .upload-section { display: flex; align-items: center; gap: 10px; }
    .upload-section span { font-size: 12px; color: #64748b; }
    .form-card.nested-form { padding: 16px; margin-top: 12px; background-color: #f8fafc; border-radius: 8px; }
    .bulk-actions { display: flex; flex-direction: column; gap: 12px; }
    .bulk-actions p { font-size: 14px; color: #475569; margin-top: 8px; }
    .bulk-actions button { width: 100%; justify-content: center; }

    /* Data Table Styles */
    .data-table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
    .data-table .table-title { font-size: 18px; color: #374151; padding: 16px; background: #f8fafc; margin: 0; border-bottom: 1px solid #e2e8f0;}
    .data-table table { width: 100%; }
    .data-table th, .data-table td { text-align: left; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    .data-table th { background-color: #f8fafc; color: #374151; font-weight: 600; font-size: 14px; }
    .data-table tbody tr:last-child td { border-bottom: none; }
    .no-data { text-align: center; padding: 32px; color: #9ca3af; font-style: italic; }
    .icon-btn { padding: 8px; border-radius: 6px; border:none; display:inline-flex; align-items:center; justify-content:center; }
    .icon-btn.delete { color: #ef4444; background: #fee2e2; }
    .icon-btn.delete:hover:not(:disabled) { background: #fca5a5; }
    .send-actions { display: flex; gap: 8px; }
    .small-btn { padding: 6px 12px; font-size: 12px; }
    .icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .data-table .checkbox-col { width: 40px; text-align: center; padding-left: 16px; padding-right: 0; }
    .data-table .checkbox-col input { transform: scale(1.3); cursor: pointer; }
    
    /* Modal para Competencias */
    .modal-instructions { margin-bottom: 24px; color: #64748b; font-size: 15px; background-color: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .form-grid-modal { display: grid; grid-template-columns: 1fr; gap: 16px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 20px; border-top: 1px solid #e2e8f0; background: #f8fafc; }
    
    .scrollable-content {
      max-height: 55vh;
      overflow-y: auto;
      padding-right: 10px;
    }
  `]
})
export class AdminCoursesComponent implements OnInit {
  private http = inject(HttpClient);
  private certificateService = inject(CertificateService);

  courses: CourseDTO[] = [];
  filteredCourses: CourseDTO[] = [];
  participants: ParticipantDTO[] = [];
  docentes: DocenteDTO[] = [];

  selectedCourse: CourseDTO | null = null;
  courseParticipants: ParticipantDTO[] = [];
  showAddParticipantForm = false;
  participantToAdd: number | null = null;
  selectedFile: File | null = null;

  showCompetenciesModal = false;
  maxCompetencies: number = 4;
  competenciesList: string[] = [];

  showCourseForm = false;
  editingCourse: CourseDTO | null = null;
  selectedDocenteIds: number[] = [];

  courseForm!: CreateCourseDTO;
  searchTerm: string = '';

  pildoras: CourseDTO[] = [];
  inyecciones: CourseDTO[] = [];
  cursos: CourseDTO[] = [];

  showAllPildoras = false;
  showAllInyecciones = false;
  showAllCursos = false;

  competencyRecipients = new Set<number>();
  docenteCompetencyRecipients = new Set<number>();

  constructor() {
    this.resetCourseForm();
  }

  ngOnInit() {
    this.loadInitialData();
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0] ?? null;
  }

  uploadParticipants(): void {
    if (!this.selectedFile || !this.selectedCourse) {
      alert('Por favor, seleccione un archivo y un producto educativo.');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile, this.selectedFile.name);

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.post<ParticipantDTO[]>(`http://127.0.0.1:8000/api/admin/courses/${this.selectedCourse.id}/upload-participants/`, formData, { headers })
      .subscribe({
        next: (newlyEnrolled) => {
          alert(`${newlyEnrolled.length} participantes han sido inscritos exitosamente.`);
          this.loadParticipantsForCourse(this.selectedCourse!.id);
          this.selectedFile = null;
        },
        error: (err) => {
          console.error('Error al subir el archivo:', err);
          alert(`Error al subir el archivo: ${err.error?.detail || 'Error desconocido'}`);
        }
      });
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

  getDocente(docenteId: number): DocenteDTO | undefined {
    return this.docentes.find(d => d.id === docenteId)
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
    this.competencyRecipients.clear();
    this.docenteCompetencyRecipients.clear();
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

  loadInitialData() {
    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<CourseDTO[]>('http://127.0.0.1:8000/api/admin/courses', { headers }).subscribe(data => {
      this.courses = data.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
      this.categorizeCourses();
      this.filterCourses();
    });
    this.http.get<DocenteDTO[]>('http://127.0.0.1:8000/api/admin/docentes', { headers }).subscribe(data => this.docentes = data);
    this.http.get<ParticipantDTO[]>('http://127.0.0.1:8000/api/admin/participants', { headers }).subscribe(data => this.participants = data);
  }

  categorizeCourses() {
    this.pildoras = this.courses.filter(c => c.course_type === 'PILDORA_EDUCATIVA');
    this.inyecciones = this.courses.filter(c => c.course_type === 'INYECCION_EDUCATIVA');
    this.cursos = this.courses.filter(c => c.course_type === 'CURSO_EDUCATIVO');
  }

  filterCourses() {
    this.filteredCourses = this.courses.filter(course =>
      course.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  loadParticipantsForCourse(courseId: number) {
    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };
    this.http.get<ParticipantDTO[]>(`http://127.0.0.1:8000/api/admin/courses/${courseId}/participants`, { headers })
      .subscribe(data => this.courseParticipants = data);
  }

  getInitialCourseForm(): CreateCourseDTO { return { code: '', name: '', start_date: '', end_date: '', hours: 0, created_by: 2, course_type: 'CURSO_EDUCATIVO', docente_ids: [], competencies: '' }; }

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
        alert('Producto educativo creado exitosamente');
        this.loadInitialData();
        this.cancelCourseForm();
      },
      error: (err: any) => {
        console.error('Error creating course:', err);
        const errorDetail = err.error?.detail;
        if (Array.isArray(errorDetail)) {
          const formattedError = errorDetail.map(e => `Campo: ${e.loc[1]}, Mensaje: ${e.msg}`).join('\n');
          alert(`Error de validación:\n${formattedError}`);
        } else {
          alert(`Error al crear el producto educativo: ${errorDetail || 'Error desconocido'}`);
        }
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
      competencies: course.competencies || '',
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
      competencies: this.courseForm.competencies,
      course_type: this.courseForm.course_type,
      modality: this.courseForm.modality,
      docente_ids: this.selectedDocenteIds
    };

    this.http.put(`http://127.0.0.1:8000/api/admin/courses/${this.editingCourse.id}`, updateData, { headers }).subscribe({
      next: () => {
        alert('Producto educativo actualizado exitosamente');
        this.loadInitialData();
        this.cancelCourseForm();
      },
      error: (err: any) => {
        console.error('Error updating educated product:', err);
        const errorDetail = err.error?.detail;
        if (Array.isArray(errorDetail)) {
          const formattedError = errorDetail.map(e => `Campo: ${e.loc[1]}, Mensaje: ${e.msg}`).join('\n');
          alert(`Error de validación:\n${formattedError}`);
        } else {
          alert(`Error al actualizar el producto educativo: ${errorDetail || 'Error desconocido'}`);
        }
      }
    });
  }

  deleteCourse(courseId: number) {
    const confirmation = confirm('¿Está seguro de eliminar el producto educativo? Esto podría eliminar datos de los certificados.');
    if (confirmation) {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      this.http.delete(`http://127.0.0.1:8000/api/admin/courses/${courseId}`, { headers }).subscribe({
        next: () => {
          alert('Producto educativo eliminado exitosamente');
          this.loadInitialData();
        },
        error: (err) => {
          console.error('Error deleting course:', err);
          alert(`Error al eliminar este producto educativo: ${err.error?.detail || 'Error desconocido'}`);
        }
      });
    }
  }

  enrollParticipant() {
    if (!this.participantToAdd || !this.selectedCourse) return;

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
        error: (err: any) => {
          console.error('Error enrolling participant', err);
          alert(`Error:${err.error?.detail || 'No se pudo inscribir al participante.'}`);
        }
      });
  }

  removeParticipantFromCourse(participantId: number) {
    if (!this.selectedCourse) return;
    if (!confirm('¿Está seguro que desea eliminar este participante de este producto educativo?')) return;

    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.delete(`http://127.0.0.1:8000/api/admin/courses/${this.selectedCourse.id}/enroll/${participantId}`, { headers })
      .subscribe({
        next: () => {
          alert('El participante ha sido eliminado exitosamente de este producto educativo.');
          this.loadParticipantsForCourse(this.selectedCourse!.id);
        },
        error: (err: any) => {
          console.error('Error al eliminar el participante de este producto educativo:', err);
          alert(`Error:${err.error?.detail || 'No se pudo desinscribir al participante.'}`);
        }
      });
  }

  issueCertificate(participantId: number, withCompetencies: boolean) {
    if (!this.selectedCourse) return;

    let kind: CreateCertificateDTO['kind'];

    switch (this.selectedCourse.course_type) {
      case 'PILDORA_EDUCATIVA': kind = 'PILDORA_PARTICIPANTE'; break;
      case 'INYECCION_EDUCATIVA': kind = 'INYECCION_PARTICIPANTE'; break;
      case 'CURSO_EDUCATIVO':
        kind = withCompetencies ? 'CURSO_COMPETENCIAS_PARTICIPANTE' : 'CURSO_PARTICIPANTE';
        break;
      default: alert('Tipo de producto educativo no reconocido.'); return;
    }

    const payload: CertificateIssueRequest = {
      course_id: this.selectedCourse.id,
      entity_id: participantId,
      kind: kind,
    };

    this.certificateService.issueForParticipant(payload).subscribe({
      next: (res) => { alert(`Constancia emitida para ${res.participant_name}. Serial: ${res.serial}`); },
      error: (err) => {
        console.error('Error issuing certificate:', err);
        alert(`Error al emitir la constancia: ${err.error?.detail || 'Error desconocido'}`);
      }
    });
  }

  issueDocenteCertificate(docenteId: number, withCompetencies: boolean) {
    if (!this.selectedCourse) return;

    const docente = this.selectedCourse.docentes?.find(d => d.id === docenteId);
    if (!docente) {
      alert('No se encontró al docente.');
      return;
    }

    let kind: string;
      switch (this.selectedCourse.course_type) {
      case 'PILDORA_EDUCATIVA': kind = 'PILDORA_PONENTE'; break;
      case 'INYECCION_EDUCATIVA': kind = 'INYECCION_PONENTE'; break;
      case 'CURSO_EDUCATIVO':
        kind = withCompetencies ? 'CURSO_COMPETENCIAS_PONENTE' : 'CURSO_PONENTE';
        break;
      default: alert('Tipo de producto educativo no reconocido para constancia de ponente.'); return;
    }

    const payload: CertificateIssueRequest = {
      course_id: this.selectedCourse.id,
      entity_id: docente.id,
      kind: kind,
    }; 

    this.certificateService.issueForDocente(payload).subscribe({
      next: (res) => { alert(`Constancia de ponente emitida para ${docente.full_name}. Serial: ${res.serial}`); },
      error: (err) => {
        console.error('Error al emitir constancia de ponente:', err);
        alert(`Error: ${err.error?.detail || 'No se pudo emitir la constancia.'}`);
      }
    });
  }

  issueAndNotifyBulk(withCompetencies: boolean): void {
    if (!this.selectedCourse) return;

    let participantIds: number[] = [];
    let docenteIds: number[] = [];
    let confirmationMessage: string = '';

    if (withCompetencies) {
      if (this.competencyRecipients.size === 0 && this.docenteCompetencyRecipients.size === 0) {
        alert('Por favor, seleccione al menos un participante o docente.');
        return;
      }
      participantIds = Array.from(this.competencyRecipients);
      docenteIds = Array.from(this.docenteCompetencyRecipients);
      confirmationMessage = `Se emitirán constancias DE COMPETENCIAS para ${participantIds.length} participante(s) y ${docenteIds.length} docente(s) seleccionados. ¿Desea continuar?`;
    } else {
      if (this.courseParticipants.length === 0 && (!this.selectedCourse.docentes || this.selectedCourse.docentes.length === 0)) {
        alert('No hay participantes o docentes en este curso para emitir constancias.');
        return;
      }
      participantIds = this.courseParticipants.map(p => p.id);
      docenteIds = this.selectedCourse.docentes?.map(d => d.id) || [];
      confirmationMessage = `Se emitirán constancias NORMALES para todos los ${participantIds.length} participante(s) y ${docenteIds.length} docente(s) de este curso. ¿Desea continuar?`;
    }

    if (confirm(confirmationMessage)) {
      this.certificateService.issueBulk(this.selectedCourse.id, participantIds, docenteIds, withCompetencies).subscribe({
        next: (response: BulkIssueResponse) => {
          alert(response.message);
          if (response.errors && response.errors.length > 0) {
            console.error('Errores durante la emisión masiva:', response.errors);
          }
          // Si no hubo errores fatales, preparamos el correo
          if (response.issued > 0) {
            this.sendNotificationEmail(participantIds, docenteIds);
          }
        },
        error: (err: any) => {
          console.error('Error en la emisión masiva:', err);
          alert(`Error al procesar la solicitud: ${err.error?.detail || 'Error desconocido'}`);
        }
      });
    }
  }

  sendNotificationEmail(participantIds: number[], docenteIds: number[]) {
    if (!this.selectedCourse) return;

    const subject = `Constancia disponible del producto educativo "${this.selectedCourse.name}"`;
    const emailBody = `
      <h1>¡Hola!</h1>
      <p>Te informamos que tu constancia para el producto educativo "${this.selectedCourse.name}" ha sido generada.</p>
      <p>Puedes verificarla y descargarla utilizando el código QR que se te proporcionará o a través del portal de validación de LANIA.</p>
      <p>Atentamente,<br>El equipo de LANIA</p>
    `;

    const participantEmails = this.participants
      .filter(p => participantIds.includes(p.id))
      .map(p => p.personal_email);

    const docenteEmails = this.docentes
      .filter(d => docenteIds.includes(d.id))
      .map(d => d.institutional_email);

    const allEmails = [...new Set([...participantEmails, ...docenteEmails])];

    if (allEmails.length === 0) {
      alert('No hay destinatarios con correos electrónicos para notificar.');
      return;
    }

    const mailtoLink = `mailto:${allEmails.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoLink, '_blank');
  }

  openCompetenciesModal() {
    const currentCompetencies = this.courseForm.competencies?.split('\n').filter(c => c) || [];
    this.competenciesList = Array(this.maxCompetencies).fill('').map((_, i) => currentCompetencies[i] || '');
    this.showCompetenciesModal = true;
  }

  saveCompetencies() {
    this.courseForm.competencies = this.competenciesList.filter(c => c && c.trim()).join('\n');
    this.showCompetenciesModal = false;
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  toggleAllCompetencyRecipients(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      this.courseParticipants.forEach(p => this.competencyRecipients.add(p.id));
    } else {
      this.competencyRecipients.clear();
    }
  }

  isRecipientSelected(participantId: number): boolean {
    return this.competencyRecipients.has(participantId);
  }

  get areAllCompetencyRecipientsSelected(): boolean {
    if (this.courseParticipants.length === 0) return false;
    return this.competencyRecipients.size === this.courseParticipants.length;
  }

  toggleCompetencyRecipient(participantId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      this.competencyRecipients.add(participantId);
    } else {
      this.competencyRecipients.delete(participantId);
    }
  }

  toggleDocenteCompetencyRecipient(docenteId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      this.docenteCompetencyRecipients.add(docenteId);
    } else {
      this.docenteCompetencyRecipients.delete(docenteId);
    }
  }

  isDocenteRecipientSelected(docenteId: number): boolean {
    return this.docenteCompetencyRecipients.has(docenteId);
  }

  get areAllDocenteRecipientsSelected(): boolean {
    if (!this.selectedCourse?.docentes || this.selectedCourse.docentes.length === 0) return false;
    return this.docenteCompetencyRecipients.size === this.selectedCourse.docentes.length;
  }

  toggleAllDocenteRecipients(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      this.selectedCourse?.docentes?.forEach(d => this.docenteCompetencyRecipients.add(d.id));
    } else {
      this.docenteCompetencyRecipients.clear();
    }
  }
}