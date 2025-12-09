import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, ParamMap } from '@angular/router'; // Importar ParamMap
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { VerificacionService } from '@app/shared/services/verificacion.service';
import { CertificadoPublico } from '@app/shared/interfaces/verificacion.interface'; 
import { finalize, switchMap } from 'rxjs/operators'; // Importar switchMap
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'; 
import { Observable, of } from 'rxjs'; // Importar Observable y of
import { HttpErrorResponse } from '@angular/common/http'; 

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
  private sanitizer = inject(DomSanitizer); 

  certificado: CertificadoPublico | null = null;
  isLoading = false; // Estado de carga para la búsqueda de datos
  errorMessage: string | null = null;
  folioParam: string | null = null; 

  // --- PROPIEDADES PARA LA VISUALIZACIÓN DEL PDF (Panel derecho) ---
  pdfRawUrl: string | null = null; // URL temporal de Blob (necesaria para revocar)
  pdfUrl: SafeResourceUrl | null = null; // URL sanitizada para el iframe
  showPdfModal = false; // Controla la visibilidad del panel lateral
  isLoadingPdf = false; // Estado de carga específico del PDF
  // -----------------------------------------------------------------------

  folioControl = new FormControl('', [
    Validators.required,
    // Patrón para folios (se puede ajustar a tu formato exacto si es necesario)
    Validators.pattern(/^[A-Z0-9-]{8,}$/) 
  ]);

  ngOnInit(): void {
    // Maneja la suscripción de ruta inicial (si vienes de un QR o enlace)
    this.route.paramMap.pipe(
      switchMap((params: ParamMap): Observable<CertificadoPublico | null> => {
        const folio = params.get('folio');
        this.resetState();
        
        if (folio) {
          this.folioParam = folio;
          this.folioControl.setValue(folio, { emitEvent: false });
          // Llamada al servicio para buscar y cargar los datos
          this.buscarPorFolio(folio);
          return of(null);
        }
        return of(null); 
      })
    ).subscribe();
  }

// -----------------------------------------------------------------------------------
// LÓGICA DE VISOR DE PDF
// -----------------------------------------------------------------------------------
  /**
   * Abre o cierra el panel de visualización del PDF.
   * Si el PDF no ha sido cargado previamente, llama al servicio para obtener el Blob.
   */
  abrirVisualizadorPdf(): void {
    const folio = this.certificado?.folio ?? this.folioControl.value ?? '';
    
    // Si no hay certificado o ya está cargando, salir
    if (this.isLoadingPdf || !this.certificado) return;

    if (this.showPdfModal) {
      // Si ya está abierto, lo cerramos (comportamiento de toggle)
      this.cerrarVisualizadorPdf();
      return;
    }
    
    // Si ya tenemos la URL, solo mostramos el modal inmediatamente
    if (this.pdfUrl) {
      this.showPdfModal = true;
      return;
    }

    if (!folio) {
        this.errorMessage = 'No hay un folio disponible para buscar el PDF.';
        return;
    }

    // --- Lógica de Carga de PDF ---
    this.isLoadingPdf = true;
    this.showPdfModal = true; // Mostrar el panel de PDF (que tendrá el spinner)
    
    this.verificacionService.getCertificadoPdf(folio).pipe(
        finalize(() => {
            this.isLoadingPdf = false;
        })
    ).subscribe({
        next: (pdfBlob: Blob) => {
            // Crear una URL de objeto temporal
            const rawUrl = URL.createObjectURL(pdfBlob);
            this.pdfRawUrl = rawUrl; 
            // Sanitizar la URL para el iframe
            this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);
        },
        error: (error: HttpErrorResponse) => {
            this.errorMessage = `Error ${error.status}: No se pudo cargar el documento PDF.`;
            console.error('Error al obtener el PDF:', error);
            this.cerrarVisualizadorPdf(); 
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

    // Revocar la URL de objeto para liberar memoria del navegador (CRÍTICO)
    if (this.pdfRawUrl) {
        URL.revokeObjectURL(this.pdfRawUrl);
        this.pdfRawUrl = null;
    }
  }

// -----------------------------------------------------------------------------------
// LÓGICA DE BÚSQUEDA
// -----------------------------------------------------------------------------------

  /**
   * Método asociado al botón "Verificar" (onBuscar)
   */
  onBuscar(): void {
    if (this.folioControl.invalid) {
      this.folioControl.markAsTouched(); 
      this.errorMessage = 'Por favor, ingresa un folio válido.';
      return;
    }
    
    const folio = (this.folioControl.value ?? '').trim(); 
    if (folio) {
      this.buscarPorFolio(folio);
    }
  }

  /**
   * Llama al servicio para buscar el folio y actualiza el estado.
   */
  private buscarPorFolio(folio: string): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.certificado = null;
    this.cerrarVisualizadorPdf(); 

    this.verificacionService.verificarPorFolio(folio).pipe(
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe({
      next: (data: CertificadoPublico) => { // �� Tipado explícito para 'data'
        this.certificado = data;
        // Navega a la URL con el folio para que la URL refleje el estado.
        this.router.navigate(['/verificacion', folio], { replaceUrl: true });
      },
      error: (err: HttpErrorResponse) => { // 💡 Tipado explícito para 'err'
        const status = err.status;
        if (status === 404) {
          this.errorMessage = `No se encontró ningún certificado con el folio "${folio}".`;
        } else {
          this.errorMessage = 'Ocurrió un error al verificar el certificado. Por favor, intenta más tarde.';
        }
        // Si hay error, limpia la URL de vuelta a /verificacion
        this.router.navigate(['/verificacion'], { replaceUrl: true });
      }
    });
  }

  /**
   * Resetea la vista para permitir otra búsqueda (Botón "Verificar otro").
   */
  buscarOtro(): void {
    this.certificado = null;
    this.errorMessage = null;
    this.folioParam = null;
    this.folioControl.setValue('');
    this.folioControl.markAsPristine(); 
    this.folioControl.markAsUntouched();
    this.cerrarVisualizadorPdf(); 
    this.router.navigate(['/verificacion']);
  }
  
  /**
   * Resetea el estado inicial del componente, utilizado al iniciar una búsqueda de URL.
   */
  private resetState(): void {
    this.certificado = null;
    this.errorMessage = null;
    this.cerrarVisualizadorPdf(); 
  }
}