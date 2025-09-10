// frontend/lania-ui/src/app/features/dashboard/admin-courses.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CourseDTO, CreateCourseDTO, UpdateCourseDTO } from '../../shared/interfaces/course.interfaces';
import { DocenteDTO } from '../../shared/interfaces/docente.interfaces';
import { ParticipantDTO } from '../../shared/interfaces/participant.interfaces';
import { NotificationService } from '../../shared/services/notification.service';

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
          <div class="form-group full-width">
            <label>Docentes Asignados</label>
            <div class="docentes-selection">
              <div class="docentes-checkboxes">
                <div class="checkbox-item" *ngFor="let docente of activeDocentes">
                  <input type="checkbox" [id]="'docente-' + docente.id" [checked]="isDocenteSelected(docente.id)" (change)="toggleDocenteSelection(docente.id, $event)">
                  <label [for]="'docente-' + docente.id">
                    {{docente.full_name}} <small>({{docente.email}})</small>
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
          <div class="category-header">
            <h3>Píldoras Educativas</h3>
            <button class="view-more-btn" (click)="showAllPildoras = !showAllPildoras">{{ showAllPildoras ? 'Ver menos' : 'Ver más' }}</button>
          </div>
          <div class="courses-grid">
            <div class="course-card" *ngFor="let course of showAllPildoras ? pildoras : pildoras.slice(0, 3)" (click)="selectCourse(course)">
              <div class="course-card-header" [style.backgroundColor]="getCourseColor(course.id)">
                <h3 class="course-name">{{ course.name }}</h3>
                <p class="course-code">{{ course.code }}</p>
                <div class="course-avatar" [style.backgroundColor]="getAvatarColor(course.id)">{{ course.name.charAt(0) }}</div>
              </div>
              <div class="course-card-body">
                <div class="detail-item"><strong>Tipo:</strong> {{ course.course_type.replace('_', ' ') }}</div>
                <div class="detail-item"><strong>Fechas:</strong> {{ course.start_date | date:'dd/MM/yy' }} - {{ course.end_date | date:'dd/MM/yy' }}</div>
                <div class="detail-item"><strong>Horas:</strong> {{ course.hours }}h</div>
                <div class="detail-item docentes">
                  <strong>Docente(s):</strong>
                  <div *ngIf="course.docentes && course.docentes.length > 0; else noDocentes" class="docentes-list">
                    <span *ngFor="let docente of course.docentes" class="docente-tag-small">{{ docente.full_name }}</span>
                  </div>
                  <ng-template #noDocentes><span class="no-docentes-small">No asignados</span></ng-template>
                </div>
              </div>
              <div class="course-card-footer">
                <button class="icon-btn-card edit" (click)="editCourse(course); $event.stopPropagation()" title="Editar Curso"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
                <button class="icon-btn-card delete" (click)="deleteCourse(course.id); $event.stopPropagation()" title="Eliminar Curso"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
              </div>
            </div>
          </div>
        </div>
        <div class="category-section">
          <div class="category-header">
            <h3>Inyecciones Educativas</h3>
            <button class="view-more-btn" (click)="showAllInyecciones = !showAllInyecciones">{{ showAllInyecciones ? 'Ver menos' : 'Ver más' }}</button>
          </div>
          <div class="courses-grid">
            <div class="course-card" *ngFor="let course of showAllInyecciones ? inyecciones : inyecciones.slice(0, 3)" (click)="selectCourse(course)">
              <div class="course-card-header" [style.backgroundColor]="getCourseColor(course.id)">
                <h3 class="course-name">{{ course.name }}</h3>
                <p class="course-code">{{ course.code }}</p>
                <div class="course-avatar" [style.backgroundColor]="getAvatarColor(course.id)">{{ course.name.charAt(0) }}</div>
              </div>
              <div class="course-card-body">
                <div class="detail-item"><strong>Tipo:</strong> {{ course.course_type.replace('_', ' ') }}</div>
                <div class="detail-item"><strong>Fechas:</strong> {{ course.start_date | date:'dd/MM/yy' }} - {{ course.end_date | date:'dd/MM/yy' }}</div>
                <div class="detail-item"><strong>Horas:</strong> {{ course.hours }}h</div>
                <div class="detail-item docentes">
                  <strong>Docente(s):</strong>
                  <div *ngIf="course.docentes && course.docentes.length > 0; else noDocentes" class="docentes-list">
                    <span *ngFor="let docente of course.docentes" class="docente-tag-small">{{ docente.full_name }}</span>
                  </div>
                  <ng-template #noDocentes><span class="no-docentes-small">No asignados</span></ng-template>
                </div>
              </div>
              <div class="course-card-footer">
                <button class="icon-btn-card edit" (click)="editCourse(course); $event.stopPropagation()" title="Editar Curso"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
                <button class="icon-btn-card delete" (click)="deleteCourse(course.id); $event.stopPropagation()" title="Eliminar Curso"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
              </div>
            </div>
          </div>
        </div>
        <div class="category-section">
          <div class="category-header">
            <h3>Cursos Educativos</h3>
            <button class="view-more-btn" (click)="showAllCursos = !showAllCursos">{{ showAllCursos ? 'Ver menos' : 'Ver más' }}</button>
          </div>
          <div class="courses-grid">
            <div class="course-card" *ngFor="let course of showAllCursos ? cursos : cursos.slice(0, 3)" (click)="selectCourse(course)">
              <div class="course-card-header" [style.backgroundColor]="getCourseColor(course.id)">
                <h3 class="course-name">{{ course.name }}</h3>
                <p class="course-code">{{ course.code }}</p>
                <div class="course-avatar" [style.backgroundColor]="getAvatarColor(course.id)">{{ course.name.charAt(0) }}</div>
              </div>
              <div class="course-card-body">
                <div class="detail-item"><strong>Tipo:</strong> {{ course.course_type.replace('_', ' ') }}</div>
                <div class="detail-item"><strong>Fechas:</strong> {{ course.start_date | date:'dd/MM/yy' }} - {{ course.end_date | date:'dd/MM/yy' }}</div>
                <div class="detail-item"><strong>Horas:</strong> {{ course.hours }}h</div>
                <div class="detail-item docentes">
                  <strong>Docente(s):</strong>
                  <div *ngIf="course.docentes && course.docentes.length > 0; else noDocentes" class="docentes-list">
                    <span *ngFor="let docente of course.docentes" class="docente-tag-small">{{ docente.full_name }}</span>
                  </div>
                  <ng-template #noDocentes><span class="no-docentes-small">No asignados</span></ng-template>
                </div>
              </div>
              <div class="course-card-footer">
                <button class="icon-btn-card edit" (click)="editCourse(course); $event.stopPropagation()" title="Editar Curso"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
                <button class="icon-btn-card delete" (click)="deleteCourse(course.id); $event.stopPropagation()" title="Eliminar Curso"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="searchTerm.length > 0" class="courses-grid">
        <div class="course-card" *ngFor="let course of filteredCourses" (click)="selectCourse(course)">
           <div class="course-card-header" [style.backgroundColor]="getCourseColor(course.id)">
            <h3 class="course-name">{{ course.name }}</h3>
            <p class="course-code">{{ course.code }}</p>
            <div class="course-avatar" [style.backgroundColor]="getAvatarColor(course.id)">{{ course.name.charAt(0) }}</div>
          </div>
          <div class="course-card-body">
            <div class="detail-item"><strong>Tipo:</strong> {{ course.course_type.replace('_', ' ') }}</div>
            <div class="detail-item"><strong>Fechas:</strong> {{ course.start_date | date:'dd/MM/yy' }} - {{ course.end_date | date:'dd/MM/yy' }}</div>
            <div class="detail-item"><strong>Horas:</strong> {{ course.hours }}h</div>
            <div class="detail-item docentes">
              <strong>Docente(s):</strong>
              <div *ngIf="course.docentes && course.docentes.length > 0; else noDocentes" class="docentes-list">
                <span *ngFor="let docente of course.docentes" class="docente-tag-small">{{ docente.full_name }}</span>
              </div>
              <ng-template #noDocentes><span class="no-docentes-small">No asignados</span></ng-template>
            </div>
          </div>
          <div class="course-card-footer">
            <button class="icon-btn-card edit" (click)="editCourse(course); $event.stopPropagation()" title="Editar Curso"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
            <button class="icon-btn-card delete" (click)="deleteCourse(course.id); $event.stopPropagation()" title="Eliminar Curso"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
          </div>
        </div>
      </div>

      <div *ngIf="selectedCourse" class="modal-overlay" (click)="unselectCourse()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Participantes en {{ selectedCourse.name }}</h2>
            <button class="close-btn" (click)="unselectCourse()">
              <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="modal-actions">
              <div class="add-participant-section">
                  <button class="primary-btn" (click)="showAddParticipantForm = !showAddParticipantForm">Añadir Participante Manualmente</button>
                  <div *ngIf="showAddParticipantForm" class="form-card compact">
                    <form (ngSubmit)="enrollParticipant()" class="add-participant-form">
                      <div class="form-group">
                        <label>Seleccionar Participante</label>
                        <select [(ngModel)]="participantToAdd" name="participant_id" required>
                          <option [ngValue]="null" disabled>-- Elige un participante --</option>
                          <option *ngFor="let p of availableParticipants" [value]="p.id">{{ p.full_name }} ({{p.email}}) ({{p.phone}})</option>
                        </select>
                      </div>
                      <div class="form-actions">
                        <button type="button" class="secondary-btn" (click)="showAddParticipantForm = false">Cancelar</button>
                        <button type="submit" class="primary-btn" [disabled]="!participantToAdd">Inscribir</button>
                      </div>
                    </form>
                  </div>
              </div>
              <div class="upload-section form-card compact">
                  <h4>Importar Participantes desde Archivo</h4>
                  <div class="form-group">
                      <label>Seleccionar archivo (CSV/Excel)</label>
                      <input type="file" (change)="onFileSelected($event)" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel">
                  </div>
                  <div class="form-actions">
                      <button class="primary-btn" (click)="uploadParticipants()" [disabled]="!selectedFile">Subir Archivo</button>
                  </div>
              </div>
              <div class="send-all-section">
                  <button class="secondary-btn" (click)="sendAllCertificates(selectedCourse.id)">Notificar a todos los Participantes</button>
              </div>
            </div>

            <div class="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Nombre Completo</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Acciones</th>
                    <th>Enviar Constancia</th>
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
                    <td>
                      <div class="send-actions">
                        <button class="icon-btn email" (click)="sendCertificate(p, 'email')" title="Enviar por Email">
                          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                        </button>
                        <button class="icon-btn whatsapp" (click)="sendCertificate(p, 'whatsapp')" [disabled]="!p.phone" title="Notificar por WhatsApp">
                           <svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" d="M16.75 13.96c.25.13.41.2.46.3.06.11.04.61-.21 1.18-.2.56-1.24 1.1-1.7 1.12-.46.02-1.06-.21-1.57-.46-.51-.25-1.33-.8-1.93-1.4-1.13-1.1-1.9-2.45-2.03-2.78-.13-.33-.56-.48-.56-.48s-.18-.02-.38-.02c-.2 0-.46.02-.63.02s-.41.04-.63.48c-.22.44-.82 1.93-.82 1.93s-.25.41-.53.41c-.28 0-.78-.13-.78-.13s-1.33-.56-2.28-1.5c-.94-.94-1.56-2.2-1.56-2.2s-.11-.25-.11-.53c0-.28.13-.41.13-.41s.23-.25.33-.38c.11-.13.2-.2.28-.35.08-.15.11-.33 0-.53-.11-.2-.28-.53-.38-.7-.11-.18-.25-.38-.25-.38s-.14-.18-.33-.25c-.2-.08-.41-.02-.41-.02s-.48.08-.68.2c-.2.13-.35.33-.46.53-.11.2-.18.44-.18.44s-.23.82 0 1.57c.23.75.87 1.93 2.03 3.1 1.15 1.18 2.5 1.83 3.33 2.03.83.2 1.26.18 1.7.18.44 0 1.33-.23 1.33-.23s.41-.18.68-.44c.28-.25.44-.51.44-.51s.23-.28.33-.56c.11-.28.11-.58.06-.78-.06-.2-.13-.28-.23-.41-.11-.13-.23-.25-.33-.35a.33.33 0 0 1-.08-.44c.08-.13.18-.23.28-.35.1-.13.23-.28.35-.38.13-.11.25-.18.25-.18s.16-.13.44-.04c.28.08.38.38.38.38z"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="courseParticipants.length === 0">
                    <td colspan="5" class="no-data">No hay participantes inscritos.</td>
                  </tr>
                </tbody>
              </table>
            </div>
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
    .form-card.compact { padding: 20px; margin-top: 20px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
    .form-group { display: flex; flex-direction: column; }
    .form-group.full-width { grid-column: 1 / -1; }
    .form-group label { color: #374151; font-weight: 600; margin-bottom: 8px; font-size: 14px; }
    .form-group input, .form-group select { padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; transition: border-color 0.2s; }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: #667eea; }
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
    .primary-btn, .secondary-btn, .view-more-btn { border: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .primary-btn { display: flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .primary-btn:hover { transform: translateY(-1px); }
    .secondary-btn { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
    .secondary-btn:hover { background: #e2e8f0; }
    .view-more-btn { background: none; color: #667eea; padding: 8px 12px; }
    
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
    .icon-btn-card.edit:hover { color: #2563eb; }
    .icon-btn-card.delete:hover { color: #ef4444; }
    
    /* Modal Styles */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); width: 90%; max-width: 1100px; max-height: 90vh; display: flex; flex-direction: column; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e2e8f0; }
    .modal-header h2 { margin: 0; font-size: 22px; color: #1e293b;}
    .close-btn { background: none; border: none; cursor: pointer; padding: 5px; color: #64748b; }
    .close-btn:hover { color: #ef4444; }
    .modal-body { padding: 20px; overflow-y: auto; flex-grow: 1; }
    
    .add-participant-form { display: flex; flex-direction: column; gap: 16px; margin-top: 20px; }
    .add-participant-form .form-actions { justify-content: flex-end; margin-top: 0; }
    .modal-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; margin-bottom: 24px; }
    .send-all-section { grid-column: 1 / -1; }

    /* Data Table Styles */
    .data-table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .data-table table { width: 100%; }
    .data-table th, .data-table td { text-align: left; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; }
    .data-table th { background-color: #f1f5f9; color: #374151; font-weight: 600; font-size: 14px; }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tbody tr:nth-child(even) { background-color: #fdfdfe; }
    .data-table tbody tr:hover { background-color: #f0f4f8; }

    .no-data { text-align: center; padding: 32px; color: #9ca3af; font-style: italic; }
    .icon-btn.delete { background: #fecaca; color: #dc2626; padding: 8px; border-radius: 6px; }
    .icon-btn.delete:hover:not(:disabled) { background: #fca5a5; }

    .send-actions { display: flex; gap: 8px; }
    .icon-btn.email { color: #2563eb; background: #dbeafe; }
    .icon-btn.email:hover { background: #bfdbfe; }
    .icon-btn.whatsapp { color: #16a34a; background: #dcfce7; }
    .icon-btn.whatsapp:hover:not(:disabled) { background: #bbf7d0; }
    .icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class AdminCoursesComponent implements OnInit {
  private http = inject(HttpClient);

  courses: CourseDTO[] = [];
  filteredCourses: CourseDTO[] = [];
  participants: ParticipantDTO[] = [];
  docentes: DocenteDTO[] = [];
  
  selectedCourse: CourseDTO | null = null;
  courseParticipants: ParticipantDTO[] = [];
  showAddParticipantForm = false;
  participantToAdd: number | null = null;
  selectedFile: File | null = null;

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
        alert('Producto educativo creado exitosamente');
        this.loadInitialData();
        this.cancelCourseForm();
      },
      error: (err) => {
        console.error('Error creating course:', err);
        alert(`Error al crear este producto educativo: ${err.error?.detail || 'Error desconocido'}`);
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
        alert('Producto educativo actualizado exitosamente');
        this.loadInitialData();
        this.cancelCourseForm();
      },
      error: (err) => {
        console.error('Error updating educated product:', err);
        alert(`Error al actualizar el producto educativo: ${err.error?.detail || 'Error desconocido'}`);
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
    if (!confirm('¿Está seguro que desea eliminar este participante de este producto educativo')) return;

    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };

    this.http.delete(`http://127.0.0.1:8000/api/admin/courses/${this.selectedCourse.id}/enroll/${participantId}`, { headers })
      .subscribe({
        next: () => {
          alert('El participante  ha sido eliminado exitosamente de este prodcuto educativo exitosamente');
          this.loadParticipantsForCourse(this.selectedCourse!.id);
        },
        error: (err) => {
          console.error('Error al eliminanr el participante de este producto educativo:', err); 
          alert(`Error:${err.error?.detail || 'No se pudo desinscribir al participante.'}` );
        }
      });
  }
  
  sendCertificate(participant: ParticipantDTO, method: 'email' | 'whatsapp') {
    if (!this.selectedCourse) return;
    
    const subject = `Tu constancia del curso "${this.selectedCourse.name}"`;
    const emailBody = `
      <h1>¡Felicidades, ${participant.full_name}!</h1>
      <p>Adjunto encontrarás tu constancia de participación para el producto educativo "${this.selectedCourse.name}".</p>
      <p>Gracias por tu participación.</p>
      <p>Atentamente,<br>El equipo de LANIA</p>
    `;
    const whatsappMessage = `Hola ${participant.full_name}, te informamos que tu constancia para el producto educativo "${this.selectedCourse.name}" ha sido generada y enviada a tu correo electrónico.`;

    if (method === 'email') {
      const mailtoLink = `mailto:${participant.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
      window.open(mailtoLink, '_blank');
    } else if (method === 'whatsapp') {
      if (!participant.phone) {
        alert('Este participante no tiene un número de teléfono registrado.');
        return;
      }
      const whatsappLink = `https://wa.me/${participant.phone}?text=${encodeURIComponent(whatsappMessage)}`;
      window.open(whatsappLink, '_blank');
    }
  }

  sendAllCertificates(courseId: number) {
    if (!this.selectedCourse) return;
    
    const subject = `Tu constancia del curso "${this.selectedCourse.name}"`;
    const emailBody = `
      <h1>¡Felicidades!</h1>
      <p>Adjunto encontrarás tu constancia de participación para el producto educativo "${this.selectedCourse.name}".</p>
      <p>Gracias por tu participación.</p>
      <p>Atentamente,<br>El equipo de LANIA</p>
    `;

    const emails = this.courseParticipants.map(p => p.email).join(',');
    const mailtoLink = `mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoLink, '_blank');
  }
}