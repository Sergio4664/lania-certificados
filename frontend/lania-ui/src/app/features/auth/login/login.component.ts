//ruta: frontend/lania-ui/src/app/features/auth/login/login.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth-token.interceptor';
import { LoginDTO } from '@shared/interfaces/auth.interface';



@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule, // Cambiado de FormsModule a ReactiveFormsModule
    RouterLink,
  
  ],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="header-section">
          <div class="logo-container">
             <!-- Puedes poner un <img> aquí si tienes un logo -->
            <h1>LANIA</h1>
            <p>Laboratorio Nacional de Informática Avanzada</p>
          </div>
          <h2>Sistema de Constancias</h2>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Correo Institucional</mat-label>
              <input matInput formControlName="email" type="email" placeholder="usuario@lania.edu.mx">
              <mat-icon matSuffix>email</mat-icon>
              <mat-error *ngIf="loginForm.get('email')?.hasError('required')">
                El correo es requerido.
              </mat-error>
              <mat-error *ngIf="loginForm.get('email')?.hasError('email')">
                Por favor ingrese un correo válido.
              </mat-error>
            </mat-form-field>
          </div>
          
          <div class="form-group">
            <mat-form-field appearance="outline" class="w-full">
                <mat-label>Contraseña</mat-label>
                <input matInput formControlName="password" [type]="hidePassword ? 'password' : 'text'">
                <button mat-icon-button matSuffix (click)="hidePassword = !hidePassword" type="button">
                    <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                <mat-error *ngIf="loginForm.get('password')?.hasError('required')">
                    La contraseña es requerida.
                </mat-error>
            </mat-form-field>
          </div>

          <div *ngIf="error" class="error-message">
            <mat-icon>error_outline</mat-icon>
            <span>{{ error }}</span>
          </div>
          
          <button mat-raised-button color="primary" type="submit" class="login-btn" [disabled]="loginForm.invalid || isLoading">
            <mat-spinner *ngIf="isLoading" diameter="24" class="mr-2"></mat-spinner>
            <span *ngIf="!isLoading">Iniciar Sesión</span>
            <span *ngIf="isLoading">Iniciando...</span>
          </button>

          <div class="text-center mt-6">
            <a routerLink="/forgot-password" class="text-sm text-blue-600 hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </form>
        
        <div class="footer">
          <p>&copy; 2025 LANIA. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: auto;
    }
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f2f5;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
    }

    .login-card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 420px;
      border: 1px solid #e0e0e0;
    }

    .header-section {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .header-section h1 {
      color: #221C53;
      margin: 10px 0 5px 0;
      font-size: 32px;
      font-weight: 700;
    }

    .header-section p {
      color: #555;
      font-size: 13px;
      margin: 0 0 20px 0;
    }

    .header-section h2 {
      color: #333;
      margin: 0;
      font-size: 22px;
      font-weight: 600;
    }

    .login-form {
      width: 100%;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .w-full {
      width: 100%;
    }
    
    .mr-2 {
        margin-right: 8px;
    }

    .login-btn {
      width: 100%;
      padding: 12px 0;
      font-size: 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .login-btn mat-spinner {
        display: inline-block;
        vertical-align: middle;
    }

    .error-message {
      background-color: #f8d7da;
      color: #721c24;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
      border: 1px solid #f5c6cb;
    }

    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e1e8ed;
    }

    .footer p {
      color: #666;
      font-size: 12px;
      margin: 0;
    }
  `]
})
export default class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  
  loginForm!: FormGroup;
  isLoading = false;
  error = '';
  hidePassword = true;

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.error = '';
    
    const credentials: LoginDTO = this.loginForm.value;
    
    this.authService.login(credentials).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        this.router.navigate(['/admin/dashboard']);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Login error:', err);
        
        if (err.status === 401 || err.status === 400) {
          this.error = 'Credenciales inválidas. Verifica tu usuario y contraseña.';
        } else if (err.status === 0) {
          this.error = 'No se puede conectar con el servidor. Verifique su conexión.';
        } else {
          this.error = 'Error del servidor. Inténtelo de nuevo más tarde.';
        }
        
        this.isLoading = false;
      }
    });
  }
}