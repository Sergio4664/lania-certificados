import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { VerificacionService } from '@app/shared/services/verificacion.service';

// --- CORRECCIÓN 1: Importar la interfaz correcta ("CertificadoPublico" con "o") ---
import { CertificadoPublico } from '@app/shared/interfaces/verificacion.interface'; 
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
  // --- CORRECCIÓN 2: Usar el nombre de la interfaz correcta ---
  certificado: CertificadoPublico | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  
  folioParam: string | null = null;

  folioControl = new FormControl('', [
    Validators.required,
    Validators.minLength(3)
  ]);

  ngOnInit(): void {
    // 1. Revisar si el folio viene en la URL
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
       // --- INICIO DE CORRECCIÓN ---
       // Establece el estado de carga INMEDIATAMENTE
       // para que el usuario vea que algo está pasando.
       this.isLoading = true;
       this.errorMessage = null;
       this.certificado = null;
       // --- FIN DE CORRECCIÓN ---

       this.router.navigate(['/verificacion', folio]);
    } else {
       // Esta parte ya funcionaba bien porque llama
       // directamente a buscarPorFolio()
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
        // data ya es del tipo 'CertificadoPublico' gracias a la corrección
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