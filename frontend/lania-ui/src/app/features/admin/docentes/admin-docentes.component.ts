// src/app/features/dashboard/dashboard.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Services
import { DocenteService } from '../docente/docente.service';
import { CourseService } from '../courses/course.service';
import { ParticipantService } from '../participants/participant.service';
import { CertificateService } from '../certificates/certificate.service';

// Interfaces
import { DocenteDTO, CreateDocenteDTO } from '../../shared/interfaces/docente.interfaces';
import { CourseDTO, CreateCourseDTO } from '../../shared/interfaces/course.interfaces';
import { ParticipantDTO, CreateParticipantDTO } from '../../shared/interfaces/participant.interfaces';
import { CertificateDTO, CreateCertificateDTO } from '../../shared/interfaces/certificate.interfaces';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-container">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-content">
          <div class="logo-section">
            <div class="logo">
              <svg width="40" height="40" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="30" cy="30" r="25" fill="url(#gradient)" stroke="#e74c3c" stroke-width="2"/>
                <text x="30" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold">L</text>
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#e74c3c;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#c0392b;stop-opacity:1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <h1>LANIA - Certificaciones</h1>
              <p>Sistema de Gestión de Certificados</p>
            </div>
          </div>
          <div class="user-section">
            <span>Bienvenido, Admin</span>
            <button (click)="logout()" class="logout-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16,17 21,12 16,7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="dashboard-main">
        <!-- Sidebar -->
        <nav class="sidebar">
          <div class="nav-item" 
               [class.active]="activeModule === 'overview'" 
               (click)="setActiveModule('overview')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9,22 9,12 15,12 15,22"></polyline>
            </svg>
            Dashboard
          </div>
          <div class="nav-item" 
               [class.active]="activeModule === 'docentes'" 
               (click)="setActiveModule('docentes')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="7" r="4"></circle>
              <path d="M5.5 21a7.5 7.5 0 0 1 13 0"></path>
            </svg>
            Docentes
          </div>
          <div class="nav-item" 
               [class.active]="activeModule === 'courses'" 
               (click)="setActiveModule('courses')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            Cursos
          </div>
          <div class="nav-item" 
               [class.active]="activeModule === 'participants'" 
               (click)="setActiveModule('participants')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Participantes
          </div>
          <div class="nav-item" 
               [class.active]="activeModule === 'certificates'" 
               (click)="setActiveModule('certificates')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14,2 14,8 20,8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10,9 9,9 8,9"></polyline>
            </svg>
            Certificados
          </div>
        </nav>

        <!-- Content Area -->
        <div class="content-area">
          <!-- Overview Module -->
          <div *ngIf="activeModule === 'overview'" class="module-content">
            <h2>Panel de Control</h2>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon courses">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                  </svg>
                </div>
                <div class="stat-info">
                  <h3>{{courses.length}}</h3>
                  <p>Cursos Activos</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon participants">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                  </svg>
                </div>
                <div class="stat-info">
                  <h3>{{participants.length}}</h3>
                  <p>Participantes</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon certificates">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                  </svg>
                </div>
                <div class="stat-info">
                  <h3>{{certificates.length}}</h3>
                  <p>Certificados</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon docentes">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="7" r="4"></circle>
                    <path d="M5.5 21a7.5 7.5 0 0 1 13 0"></path>
                  </svg>
                </div>
                <div class="stat-info">
                  <h3>{{docentes.length}}</h3>
                  <p>Docentes</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Docentes Module -->
          <div *ngIf="activeModule === 'docentes'" class="module-content">
            <div class="module-header">
              <h2>Gestión de Docentes</h2>
              <button class="primary-btn" (click)="showDocenteForm = !showDocenteForm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Nuevo Docente
              </button>
            </div>

            <!-- Docente Form -->
            <div *ngIf="showDocenteForm" class="form-card">
              <h3>Registrar Docente</h3>
              <form (ngSubmit)="createDocente()" class="form-grid">
                <div class="form-group">
                  <label>Nombre Completo *</label>
                  <input [(ngModel)]="newDocente.full_name" name="full_name" required>
                </div>
                <div class="form-group">
                  <label>Email *</label>
                  <input type="email" [(ngModel)]="newDocente.email" name="email" required>
                </div>
                <div class="form-group">
                  <label>Contraseña *</label>
                  <input type="password" [(ngModel)]="newDocente.password" name="password" required>
                </div>
                <div class="form-group">
                  <label>Teléfono</label>
                  <input [(ngModel)]="newDocente.telefono" name="telefono" placeholder="Opcional">
                </div>
                <div class="form-group">
                  <label>Especialidad</label>
                  <input [(ngModel)]="newDocente.especialidad" name="especialidad" placeholder="Opcional">
                </div>
                <div class="form-actions">
                  <button type="button" class="secondary-btn" (click)="showDocenteForm = false">Cancelar</button>
                  <button type="submit" class="primary-btn">Crear Docente</button>
                </div>
              </form>
            </div>

            <!-- Docentes Table -->
            <div class="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Especialidad</th>
                    <th>Estado</th>
                    <th>Fecha Registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let docente of docentes">
                    <td>{{docente.full_name}}</td>
                    <td>{{docente.email}}</td>
                    <td>{{docente.telefono || 'N/A'}}</td>
                    <td>{{docente.especialidad || 'N/A'}}</td>
                    <td>
                      <span class="status" [class]="docente.is_active ? 'status-active' : 'status-inactive'">
                        {{docente.is_active ? 'Activo' : 'Inactivo'}}
                      </span>
                    </td>
                    <td>{{docente.fecha_registro | date:'dd/MM/yyyy'}}</td>
                    <td>
                      <button class="icon-btn delete" 
                              (click)="disableDocente(docente.id)" 
                              [disabled]="!docente.is_active"
                              title="Desactivar docente">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18 6L6 18"></path>
                          <path d="M6 6l12 12"></path>
                        </svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Courses Module -->
          <div *ngIf="activeModule === 'courses'" class="module-content">
            <div class="module-header">
              <h2>Gestión de Cursos</h2>
              <button class="primary-btn" (click)="showCourseForm = !showCourseForm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Nuevo Curso
              </button>
            </div>

            <!-- Course Form -->
            <div *ngIf="showCourseForm" class="form-card">
              <h3>Crear Nuevo Curso</h3>
              <form (ngSubmit)="createCourse()" class="form-grid">
                <div class="form-group">
                  <label>Código del Curso</label>
                  <input [(ngModel)]="newCourse.code" name="code" required>
                </div>
                <div class="form-group">
                  <label>Nombre del Curso</label>
                  <input [(ngModel)]="newCourse.name" name="name" required>
                </div>
                <div class="form-group">
                  <label>Fecha de Inicio</label>
                  <input type="date" [(ngModel)]="newCourse.start_date" name="start_date" required>
                </div>
                <div class="form-group">
                  <label>Fecha de Fin</label>
                  <input type="date" [(ngModel)]="newCourse.end_date" name="end_date" required>
                </div>
                <div class="form-group">
                  <label>Horas</label>
                  <input type="number" [(ngModel)]="newCourse.hours" name="hours" required>
                </div>
                <div class="form-group full-width">
                  <label>Docentes Asignados</label>
                  <div class="docentes-selection">
                    <div class="docentes-checkboxes">
                      <div class="checkbox-item" *ngFor="let docente of activeDocentes">
                        <input 
                          type="checkbox" 
                          [id]="'docente-' + docente.id"
                          [checked]="isDocenteSelected(docente.id)"
                          (change)="toggleDocenteSelection(docente.id, $event)"
                        >
                        <label [for]="'docente-' + docente.id">
                          {{docente.full_name}}
                          <small>({{docente.email}})</small>
                        </label>
                      </div>
                    </div>
                    <div class="selected-docentes" *ngIf="selectedDocenteIds.length > 0">
                      <h4>Docentes seleccionados:</h4>
                      <div class="docente-tags">
                        <span class="docente-tag" *ngFor="let docenteId of selectedDocenteIds">
                          {{getDocenteName(docenteId)}}
                          <button type="button" (click)="removeDocente(docenteId)" class="remove-tag">×</button>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="form-actions">
                  <button type="button" class="secondary-btn" (click)="showCourseForm = false">Cancelar</button>
                  <button type="submit" class="primary-btn">Crear Curso</button>
                </div>
              </form>
            </div>

            <!-- Courses Table -->
            <div class="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Horas</th>
                    <th>Docentes</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let course of courses">
                    <td>{{course.code}}</td>
                    <td>{{course.name}}</td>
                    <td>{{course.start_date | date:'dd/MM/yyyy'}</td>
                    <td>{{course.end_date | date:'dd/MM/yyyy'}}</td>
                    <td>{{course.hours}}</td>
                    <td>
                      <div class="course-docentes">
                        <span *ngFor="let docente of course.docentes" class="docente-badge">
                          {{docente.full_name}}
                        </span>
                      </div>
                    </td>
                    <td>
                      <button class="icon-btn delete"
                              (click)="deleteCourse(course.id)"
                              title="Eliminar curso">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18 6L6 18"></path>
                          <path d="M6 6l12 12"></path>
                        </svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <!-- Participants Module -->
          <div *ngIf="activeModule === 'participants'" class="module-content">
            <div class="module-header">
              <h2>Gestión de Participantes</h2>
              <button class="primary-btn" (click)="showParticipantForm = !showParticipantForm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Nuevo Participante
              </button>
            </div>
            <!-- Participant Form -->
            <div *ngIf="showParticipantForm" class="form-card">
              <h3>Registrar Participante</h3>
              <form (ngSubmit)="createParticipant()" class="form-grid">
                <div class="form-group">
                  <label>Nombre Completo *</label>
                  <input [(ngModel)]="newParticipant.full_name" name="full_name" required>
                </div>
                <div class="form-group">
                  <label>Email *</label>
                  <input type="email" [(ngModel)]="newParticipant.email" name="email" required>
                </div>
                <div class="form-group">
                  <label>Contraseña *</label>
                  <input type="password" [(ngModel)]="newParticipant.password" name="password" required>
                </div>
                <div class="form-group">
                  <label>Teléfono</label>
                  <input [(ngModel)]="newParticipant.telefono" name="telefono" placeholder="Opcional">
                </div>
                <div class="form-group">
                  <label>Documento de Identidad</label>
                  <input [(ngModel)]="newParticipant.documento_identidad" name="documento_identidad" placeholder="Opcional">
                </div>
                <div class="form-actions">
                  <button type="button" class="secondary-btn" (click)="showParticipantForm = false">Cancelar</button>
                  <button type="submit" class="primary-btn">Crear Participante</button>
                </div>
              </form>
            </div>

            <!-- Participants Table -->
            <div class="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Documento</th>
                    <th>Estado</th>
                    <th>Fecha Registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let participant of participants">
                    <td>{{participant.full_name}}</td>
                    <td>{{participant.email}}</td>
                    <td>{{participant.telefono || 'N/A'}}</td>
                    <td>{{participant.documento_identidad || 'N/A'}}</td>
                    <td>
                      <span class="status" [class]="participant.is_active ? 'status-active' : 'status-inactive'">
                        {{participant.is_active ? 'Activo' : 'Inactivo'}}
                      </span>
                    </td>
                    <td>{{participant.fecha_registro | date:'dd/MM/yyyy'}}</td>
                    <td>
                      <button class="icon-btn delete"
                              (click)="disableParticipant(participant.id)"
                              [disabled]="!participant.is_active"
                              title="Desactivar participante">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18 6L6 18"></path>
                          <path d="M6 6l12 12"></path>
                        </svg>
                      </button>
                    </td>
                  </tr> 
                </tbody>
              </table>
            </div>
          </div>  
          <!-- Certificates Module -->
          <div *ngIf="activeModule === 'certificates'" class="module-content">
            <div class="module-header">
              <h2>Gestión de Certificados</h2>
              <button class="primary-btn" (click)="showCertificateForm = !showCertificateForm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Nuevo Certificado
              </button>
            </div>
            <!-- Certificate Form -->
            <div *ngIf="showCertificateForm" class="form-card">
              <h3>Crear Nuevo Certificado</h3>
              <form (ngSubmit)="createCertificate()" class="form-grid">
                <div class="form-group">
                  <label>ID del Certificado *</label>
                  <input [(ngModel)]="newCertificate.certificate_id" name="certificate_id" required>
                </div>
                <div class="form-group">
                  <label>Curso *</label>
                  <select [(ngModel)]="newCertificate.course_id" name="course_id" required>
                    <option *ngFor="let course of courses" [value]="course.id">{{course.name}}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Participante *</label>
                  <select [(ngModel)]="newCertificate.participant_id" name="participant_id" required>
                    <option *ngFor="let participant of activeParticipants" [value]="participant.id">{{participant.full_name}}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Fecha de Emisión *</label>
                  <input type="date" [(ngModel)]="newCertificate.issue_date" name="issue_date" required>
                </div>
                <div class="form-group">
                  <label>Fecha de Vencimiento</label>
                  <input type="date" [(ngModel)]="newCertificate.expiry_date" name="expiry_date" placeholder="Opcional"> 
                </div>
                <div class="form-actions">
                  <button type="button" class="secondary-btn" (click)="showCertificateForm = false">Cancelar</button>
                  <button type="submit" class="primary-btn">Crear Certificado</button>
                </div>
              </form>
            </div>
            <!-- Certificates Table -->
            <div class="data-table">
              <table>
                <thead>
                  <tr>
                    <th>ID Certificado</th>
                    <th>Curso</th>
                    <th>Participante</th>
                    <th>Fecha Emisión</th>
                    <th>Fecha Vencimiento</th>
                    <th>Acciones</th>
                  </tr>
                </thead>  
                <tbody>
                  <tr *ngFor="let certificate of certificates">
                    <td>{{certificate.certificate_id}}</td>
                    <td>{{certificate.course.name}}</td>
                    <td>{{certificate.participant.full_name}}</td>
                    <td>{{certificate.issue_date | date:'dd/MM/yyyy'}}</td>
                    <td>{{certificate.expiry_date ? (certificate.expiry_date | date:'dd/MM/yyyy') : 'N/A'}}</td>
                    <td>
                      <button class="icon-btn delete"
                              (click)="deleteCertificate(certificate.id)"
                              title="Eliminar certificado">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18 6L6 18"></path>
                          <path d="M6 6l12 12"></path>
                        </svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    /* General Styles */
    .dashboard-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #2c3e50;
    }
    .dashboard-header {
      background: #e74c3c;
      color: white;
      padding: 10px 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo-section {
      display: flex;
      align-items: center;
      gap: 10px; 
    }
    .logo svg {
      border-radius: 50%;