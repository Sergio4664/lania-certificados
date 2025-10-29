// frontend/lania-ui/src/app/features/verificacion/verificacion.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { VerificacionService } from '@app/shared/services/verificacion.service';
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

  certificado: CertificadoPublico | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  folioParam: string | null = null; // Se mantiene para la carga inicial desde URL

  folioControl = new FormControl('', [
    Validators.required,
    Validators.minLength(3)
  ]);

  ngOnInit(): void {
    // Esta parte se queda igual.
    // Se encarga de buscar SÓLO si vienes de una URL con folio (ej. desde el admin)
    this.route.paramMap.subscribe(params => {
      const folio = params.get('folio');
      if (folio) {
        this.folioParam = folio;
        this.folioControl.setValue(folio); 
        this.buscarPorFolio(folio);
      }
    });
  }

  // --- *** INICIO DE LA CORRECCIÓN *** ---
  // Este método ahora llama a la búsqueda directamente.
  onBuscar(): void {
    
    console.log("1. Botón 'onBuscar' presionado.");

    if (this.folioControl.invalid) {
      this.errorMessage = 'Por favor, ingresa un folio válido.';
      return;
    }
    
    // Obtenemos el folio del control y quitamos espacios extra
    const folio = this.folioControl.value!.trim(); 

    console.log("2. Folio a buscar:", folio);

    // Si hay un folio, llamamos a la función de búsqueda directamente.
    // Ya NO usamos this.router.navigate() aquí.
    if (folio) {
      this.buscarPorFolio(folio);
    }
  }
  // --- *** FIN DE LA CORRECCIÓN *** ---


  private buscarPorFolio(folio: string): void {
    // --- Logs de diagnóstico añadidos ---
    console.log("3. Llamando a buscarPorFolio() con:", folio); 
    this.isLoading = true;
    this.errorMessage = null;
    this.certificado = null;

    this.verificacionService.verificarPorFolio(folio).pipe(
      finalize(() => {
        console.log("5. Finalize: Petición HTTP completada."); // Log de finalización
        this.isLoading = false;
      })
    ).subscribe({
      next: (data) => {
        console.log("4. Next: Datos recibidos:", data); // Log de éxito
        this.certificado = data;
      },
      error: (err) => {
        console.error("4. Error: Petición HTTP falló:", err); // Log de error
        
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