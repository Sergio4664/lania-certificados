import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@app/core/auth.service';
import { LoginCredentials } from '@shared/interfaces/auth.interface';

// --- IMPORTACIONES DE MATERIAL AÑADIDAS ---
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    // --- MÓDULOS AÑADIDOS ---
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
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
    
    // --- CORRECCIÓN CLAVE AQUÍ ---
    // Mapeamos el campo 'email' del formulario al campo 'username' que espera la interfaz.
    const credentials: LoginCredentials = {
      username: this.loginForm.value.email,
      password: this.loginForm.value.password
    };
    
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
