//Ruta: frontend/lania-ui/src/app/features/verificacion/verificacion.component.ts
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
  folioParam: string | null = null; 

  folioControl = new FormControl('', [
    Validators.required,
    Validators.minLength(3)
  ]);

  ngOnInit(): void {
    // 1. Revisa si la URL tiene un folio (cuando vienes de un enlace o QR)
    this.route.paramMap.subscribe(params => {
      const folio = params.get('folio');
      if (folio) {
        this.folioParam = folio;
        this.folioControl.setValue(folio); 
        this.buscarPorFolio(folio);
      }
    });
  }

  /**
   * MÉTODO PRINCIPAL PARA EL BOTÓN DE BÚSQUEDA
   * Se hace más segura la extracción del valor.
   */
  onBuscar(): void {
    
    console.log("1. Botón 'onBuscar' presionado.");

    if (this.folioControl.invalid) {
      // Si es inválido, forzamos a que se muestre el error de validación
      this.folioControl.markAsTouched(); 
      this.errorMessage = 'Por favor, ingresa un folio válido.';
      return;
    }
    
    // Obtenemos el folio del control. Usamos (?? '') para manejar null/undefined y trim() para limpiar espacios.
    const folio = (this.folioControl.value ?? '').trim(); 

    console.log("2. Folio a buscar:", folio);

    // Si hay un folio, llamamos a la función que hace la petición HTTP.
    if (folio) {
      this.buscarPorFolio(folio);
    }
  }

  /**
   * MÉTODO QUE HACE LA LLAMADA AL SERVICIO
   */
  private buscarPorFolio(folio: string): void {
    console.log("3. Llamando a buscarPorFolio() con:", folio); 
    this.isLoading = true;
    this.errorMessage = null;
    this.certificado = null;

    this.verificacionService.verificarPorFolio(folio).pipe(
      finalize(() => {
        console.log("5. Finalize: Petición HTTP completada.");
        
        // CORRECCIÓN para evitar 'ExpressionChangedAfterItHasBeenCheckedError'
        setTimeout(() => {
          this.isLoading = false;
        }, 0);
      })
    ).subscribe({
      next: (data) => {
        console.log("4. Next: Datos recibidos:", data);
        this.certificado = data;
      },
      error: (err) => {
        console.error("4. Error: Petición HTTP falló:", err);
        
        if (err.status === 404) {
          this.errorMessage = `No se encontró ningún certificado con el folio "${folio}".`;
        } else {
          this.errorMessage = 'Ocurrió un error al verificar el certificado. Por favor, intenta más tarde.';
        }
      }
    });
  }

  /**
   * Resetea la vista para permitir otra búsqueda.
   * CORREGIDO: Se añade el reinicio del estado de validación del formulario.
   */
  buscarOtro(): void {
    // 1. Limpiar el estado de resultados/errores
    this.certificado = null;
    this.errorMessage = null;
    this.folioParam = null;

    // 2. Limpiar el valor del control de formulario
    this.folioControl.setValue('');

    // 3. Reiniciar el estado de validación del control (CRUCIAL para búsquedas posteriores)
    this.folioControl.markAsPristine(); 
    this.folioControl.markAsUntouched();

    // 4. Navegar a la ruta base sin folio, para limpiar la URL.
    this.router.navigate(['/verificacion']);
  }
}