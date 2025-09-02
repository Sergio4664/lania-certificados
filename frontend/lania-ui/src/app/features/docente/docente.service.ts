// src/app/features/docente/docente.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { DocenteDTO, CreateDocenteDTO, UpdateDocenteDTO } from '../../shared/interfaces/docente.interfaces';

@Injectable({
  providedIn: 'root'
})
export class DocenteService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  list(): Observable<DocenteDTO[]> {
    return this.http.get<DocenteDTO[]>(`${this.apiUrl}/api/admin/docentes`);
  }

  create(docente: CreateDocenteDTO): Observable<DocenteDTO> {
    return this.http.post<DocenteDTO>(
      `${this.apiUrl}/api/admin/docentes`, 
      docente, 
      this.httpOptions
    );
  }

  get(id: number): Observable<DocenteDTO> {
    return this.http.get<DocenteDTO>(`${this.apiUrl}/api/admin/docentes/${id}`);
  }

  update(id: number, data: UpdateDocenteDTO): Observable<DocenteDTO> {
    return this.http.put<DocenteDTO>(`${this.apiUrl}/api/admin/docentes/${id}`, data, this.httpOptions);
  }

  disable(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/api/admin/docentes/${id}`);
  }

  // Legacy methods para compatibilidad
  getDocentes(): Observable<DocenteDTO[]> {
    return this.list();
  }

  createDocente(docente: CreateDocenteDTO): Observable<DocenteDTO> {
    return this.create(docente);
  }
}

// src/app/features/courses/course.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { CourseDTO, CreateCourseDTO, UpdateCourseDTO } from '../../shared/interfaces/course.interfaces';

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  list(): Observable<CourseDTO[]> {
    return this.http.get<CourseDTO[]>(`${this.apiUrl}/api/admin/courses`);
  }

  get(id: number): Observable<CourseDTO> {
    return this.http.get<CourseDTO>(`${this.apiUrl}/api/admin/courses/${id}`);
  }

  create(data: CreateCourseDTO): Observable<CourseDTO> {
    return this.http.post<CourseDTO>(`${this.apiUrl}/api/admin/courses`, data);
  }

  update(id: number, data: UpdateCourseDTO): Observable<CourseDTO> {
    return this.http.put<CourseDTO>(`${this.apiUrl}/api/admin/courses/${id}`, data);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/api/admin/courses/${id}`);
  }

  // Legacy methods para compatibilidad
  listCourses(): Observable<CourseDTO[]> {
    return this.list();
  }

  createCourse(data: CreateCourseDTO): Observable<CourseDTO> {
    return this.create(data);
  }
}

// src/app/features/participants/participant.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { ParticipantDTO, CreateParticipantDTO, UpdateParticipantDTO } from '../../shared/interfaces/participant.interfaces';

@Injectable({
  providedIn: 'root'
})
export class ParticipantService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  list(): Observable<ParticipantDTO[]> {
    return this.http.get<ParticipantDTO[]>(`${this.apiUrl}/api/admin/participants`);
  }

  get(id: number): Observable<ParticipantDTO> {
    return this.http.get<ParticipantDTO>(`${this.apiUrl}/api/admin/participants/${id}`);
  }

  create(data: CreateParticipantDTO): Observable<ParticipantDTO> {
    return this.http.post<ParticipantDTO>(`${this.apiUrl}/api/admin/participants`, data);
  }

  update(id: number, data: UpdateParticipantDTO): Observable<ParticipantDTO> {
    return this.http.put<ParticipantDTO>(`${this.apiUrl}/api/admin/participants/${id}`, data);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/api/admin/participants/${id}`);
  }
}

// src/app/features/certificates/certificate.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { CertificateDTO, CreateCertificateDTO } from '../../shared/interfaces/certificate.interfaces';

@Injectable({
  providedIn: 'root'
})
export class CertificateService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  list(): Observable<CertificateDTO[]> {
    return this.http.get<CertificateDTO[]>(`${this.apiUrl}/api/admin/certificates`);
  }

  issue(data: CreateCertificateDTO): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/admin/certificates/issue`, data);
  }

  downloadBySerial(serial: string): void {
    window.open(`${this.apiUrl}/v/serial/${serial}/pdf`, '_blank');
  }

  verifyByToken(token: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/v/t/${token}`);
  }
}

// src/app/core/auth.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '@environments/environment';
import { LoginDTO, TokenDTO } from '../shared/interfaces/auth.interfaces';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  login(credentials: LoginDTO): Observable<TokenDTO> {
    return this.http.post<TokenDTO>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(response => {
        if (response.access_token) {
          localStorage.setItem('access_token', response.access_token);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}