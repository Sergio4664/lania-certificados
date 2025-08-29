// src/app/features/teacher/my-courses.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourseService, CourseDTO } from '../courses/course.service';

@Component({
  standalone: true,
  selector: 'app-my-courses',
  imports: [CommonModule],
  template: `
    <div class="my-courses-container">
      <h2>Mis Cursos</h2>
      
      <div class="courses-grid" *ngIf="courses.length > 0; else noCourses">
        <div class="course-card" *ngFor="let course of courses">
          <div class="course-header">
            <h3>{{course.name}}</h3>
            <span class="course-code">{{course.code}}</span>
          </div>
          <div class="course-details">
            <div class="detail-item">
              <strong>Inicio:</strong> {{course.start_date | date:'dd/MM/yyyy'}}
            </div>
            <div class="detail-item">
              <strong>Fin:</strong> {{course.end_date | date:'dd/MM/yyyy'}}
            </div>
            <div class="detail-item">
              <strong>Horas:</strong> {{course.hours}}
            </div>
          </div>
          <div class="course-actions">
            <button class="btn-primary">Ver Participantes</button>
            <button class="btn-secondary">Generar Certificados</button>
          </div>
        </div>
      </div>
      
      <ng-template #noCourses>
        <div class="no-courses">
          <p>No tienes cursos asignados aún.</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .my-courses-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    h2 {
      color: #1e293b;
      margin-bottom: 24px;
      font-size: 28px;
      font-weight: 600;
    }

    .courses-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .course-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .course-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .course-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .course-header h3 {
      color: #1e293b;
      font-size: 18px;
      font-weight: 600;
      margin: 0;
      flex: 1;
    }

    .course-code {
      background: #f1f5f9;
      color: #475569;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 12px;
    }

    .course-details {
      margin-bottom: 20px;
    }

    .detail-item {
      margin-bottom: 8px;
      color: #64748b;
      font-size: 14px;
    }

    .detail-item strong {
      color: #374151;
    }

    .course-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .btn-primary:hover {
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-secondary:hover {
      background: #e2e8f0;
    }

    .no-courses {
      text-align: center;
      padding: 40px;
      color: #64748b;
    }

    @media (max-width: 768px) {
      .courses-grid {
        grid-template-columns: 1fr;
      }
      
      .course-header {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .course-code {
        margin-left: 0;
        margin-top: 8px;
      }
    }
  `]
})
export default class MyCoursesComponent implements OnInit {
  private courseService = inject(CourseService);
  courses: CourseDTO[] = [];

  ngOnInit() {
    this.loadMyCourses();
  }

  loadMyCourses() {
    this.courseService.listMyCourses().subscribe({
      next: (courses) => {
        this.courses = courses;
      },
      error: (error) => {
        console.error('Error loading my courses:', error);
      }
    });
  }
}