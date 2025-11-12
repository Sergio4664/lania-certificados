//Ruta: frontend/lania-ui/src/app/features/verificacion/verificacion.component.ts
import { Component, inject, OnInit, ViewEncapsulation } from '@angular/core';
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
  styleUrls: ['./verificacion.component.css'],
  encapsulation: ViewEncapsulation.None  // 👈 AÑADIR ESTA LÍNEA
})
export default class VerificacionComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private verificacionService = inject(VerificacionService);

  certificado: CertificadoPublico | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  // Este es el folio que vino por la URL (si es que vino)
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
   */
  onBuscar(): void {
    
    console.log("1. Botón 'onBuscar' presionado.");

    if (this.folioControl.invalid) {
      this.folioControl.markAsTouched(); 
      this.errorMessage = 'Por favor, ingresa un folio válido.';
      return;
    }
    
    const folio = (this.folioControl.value ?? '').trim(); 

    console.log("2. Folio a buscar:", folio);

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
        setTimeout(() => {
          this.isLoading = false;
        }, 0);
      })
    ).subscribe({
      next: (data) => {
        console.log("4. Next: Datos recibidos:", data);
        this.certificado = data;

        // ** SOLUCIÓN DE RUTEO: Si es exitoso, actualizamos la URL **
        // Esto crea una entrada de historial limpia que el botón "Atrás" puede usar.
        // Usamos { replaceUrl: true } para que no se guarde el estado intermedio /verificacion 
        this.router.navigate(['/verificacion', folio], { replaceUrl: true });
      },
      error: (err) => {
        console.error("4. Error: Petición HTTP falló:", err);
        
        if (err.status === 404) {
          this.errorMessage = `No se encontró ningún certificado con el folio "${folio}".`;
        } else {
          this.errorMessage = 'Ocurrió un error al verificar el certificado. Por favor, intenta más tarde.';
        }

        // ** SOLUCIÓN DE RUTEO: Si falla y ya estamos en una ruta con folio (/verificacion/XXX), 
        // regresamos a la ruta base /verificacion **
        if (this.folioParam) {
          this.router.navigate(['/verificacion'], { replaceUrl: true });
        }
      }
    });
  }

  /**
   * Resetea la vista para permitir otra búsqueda.
   */
  buscarOtro(): void {
    this.certificado = null;
    this.errorMessage = null;
    this.folioParam = null;
    this.folioControl.setValue('');
    this.folioControl.markAsPristine(); 
    this.folioControl.markAsUntouched();
    // Navegamos explícitamente a la ruta base para borrar el folio de la URL.
    this.router.navigate(['/verificacion']);
  }
}