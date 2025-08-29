import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="header-section">
          <div class="logo-container">
            <div class="logo">
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="30" cy="30" r="25" fill="url(#gradient)" stroke="#3250e7ff" stroke-width="2"/>
                <text x="30" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold">L</text>
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#e74c3c;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#c0392b;stop-opacity:1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1>LANIA</h1>
            <p>Laboratorio Nacional de Informática Avanzada</p>
          </div>
          <h2>Sistema de Certificaciones</h2>
        </div>

        <form (ngSubmit)="onSubmit()" class="login-form">
          <div class="form-group">
            <label for="email">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Usuario
            </label>
            <input 
              id="email"
              type="text"
              [(ngModel)]="email" 
              name="email" 
              (focus)="onEmailFocus()"
              (blur)="onEmailBlur()"
              [class.placeholder-text]="isEmailPlaceholder"
              [class.error]="error"
              required 
            />
          </div>
          
          <div class="form-group">
            <label for="password">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <circle cx="12" cy="16" r="1"></circle>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Contraseña
            </label>
            <input 
              id="password"
              [type]="isPasswordPlaceholder ? 'text' : 'password'"
              [(ngModel)]="password" 
              name="password" 
              (focus)="onPasswordFocus()"
              (blur)="onPasswordBlur()"
              [class.placeholder-text]="isPasswordPlaceholder"
              [class.error]="error"
              required 
            />
          </div>
          
          <button 
            type="submit" 
            [disabled]="loading"
            class="login-btn"
          >
            <span *ngIf="!loading">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 3h6v6M21 3l-7 7M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"></path>
              </svg>
              Iniciar Sesión
            </span>
            <span *ngIf="loading">
              <div class="spinner"></div>
              Iniciando sesión...
            </span>
          </button>
        </form>
        
        <div *ngIf="error" class="error-message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          {{ error }}
        </div>

        <div class="footer">
          <p>&copy; 2025 LANIA. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
    }

    .login-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 420px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .header-section {
      text-align: center;
      margin-bottom: 30px;
    }

    .logo-container {
      margin-bottom: 20px;
    }

    .logo {
      margin-bottom: 15px;
    }

    .header-section h1 {
      color: #221C53;
      margin: 10px 0 5px 0;
      font-size: 32px;
      font-weight: bold;
      letter-spacing: 2px;
    }

    .header-section p {
      color: #666;
      font-size: 13px;
      margin: 0 0 20px 0;
      font-weight: 500;
    }

    .header-section h2 {
      color: #333;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }

    .login-form {
      margin-bottom: 20px;
    }

    .form-group {
      margin-bottom: 25px;
    }

    .form-group label {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #333;
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .form-group input {
      width: 100%;
      padding: 15px;
      border: 2px solid #e1e8ed;
      border-radius: 12px;
      font-size: 16px;
      transition: all 0.3s ease;
      background: rgba(255, 255, 255, 0.9);
      box-sizing: border-box;
    }

    .form-group input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      background: white;
    }

    .form-group input.error {
      border-color: #e74c3c;
      box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
    }

    /* Estilos para el placeholder personalizado */
    .form-group input.placeholder-text {
      color: #999 !important;
      font-style: italic;
    }

    .form-group input:not(.placeholder-text) {
      color: #333;
      font-style: normal;
    }

    .login-btn {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .login-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }

    .login-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      transform: none;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s ease-in-out infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-message {
      background: rgba(231, 76, 60, 0.1);
      border: 1px solid rgba(231, 76, 60, 0.3);
      color: #c0392b;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
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

    @media (max-width: 480px) {
      .login-container {
        padding: 10px;
      }
      
      .login-card {
        padding: 30px 25px;
      }
      
      .header-section h1 {
        font-size: 28px;
      }
      
      .header-section h2 {
        font-size: 20px;
      }
    }
  `]
})
export default class LoginComponent {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  email = 'Ingrese su correo institucional';
  password = 'Password';
  loading = false;
  error = '';

  // Getters para verificar si son placeholders
  get isEmailPlaceholder(): boolean {
    return this.email === 'Ingrese su correo institucional';
  }

  get isPasswordPlaceholder(): boolean {
    return this.password === 'Password';
  }

  // Eventos para el campo email
  onEmailFocus() {
    if (this.isEmailPlaceholder) {
      this.email = '';
    }
  }

  onEmailBlur() {
    if (this.email.trim() === '') {
      this.email = 'Ingrese su correo institucional';
    }
  }

  // Eventos para el campo password
  onPasswordFocus() {
    if (this.isPasswordPlaceholder) {
      this.password = '';
    }
  }

  onPasswordBlur() {
    if (this.password.trim() === '') {
      this.password = 'Password';
    }
  }

  onSubmit() {
    // Validar que no sean placeholders
    if (this.isEmailPlaceholder || this.isPasswordPlaceholder) {
      this.error = 'Por favor complete todos los campos.';
      return;
    }

    // Validar que no estén vacíos
    if (!this.email.trim() || !this.password.trim()) {
      this.error = 'Por favor complete todos los campos.';
      return;
    }

    this.loading = true;
    this.error = '';
    
    this.http.post<{access_token: string}>('http://127.0.0.1:8000/auth/login', {
      email: this.email,
      password: this.password
    }).subscribe({
      next: (response) => {
        localStorage.setItem('access_token', response.access_token);
        this.router.navigate(['/dashboard']);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Credenciales inválidas. Verifica tu usuario y contraseña.';
        this.loading = false;
        console.error('Error de login:', err);
      }
    });
  }
}