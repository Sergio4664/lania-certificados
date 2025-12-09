import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth.service';
import { NotificationService } from '@shared/services/notification.service';
import { CommonModule } from '@angular/common';
import { MatProgressSpinner } from '@angular/material/progress-spinner'; // Importación para resolver NG8001

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatProgressSpinner], // MatProgressSpinner añadido a imports
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  isLoading: boolean = false;

  // Si el usuario ya está autenticado, redirigir inmediatamente
  constructor() {
    // ✅ CORRECCIÓN DE RUTA: Apuntar a la ruta correcta del dashboard
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/admin/dashboard']);
    }
  }

  // 🚨 NOTA: Los nombres de los controles son 'username' y 'password'
  loginForm = this.fb.group({
    username: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]] // 👈 Requiere 8 caracteres
  });
  
  // Agrega esta propiedad y método si es necesario para el botón de visibilidad de contraseña
  showPassword: boolean = false;
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }
  // ---

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.notificationService.showError('Por favor, ingresa un correo y contraseña válidos.');
      return;
    }
    this.isLoading = true;
    
    const credentials = {
      username: this.loginForm.value.username!,
      password: this.loginForm.value.password!
    };

    // 🚨 PASO CRÍTICO: Suscribirse y redirigir
    this.authService.login(credentials).subscribe({
      next: (response) => {
        // Redirección exitosa: el token ya se guardó en el .tap del AuthService
        this.notificationService.showSuccess('¡Inicio de sesión exitoso!');
        
        // ✅ CORRECCIÓN DE RUTA Y SINCRONIZACIÓN: Redirección con retraso a la ruta correcta
        setTimeout(() => {
          this.router.navigate(['/admin/dashboard']); 
        }, 50); 
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error de login:', err);
        // Usar el mensaje de error del backend (si existe) o un genérico
        const errorDetail = err.error?.detail || 'Credenciales incorrectas o error del servidor.';
        this.notificationService.showError(errorDetail);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  } // <-- Cierre correcto del método onSubmit
} // <-- Cierre de la clase LoginComponent (Esto era lo que faltaba en la línea 79)