import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { VerificacionService } from '@app/shared/services/verificacion.service';
import { CertificadoPublico } from '@app/shared/interfaces/verificacion.interface'; 
import { finalize } from 'rxjs/operators';
// Importaciones necesarias para manejar la visualización del PDF
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'; 

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
})
export default class VerificacionComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private verificacionService = inject(VerificacionService);
  private sanitizer = inject(DomSanitizer); // Inyección de DomSanitizer

  certificado: CertificadoPublico | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  // Este es el folio que vino por la URL (si es que vino)
  folioParam: string | null = null; 

  // --- PROPIEDADES PARA LA VISUALIZACIÓN DEL PDF (Modal/Panel derecho) ---
  pdfRawUrl: string | null = null; // Almacena la URL temporal creada por createObjectURL (para revocarla)
  pdfUrl: SafeResourceUrl | null = null; // Contiene la URL sanitizada para el [src] del iframe
  showPdfModal = false; // Controla la visibilidad del panel lateral
  isLoadingPdf = false; // Estado de carga específico del PDF
  // -----------------------------------------------------------------------

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
// -----------------------------------------------------------------------------------
// LÓGICA DEL VISOR DE PDF
// -----------------------------------------------------------------------------------
  /**
   * Abre o cierra el panel de visualización del PDF.
   * Llama al servicio para obtener el Blob del PDF y lo sanitiza.
   */
  abrirVisualizadorPdf(): void {
    if (this.isLoadingPdf) return;

    if (this.showPdfModal) {
      // Si ya está abierto, lo cerramos (comportamiento de toggle)
      this.cerrarVisualizadorPdf();
      return;
    }

    const folio = (this.certificado?.folio ?? this.folioControl.value ?? '').trim();
    if (!folio) {
        this.errorMessage = 'No hay un folio disponible para buscar el PDF.';
        return;
    }

    // Prepara el estado para la carga y muestra el panel
    this.cerrarVisualizadorPdf(); // Limpia cualquier URL previa
    this.isLoadingPdf = true;
    this.showPdfModal = true;
    
    this.verificacionService.getCertificadoPdf(folio).pipe(
        finalize(() => {
            this.isLoadingPdf = false;
        })
    ).subscribe({
        next: (pdfBlob: Blob) => {
            // 1. Crear una URL de objeto temporal para el Blob
            const rawUrl = URL.createObjectURL(pdfBlob);
            this.pdfRawUrl = rawUrl; // Guardamos la URL cruda para revocarla

            // 2. Sanitizar la URL para que Angular confíe en ella en el iframe
            this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);

            console.log('PDF cargado y sanitizado.');
        },
        error: (error) => {
            this.errorMessage = 'Error al obtener el documento PDF. Por favor, intente de nuevo.';
            console.error('Error al obtener el PDF:', error);
            this.cerrarVisualizadorPdf(); // Cierra el modal en caso de error
        }
    });
  }

  /**
   * Cierra el panel de visualización del PDF y revoca la URL del Blob.
   */
  cerrarVisualizadorPdf(): void {
    this.showPdfModal = false;
    this.pdfUrl = null;
    this.isLoadingPdf = false;

    // Revocar la URL de objeto para liberar memoria del navegador (CRUCIAL)
    if (this.pdfRawUrl) {
        URL.revokeObjectURL(this.pdfRawUrl);
        this.pdfRawUrl = null;
        console.log('URL de objeto del PDF revocada.');
    }
  }

// -----------------------------------------------------------------------------------
// LÓGICA DE BÚSQUEDA (EXISTENTE Y ACTUALIZADA)
// -----------------------------------------------------------------------------------

  /**
   * MÉTODO PRINCIPAL PARA EL BOTÓN DE BÚSQUEDA
   */
  onBuscar(): void {
    console.log("1. onBuscar() ejecutado");
    console.log("2. Estado del control:", {
      value: this.folioControl.value,
      invalid: this.folioControl.invalid,
      errors: this.folioControl.errors
    });

    if (this.folioControl.invalid) {
      this.folioControl.markAsTouched(); 
      this.errorMessage = 'Por favor, ingresa un folio válido.';
      console.log("3. Formulario inválido, abortando");
      return;
    }
    
    const folio = (this.folioControl.value ?? '').trim(); 
    console.log("3. Folio limpio a buscar:", folio);

    if (folio) {
      this.buscarPorFolio(folio);
    } else {
      console.log("4. Folio vacío después de trim");
      this.errorMessage = 'Por favor, ingresa un folio válido.';
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
    this.cerrarVisualizadorPdf(); // Asegura cerrar el modal si se inicia una nueva búsqueda

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

        // Si es exitoso, actualizamos la URL
        this.router.navigate(['/verificacion', folio], { replaceUrl: true });
      },
      error: (err) => {
        console.error("4. Error: Petición HTTP falló:", err);
        
        if (err.status === 404) {
          this.errorMessage = `No se encontró ningún certificado con el folio "${folio}".`;
        } else {
          this.errorMessage = 'Ocurrió un error al verificar el certificado. Por favor, intenta más tarde.';
        }

        // Si falla y ya estamos en una ruta con folio, regresamos a la ruta base
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
    this.cerrarVisualizadorPdf(); // Se asegura que el modal de PDF se cierre
    // Navegamos explícitamente a la ruta base para borrar el folio de la URL.
    this.router.navigate(['/verificacion']);
  }
}