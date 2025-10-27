import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { VerificacionService } from '@shared/services/verificacion.service';
import { CertificadoPublico } from '@app/shared/interfaces/verificacion.interface';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-verificacion',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, // Para el formulario de búsqueda
    RouterLink,          // Para el enlace de "Ir al Login"
    DatePipe             // Para formatear la fecha
  ],
  templateUrl: './verificacion.component.html',
  styleUrls: ['./verificacion.component.css']
})
export default class VerificacionComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private verificacionService = inject(VerificacionService);

  // Estado del componente
  certificado: CertificadoPublico | null = null;
  isLoading = false;
  errorMessage: string | null = null;
  
  // Folio que viene de la URL
  folioParam: string | null = null;

  // Control para el formulario de búsqueda manual
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
        this.folioControl.setValue(folio); // Poner el folio en el buscador
        this.buscarPorFolio(folio);
      }
    });
  }

  // Se llama al enviar el formulario
  onBuscar(): void {
    if (this.folioControl.invalid) {
      this.errorMessage = 'Por favor, ingresa un folio válido.';
      return;
    }
    
    const folio = this.folioControl.value!;
    
    // Si el folio buscado es diferente al que está en la URL, navegamos
    if (folio !== this.folioParam) {
       this.router.navigate(['/verificacion', folio]);
    } else {
      // Si es el mismo (ej. borró el resultado y buscó de nuevo), forzamos la búsqueda
       this.buscarPorFolio(folio);
    }
  }

  // Lógica principal de búsqueda
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

  // Método para limpiar la búsqueda y buscar de nuevo
  buscarOtro(): void {
    this.certificado = null;
    this.errorMessage = null;
    this.folioParam = null;
    this.folioControl.setValue('');
    this.router.navigate(['/verificacion']);
  }
}