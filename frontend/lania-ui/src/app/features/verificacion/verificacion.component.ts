import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { VerificacionService } from '@app/shared/services/verificacion.service';
// ✅ --- CORRECCIÓN: Importamos la interfaz con el nombre correcto ---
import { CertificadoPublic } from '@app/shared/interfaces/certificado.interface'; 
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-verificacion',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    RouterLink,
    DatePipe
  ],
  templateUrl: './verificacion.component.html',
  styleUrls: ['./verificacion.component.css']
})
export default class VerificacionComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private verificacionService = inject(VerificacionService);

  // Estado del componente
  // ✅ --- CORRECCIÓN: Usamos el nombre de interfaz correcto ---
  certificado: CertificadoPublic | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  
  folioParam: string | null = null;

  folioControl = new FormControl('', [
    Validators.required,
    Validators.minLength(3)
  ]);

  ngOnInit(): void {
    // 1. Revisar si el folio viene en la URL
    // ✅ --- CORRECCIÓN: Esta es la lógica correcta, sin el authService.logout() ---
    this.route.paramMap.subscribe(params => {
      const folio = params.get('folio');
      if (folio) {
        this.folioParam = folio;
        this.folioControl.setValue(folio); 
        this.buscarPorFolio(folio);
      }
    });
  }

  onBuscar(): void {
    if (this.folioControl.invalid) {
      this.errorMessage = 'Por favor, ingresa un folio válido.';
      return;
    }
    const folio = this.folioControl.value!;
    if (folio !== this.folioParam) {
       this.router.navigate(['/verificacion', folio]);
    } else {
       this.buscarPorFolio(folio);
    }
  }

  private buscarPorFolio(folio: string): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.certificado = null;

    this.verificacionService.verificarPorFolio(folio).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (data) => {
        this.certificado = data;
      },
      error: (err) => {
        console.error(err);
        if (err.status === 404) {
          this.errorMessage = `No se encontró ningún certificado con el folio "${folio}".`;
        } else {
          this.errorMessage = 'Ocurrió un error al verificar el certificado. Por favor, intenta más tarde.';
        }
      }
    });
  }

  buscarOtro(): void {
    this.certificado = null;
    this.errorMessage = null;
    this.folioParam = null;
    this.folioControl.setValue('');
    this.router.navigate(['/verificacion']);
  }
}