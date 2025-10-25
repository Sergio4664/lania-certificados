import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@app/core/auth.service';
import { LoginCredentials } from '@shared/interfaces/auth.interface';
import { NotificationService } from '@shared/services/notification.service'; // ✅ Importar NotificationService

// --- IMPORTACIONES DE MATERIAL (SOLO LO QUE SE USA) ---
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule, // Usamos ReactiveFormsModule
    RouterLink,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export default class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private notificationSvc = inject(NotificationService); // ✅ Inyectar NotificationService

  loginForm!: FormGroup;
  isLoading = false;
  error = '';

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

    const credentials: LoginCredentials = {
      username: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    this.authService.login(credentials).subscribe({
      next: () => {
        // ✅ Ahora notificationSvc está disponible
        this.notificationSvc.showSuccess('Inicio de sesión exitoso.'); 
        // 🚀 La redirección SÍ está aquí y parece correcta
        this.router.navigate(['/dashboard/overview']); 
      },
      error: (err) => {
        this.error = err.error?.detail || 'Error de conexión. Inténtelo más tarde.';
        this.isLoading = false;
        // Podrías añadir una notificación de error aquí también si quieres
        // this.notificationSvc.showError(this.error); 
      },
      // ✅ Buena práctica: Asegurarse de que isLoading se ponga en false al completar
      complete: () => {
        this.isLoading = false; 
      }
    });
  }
}